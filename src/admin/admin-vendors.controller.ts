import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { NotificationsService } from '../shared/notifications.service';

@ApiTags('Admin - Vendor Management')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminVendorsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly supabaseStorage: SupabaseStorageService,
        private readonly notificationsService: NotificationsService,
    ) {}

    @Get('pending')
    @ApiOperation({ summary: 'Get all vendors pending KYC verification' })
    @ApiResponse({ status: 200, description: 'List of pending vendors' })
    async getPendingVendors(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [vendors, total] = await Promise.all([
            this.prisma.vendor.findMany({
                where: {
                    kycStatus: 'PENDING',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    gstNumber: true,
                    isGstVerified: true,
                    kycStatus: true,
                    kycDocuments: true,
                    createdAt: true,
                    VendorDocument: {
                        select: {
                            id: true,
                            documentType: true,
                            documentUrl: true,
                            status: true,
                            uploadedAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limitNum,
            }),
            this.prisma.vendor.count({
                where: {
                    kycStatus: 'PENDING',
                },
            }),
        ]);

        const mappedVendors = await Promise.all(
            vendors.map(async (vendor) => ({
                ...vendor,
                VendorDocument: await this.mapVendorDocumentUrls(vendor.VendorDocument || []),
            }))
        );

        return {
            vendors: mappedVendors,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get vendor details for verification' })
    @ApiResponse({ status: 200, description: 'Vendor details' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async getVendorDetails(@Param('id') id: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                gstNumber: true,
                isGstVerified: true,
                kycStatus: true,
                storeStatus: true,
                kycDocuments: true,
                storeName: true,
                bankDetails: true,
                createdAt: true,
                updatedAt: true,
                VendorDocument: {
                    select: {
                        id: true,
                        documentType: true,
                        documentUrl: true,
                        status: true,
                        uploadedAt: true,
                        reviewedAt: true,
                        reviewedBy: true,
                        rejectionReason: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return {
            ...vendor,
            VendorDocument: await this.mapVendorDocumentUrls(vendor.VendorDocument || []),
        };
    }

    @Patch(':id/verify')
    @ApiOperation({ summary: 'Approve vendor KYC and activate account' })
    @ApiResponse({ status: 200, description: 'Vendor verified successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async verifyVendor(
        @Param('id') id: string,
        @Request() req,
        @Body() body: { notes?: string },
    ) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (vendor.kycStatus === 'VERIFIED') {
            throw new BadRequestException('Vendor is already verified');
        }

        // Update vendor status to VERIFIED
        const updatedVendor = await this.prisma.vendor.update({
            where: { id },
            data: {
                kycStatus: 'VERIFIED',
                updatedAt: new Date(),
            },
        });

        // Update all vendor documents to APPROVED
        await this.prisma.vendorDocument.updateMany({
            where: {
                vendorId: id,
                status: 'PENDING',
            },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewedBy: req.user.id,
            },
        });

        if (vendor.email) {
            const subject = 'Risbow KYC Approved';
            const content = `Hi ${vendor.name || 'Vendor'},\n\nYour KYC verification is approved. You can now access your dashboard and start selling.\n\nThanks,\nRisbow Team`;
            await this.notificationsService.sendEmail(vendor.email, subject, content);
        }

        return {
            success: true,
            message: 'Vendor verified successfully',
            vendor: {
                id: updatedVendor.id,
                name: updatedVendor.name,
                kycStatus: updatedVendor.kycStatus,
            },
        };
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject vendor KYC application' })
    @ApiResponse({ status: 200, description: 'Vendor rejected successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async rejectVendor(
        @Param('id') id: string,
        @Request() req,
        @Body() body: { reason: string; notes?: string },
    ) {
        if (!body.reason) {
            throw new BadRequestException('Rejection reason is required');
        }

        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Update vendor status back to PENDING_PAYMENT so they can resubmit
        const updatedVendor = await this.prisma.vendor.update({
            where: { id },
            data: {
                kycStatus: 'PENDING_PAYMENT',
                updatedAt: new Date(),
            },
        });

        // Update vendor documents to REJECTED
        await this.prisma.vendorDocument.updateMany({
            where: {
                vendorId: id,
                status: 'PENDING',
            },
            data: {
                status: 'REJECTED',
                reviewedAt: new Date(),
                reviewedBy: req.user.id,
                rejectionReason: body.reason,
            },
        });

        if (vendor.email) {
            const subject = 'Risbow KYC Rejected';
            const reason = body.reason || 'Additional verification required.';
            const content = `Hi ${vendor.name || 'Vendor'},\n\nYour KYC verification was rejected. Reason: ${reason}\n\nPlease update your documents and resubmit.\n\nThanks,\nRisbow Team`;
            await this.notificationsService.sendEmail(vendor.email, subject, content);
        }

        return {
            success: true,
            message: 'Vendor KYC rejected',
            vendor: {
                id: updatedVendor.id,
                name: updatedVendor.name,
                kycStatus: updatedVendor.kycStatus,
            },
            rejection: {
                reason: body.reason,
                notes: body.notes,
            },
        };
    }

    @Get('stats/overview')
    @ApiOperation({ summary: 'Get vendor verification statistics' })
    @ApiResponse({ status: 200, description: 'Vendor statistics' })
    async getVendorStats() {
        const [total, pending, verified, pendingPayment] = await Promise.all([
            this.prisma.vendor.count(),
            this.prisma.vendor.count({ where: { kycStatus: 'PENDING' } }),
            this.prisma.vendor.count({ where: { kycStatus: 'VERIFIED' } }),
            this.prisma.vendor.count({ where: { kycStatus: 'PENDING_PAYMENT' } }),
        ]);

        return {
            total,
            pending,
            verified,
            pendingPayment,
            verificationRate: total > 0 ? ((verified / total) * 100).toFixed(2) : '0',
        };
    }

    private async mapVendorDocumentUrls(documents: Array<{ documentUrl: string }>) {
        if (!this.supabaseStorage.isEnabled()) {
            return documents;
        }

        return Promise.all(
            documents.map(async (doc) => {
                const { bucket, path } = this.parseStorageReference(doc.documentUrl);
                if (!path) {
                    return doc;
                }

                const signedUrl = await this.supabaseStorage.getSignedUrl(bucket, path, 3600);
                return {
                    ...doc,
                    documentUrl: signedUrl,
                };
            })
        );
    }

    private parseStorageReference(documentUrl: string) {
        const defaultBucket = 'vendorDocuments';

        if (!documentUrl) {
            return { bucket: defaultBucket, path: '' };
        }

        if (documentUrl.startsWith('http')) {
            const match = documentUrl.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
            if (match) {
                return { bucket: match[1], path: match[2] };
            }
        }

        const trimmed = documentUrl.replace(/^\/+/, '');
        const parts = trimmed.split('/');
        if (parts[0] === defaultBucket) {
            return { bucket: defaultBucket, path: parts.slice(1).join('/') };
        }

        return { bucket: defaultBucket, path: trimmed };
    }
}

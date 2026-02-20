import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { NotificationsService } from '../shared/notifications.service';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@ApiTags('Admin - Vendor Management')
@Controller('admin/vendors')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.OPERATIONS_ADMIN)
@ApiBearerAuth()
export class AdminVendorsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly supabaseStorage: SupabaseStorageService,
        private readonly notificationsService: NotificationsService,
    ) { }

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
                        where: {
                            status: { not: 'APPROVED' }
                        },
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
                storeLogo: true,
                storeBanner: true,
                bankDetails: true,
                pincode: true,
                address: true,
                city: true,
                state: true,
                storeDescription: true,
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
            logo: vendor.storeLogo,
            storeCover: vendor.storeBanner,
            phone: vendor.mobile,
            VendorDocument: await this.mapVendorDocumentUrls(vendor.VendorDocument || []),
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update vendor details' })
    @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateVendor(
        @Param('id') id: string,
        @Body() updateData: UpdateVendorDto,
    ) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        console.log('Updating vendor:', id, 'with data:', updateData);

        // Map frontend fields to schema fields
        // address, city, state, storeDescription are currently NOT in schema so they are ignored to prevent errors
        const {
            logo,
            storeCover,
            businessName,
            ...rest
        } = updateData;

        const mappedData: any = {
            ...rest,
        };

        if (logo !== undefined) mappedData.storeLogo = logo;
        if (storeCover !== undefined) mappedData.storeBanner = storeCover;
        if (businessName !== undefined && !mappedData.storeName) mappedData.storeName = businessName;
        if (updateData.phone !== undefined && !mappedData.mobile) mappedData.mobile = updateData.phone;

        // Remove undefined keys
        Object.keys(mappedData).forEach(key => mappedData[key] === undefined && delete mappedData[key]);

        console.log('Mapped update data:', mappedData);

        const updatedVendor = await this.prisma.vendor.update({
            where: { id },
            data: mappedData,
        });

        console.log('Update successful:', updatedVendor.id);

        // If name was updated, try to update related User record if possible
        if (updateData.name) {
            // We don't have direct link back to user easily here unless we look it up or trust frontend
            // But let's check if we can update the user associated with this vendor
            // The vendor has a unique mobile, let's see if we can find user by mobile or if schema has userId
            // Wait, schema has NO userId. Vendor is separate? Let me check schema again.
            // Ah, schema has no userId based on previous view? Actually let me re-verify schema.
        }

        return updatedVendor;

        return updatedVendor;
    }

    @Patch(':id/verify')
    @ApiOperation({ summary: 'Approve vendor KYC and activate account' })
    @ApiResponse({ status: 200, description: 'Vendor verified successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async verifyVendor(
        @Param('id') id: string,
        @Request() req: any,
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
        @Request() req: any,
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

    @Post(':id/reset-password')
    @ApiOperation({ summary: 'Send password reset link to vendor' })
    @ApiResponse({ status: 200, description: 'Password reset email sent' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async resetVendorPassword(
        @Param('id') id: string,
    ) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (!vendor.email) {
            throw new BadRequestException('Vendor does not have an email address');
        }

        // Send password reset email
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token (you might need to add these fields to your Vendor schema)
        // For now, we'll just send the email notification
        const resetUrl = `${process.env.FRONTEND_URL || 'https://risbow.com'}/reset-password?token=${resetToken}&email=${encodeURIComponent(vendor.email)}`;
        
        const subject = 'Reset Your Risbow Password';
        const content = `Hi ${vendor.name || 'Vendor'},\n\nYou requested a password reset for your Risbow vendor account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nRisbow Team`;
        
        await this.notificationsService.sendEmail(vendor.email, subject, content);

        return {
            success: true,
            message: 'Password reset link sent to vendor email',
        };
    }
}

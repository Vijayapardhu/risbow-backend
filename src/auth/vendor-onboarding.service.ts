import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../shared/razorpay.service';
import { FileUploadService } from '../shared/file-upload.service';
import { JwtService } from '@nestjs/jwt';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class VendorOnboardingService {
    private readonly logger = new Logger(VendorOnboardingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly razorpayService: RazorpayService,
        private readonly fileUploadService: FileUploadService,
        private readonly jwtService: JwtService
    ) {}

    /**
     * Create payment order for vendor registration
     */
    async createRegistrationPaymentOrder(vendorId: string) {
        // Check if vendor exists
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                name: true,
                storeName: true,
                isGstVerified: true,
                kycStatus: true
            }
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Check if already paid
        const existingPayment = await this.prisma.vendorRegistrationPayment.findUnique({
            where: { vendorId }
        });

        if (existingPayment && existingPayment.status === 'SUCCESS') {
            throw new ConflictException('Registration payment already completed');
        }

        // Create Razorpay order
        const order = await this.razorpayService.createRegistrationOrder(
            vendorId,
            vendor.storeName || vendor.name
        );

        // Save payment record
        await this.prisma.vendorRegistrationPayment.upsert({
            where: { vendorId },
            create: {
                vendorId,
                razorpayOrderId: order.id,
                amount: order.amount,
                currency: order.currency,
                status: 'PENDING',
            },
            update: {
                razorpayOrderId: order.id,
                amount: order.amount,
                status: 'PENDING',
                updatedAt: new Date()
            }
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: this.razorpayService.getKeyId(),
            vendorId: vendor.id,
            vendorName: vendor.storeName || vendor.name
        };
    }

    /**
     * Verify payment and activate vendor
     */
    async verifyRegistrationPayment(
        vendorId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string
    ) {
        // Verify signature
        const isValid = this.razorpayService.verifyPaymentSignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            throw new BadRequestException('Invalid payment signature');
        }

        // Update payment record and vendor status
        const result = await this.prisma.$transaction(async (prisma) => {
            // Update payment record
            const payment = await prisma.vendorRegistrationPayment.update({
                where: { vendorId },
                data: {
                    razorpayPaymentId,
                    status: 'SUCCESS',
                    paidAt: new Date(),
                    metadata: {
                        razorpayOrderId,
                        razorpayPaymentId,
                        razorpaySignature
                    }
                }
            });

            // Update vendor status to ACTIVE (payment verified)
            const vendor = await prisma.vendor.update({
                where: { id: vendorId },
                data: {
                    kycStatus: 'APPROVED', // Auto-approve for paid registrations
                    isActive: true
                }
            });

            // Update user status
            await prisma.user.update({
                where: { id: vendorId },
                data: {
                    status: 'ACTIVE'
                }
            });

            return { payment, vendor };
        });

        // Generate JWT tokens for the vendor
        const user = await this.prisma.user.findUnique({
            where: { id: vendorId }
        });

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(
            { sub: user.id, type: 'refresh' },
            { expiresIn: '7d' }
        );

        const { password, ...userWithoutPassword } = user;

        return {
            success: true,
            message: 'Payment verified successfully. Your account is now active!',
            accessToken,
            refreshToken,
            user: userWithoutPassword,
            vendor: result.vendor
        };
    }

    /**
     * Upload additional documents for vendor
     */
    async uploadVendorDocument(
        vendorId: string,
        documentType: string,
        file: Express.Multer.File
    ) {
        // Verify vendor exists
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Save file
        const uploadedFile = await this.fileUploadService.saveFile(file, vendorId);

        // Create document record
        const document = await this.prisma.vendorDocument.create({
            data: {
                id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                vendorId,
                documentType,
                documentUrl: uploadedFile.url,
                status: 'PENDING'
            }
        });

        return {
            documentId: document.id,
            documentType: document.documentType,
            documentUrl: document.documentUrl,
            status: document.status,
            uploadedAt: document.uploadedAt
        };
    }

    /**
     * Get vendor onboarding status
     */
    async getOnboardingStatus(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                VendorDocument: true,
                VendorRegistrationPayment: true
            }
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const requiredDocs = ['PAN_CARD', 'AADHAAR_CARD', 'CANCELLED_CHEQUE', 'STORE_PHOTO'];
        if (vendor.isGstVerified || vendor.gstNumber) {
            requiredDocs.push('GST_CERTIFICATE');
        }

        const uploadedDocs = vendor.VendorDocument.map(doc => doc.documentType);
        const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc));

        const needsPayment = !vendor.isGstVerified && 
            (!vendor.VendorRegistrationPayment || vendor.VendorRegistrationPayment.status !== 'SUCCESS');

        return {
            vendorId: vendor.id,
            kycStatus: vendor.kycStatus,
            isActive: vendor.isActive,
            documentsUploaded: uploadedDocs,
            missingDocuments: missingDocs,
            needsPayment,
            paymentStatus: vendor.VendorRegistrationPayment?.status || null,
            canActivate: missingDocs.length === 0 && (!needsPayment || vendor.VendorRegistrationPayment?.status === 'SUCCESS')
        };
    }
}

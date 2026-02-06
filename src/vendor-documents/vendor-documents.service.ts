import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { DocumentType } from './dto/upload-document.dto';
import { PaymentIntentPurpose } from '@prisma/client';
import { NotificationsService } from '../shared/notifications.service';

@Injectable()
export class VendorDocumentsService {
  private readonly logger = new Logger(VendorDocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseStorage: SupabaseStorageService,
    private notificationsService: NotificationsService,
  ) {}

  async uploadDocument(
    vendorId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
  ) {
    // Validate file type
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid document type. Allowed: ${allowedMimes.join(', ')}`);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Document exceeds 10MB limit');
    }

    // Upload to Supabase Storage
    const ext = file.originalname.split('.').pop() || 'pdf';
    const path = `documents/${vendorId}/${documentType}/${Date.now()}-${randomUUID()}.${ext}`;
    const bucket = 'users';

    const url = await this.supabaseStorage.uploadFile(bucket, path, file.buffer, file.mimetype);

    // Create document record
    const document = await this.prisma.vendorDocument.create({
      data: {
        id: randomUUID(),
        documentType,
        documentUrl: url,
        status: 'PENDING',
        Vendor: { connect: { id: vendorId } },
      },
    });

    await this.notificationsService.createNotification(
      vendorId,
      'KYC document uploaded',
      `${documentType} document uploaded and pending review.`,
      'KYC_DOCUMENT_UPLOADED',
      'INDIVIDUAL',
    );

    return document;
  }

  async getVendorDocuments(vendorId: string) {
    return this.prisma.vendorDocument.findMany({
      where: { vendorId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getAllDocuments(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.vendorDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          },
        },
      },
    });
  }

  async approveDocument(documentId: string, adminId: string) {
    const document = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    const updated = await this.prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    await this.notificationsService.createNotification(
      document.vendorId,
      'KYC document approved',
      `${document.documentType} document approved.`,
      'KYC_DOCUMENT_APPROVED',
      'INDIVIDUAL',
    );

    // Check if all required documents are approved
    await this.checkVendorKYCStatus(document.vendorId);

    return updated;
  }

  async rejectDocument(documentId: string, adminId: string, reason: string) {
    const document = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    const updated = await this.prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason,
      },
    });

    await this.notificationsService.createNotification(
      document.vendorId,
      'KYC document rejected',
      `${document.documentType} document rejected. Reason: ${reason}`,
      'KYC_DOCUMENT_REJECTED',
      'INDIVIDUAL',
    );

    return updated;
  }

  private async checkVendorKYCStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, gstNumber: true, kycDocuments: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    // Check if all required documents (AADHAAR, PAN, BANK, UPI, LICENSE) are approved
    const requiredTypes: DocumentType[] = [
      DocumentType.AADHAAR,
      DocumentType.PAN,
      DocumentType.BANK,
      DocumentType.UPI,
      DocumentType.LICENSE,
    ];
    const approvedDocs = await this.prisma.vendorDocument.findMany({
      where: {
        vendorId,
        documentType: { in: requiredTypes },
        status: 'APPROVED',
      },
      select: { documentType: true },
    });

    const approvedTypes = approvedDocs.map(doc => doc.documentType);
    const allApproved = requiredTypes.every(type => approvedTypes.includes(type));

    if (!allApproved) {
      return;
    }

    const kycDocuments = (vendor.kycDocuments as any) || {};
    const isGstRegistered = Boolean(vendor.gstNumber) || Boolean(kycDocuments?.isGstRegistered);

    if (!isGstRegistered) {
      const complianceIntent = await (this.prisma as any).paymentIntent.findUnique({
        where: {
          purpose_referenceId: {
            purpose: PaymentIntentPurpose.VENDOR_GST_COMPLIANCE,
            referenceId: vendorId,
          },
        },
      }).catch(() => null);

      if (!complianceIntent || complianceIntent.status !== 'SUCCESS') {
        await this.prisma.vendor.update({
          where: { id: vendorId },
          data: { kycStatus: 'PENDING_PAYMENT' },
        });
        return;
      }
    }

    // Update vendor KYC status
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { kycStatus: 'VERIFIED' },
    });

    await this.notificationsService.createNotification(
      vendorId,
      'KYC verified',
      'All required documents have been approved. Your KYC is verified.',
      'KYC_VERIFIED',
      'INDIVIDUAL',
    );
  }
}

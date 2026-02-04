import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { DocumentType } from './dto/upload-document.dto';

@Injectable()
export class VendorDocumentsService {
  private readonly logger = new Logger(VendorDocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseStorage: SupabaseStorageService,
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
    const path = `documents/${vendorId}/${documentType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
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

    return updated;
  }

  private async checkVendorKYCStatus(vendorId: string) {
    // Check if all required documents (AADHAAR, PAN, BANK, UPI) are approved
    const requiredTypes = ['AADHAAR', 'PAN', 'BANK', 'UPI'];
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

    if (allApproved) {
      // Update vendor KYC status
      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: { kycStatus: 'APPROVED' },
      });
    }
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AzureStorageService } from '../shared/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class PackingProofService {
  private readonly logger = new Logger(PackingProofService.name);
  private readonly container = 'videos'; // Azure Blob Storage container for videos

  constructor(
    private prisma: PrismaService,
    private azureStorage: AzureStorageService,
    private configService: ConfigService,
  ) {
    if (!this.azureStorage.isEnabled()) {
      throw new Error('Azure Blob Storage is required but not configured. Please set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.');
    }
  }

  async uploadPackingVideo(params: {
    vendorId: string;
    userId: string;
    orderId: string;
    file: Express.Multer.File;
  }) {
    const { vendorId, userId, orderId, file } = params;
    if (!file) throw new BadRequestException('Video file is required');

    if (!file.mimetype?.startsWith('video/')) {
      throw new BadRequestException('Only video uploads are allowed');
    }

    // Max 50MB (tunable)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) throw new BadRequestException('Video exceeds 50MB limit');

    // Ownership is checked in VendorOrdersService before calling this (vendor has items in order).
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');

    const ext = (file.originalname || '').split('.').pop() || 'mp4';
    const path = `vendor/${vendorId}/order/${orderId}/${Date.now()}-${randomUUID()}.${ext}`;

    try {
      await this.azureStorage.uploadFile(this.container, path, file.buffer, file.mimetype);
      this.logger.log(`Packing video uploaded to Azure: ${path}`);
    } catch (error) {
      this.logger.error(`Azure video upload failed: ${error.message}`);
      throw new BadRequestException('Failed to upload packing video to Azure Storage');
    }

    const proof = await this.prisma.orderPackingProof.upsert({
      where: { orderId },
      update: {
        vendorId,
        uploadedByUserId: userId,
        videoPath: path,
        videoMime: file.mimetype,
        videoSizeBytes: file.size,
      } as any,
      create: {
        orderId,
        vendorId,
        uploadedByUserId: userId,
        videoPath: path,
        videoMime: file.mimetype,
        videoSizeBytes: file.size,
      } as any,
    });

    // Audit
    await this.prisma.auditLog
      .create({
        data: {
          adminId: userId,
          entity: 'Order',
          entityId: orderId,
          action: 'PACKING_VIDEO_UPLOADED',
          details: { vendorId, videoPath: path, size: file.size, mime: file.mimetype },
        } as any,
      })
      .catch(() => undefined);

    return { success: true, proofId: proof.id };
  }

  async getSignedVideoUrlForCustomer(params: { userId: string; orderId: string }) {
    const { userId, orderId } = params;
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');

    const proof = await this.prisma.orderPackingProof.findUnique({ where: { orderId } });
    if (!proof) throw new NotFoundException('Packing video not available');

    try {
      const signedUrl = await this.azureStorage.getSignedUrl(this.container, proof.videoPath, 600);
      return { signedUrl, expiresInSeconds: 600 };
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new BadRequestException('Failed to generate signed URL for packing video');
    }
  }

  async hasProof(orderId: string): Promise<boolean> {
    const proof = await this.prisma.orderPackingProof.findUnique({ where: { orderId }, select: { id: true } });
    return !!proof;
  }
}


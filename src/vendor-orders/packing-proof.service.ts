import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../shared/supabase.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PackingProofService {
  private readonly logger = new Logger(PackingProofService.name);
  private readonly bucket = process.env.PACKING_PROOF_BUCKET || 'risbow-packing-proof';

  constructor(private prisma: PrismaService, private supabase: SupabaseService) {}

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

    const client = this.supabase.getClient();
    const { error } = await client.storage.from(this.bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true, // allow re-upload / replace
    });
    if (error) {
      this.logger.error(`Supabase video upload failed: ${error.message}`);
      throw new BadRequestException('Failed to upload packing video');
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

    const client = this.supabase.getClient();
    const { data, error } = await client.storage.from(this.bucket).createSignedUrl(proof.videoPath, 60 * 10);
    if (error || !data?.signedUrl) {
      this.logger.error(`Signed URL failed: ${error?.message}`);
      throw new BadRequestException('Failed to generate signed URL');
    }

    return { signedUrl: data.signedUrl, expiresInSeconds: 600 };
  }

  async hasProof(orderId: string): Promise<boolean> {
    const proof = await this.prisma.orderPackingProof.findUnique({ where: { orderId }, select: { id: true } });
    return !!proof;
  }
}


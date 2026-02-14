import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class ArrivalProofService {
    private readonly logger = new Logger(ArrivalProofService.name);
    private readonly bucket = 'videos'; // Supabase Storage bucket for videos

    constructor(
        private prisma: PrismaService,
        private supabaseStorage: SupabaseStorageService,
        private configService: ConfigService,
    ) {
        if (!this.supabaseStorage.isEnabled()) {
            throw new Error('Supabase Storage is required but not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        }
    }

    async uploadArrivalVideo(params: {
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

        // Max 50MB
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) throw new BadRequestException('Video exceeds 50MB limit');

        const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
        if (!order) throw new NotFoundException('Order not found');

        const ext = (file.originalname || '').split('.').pop() || 'webm';
        const path = `arrival/${vendorId}/order/${orderId}/${Date.now()}-${randomUUID()}.${ext}`;

        try {
            await this.supabaseStorage.uploadFile(this.bucket, path, file.buffer, file.mimetype);
            this.logger.log(`Arrival video uploaded to Supabase: ${path}`);
        } catch (error) {
            this.logger.error(`Supabase video upload failed: ${error.message}`);
            throw new BadRequestException('Failed to upload arrival video to Supabase Storage');
        }

        // Check if proof already exists
        const existingProof = await this.prisma.orderArrivalProof.findUnique({
            where: { orderId },
        });

        if (existingProof) {
            throw new BadRequestException('Arrival proof already exists and cannot be modified.');
        }

        // Create proof
        const proof = await this.prisma.orderArrivalProof.create({
            data: {
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
                    action: 'ARRIVAL_VIDEO_UPLOADED',
                    details: { vendorId, videoPath: path, size: file.size, mime: file.mimetype },
                } as any,
            })
            .catch(() => undefined);

        return { success: true, proofId: proof.id };
    }

    async hasProof(orderId: string): Promise<boolean> {
        const proof = await this.prisma.orderArrivalProof.findUnique({ where: { orderId }, select: { id: true } });
        return !!proof;
    }
}

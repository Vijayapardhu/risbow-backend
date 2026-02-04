import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { ConfigService } from '@nestjs/config';
import sharp = require('sharp');
import { randomUUID } from 'crypto';
import { UploadContext } from './dto/upload.dto';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    constructor(
        private readonly supabaseStorageService: SupabaseStorageService,
        private readonly configService: ConfigService,
    ) {
        // Ensure Supabase Storage is enabled
        if (!this.supabaseStorageService.isEnabled()) {
            throw new Error('Supabase Storage is required but not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        }
    }

    private getSupabaseBucket(context: UploadContext): string {
        switch (context) {
            case UploadContext.PRODUCT:
                return 'products';
            case UploadContext.VENDOR:
                return 'users';
            default:
                return 'products';
        }
    }

    async uploadImage(file: Express.Multer.File, context: UploadContext, contextId: string): Promise<{ url: string, path: string }> {
        // 1. Validate MIME Type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new BadRequestException(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`);
        }

        // 2. Validate Size (Max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException('File size exceeds 5MB limit');
        }

        try {
            // 3. Optimize Image
            const optimizedBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true }) // Max width 1200
                .webp({ quality: 80 }) // Convert to WebP
                .toBuffer();

            // 4. Generate Path
            const filename = `${Date.now()}-${randomUUID()}.webp`;
            const path = `${context}/${contextId}/${filename}`;

            // 5. Upload to Supabase Storage
            const bucket = this.getSupabaseBucket(context);
            const url = await this.supabaseStorageService.uploadFile(bucket, path, optimizedBuffer, 'image/webp');
            return { url, path };

        } catch (error) {
            this.logger.error(`Image processing failed: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Image upload failed');
        }
    }

    async uploadProductMedia(file: Express.Multer.File, contextId: string): Promise<{ url: string, path: string, type: 'image' | 'video' }> {
        // 1. Validate MIME Type (Images & Videos)
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new BadRequestException(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`);
        }

        // 2. Validate Size (Images: 5MB, Videos: 50MB)
        const isVideo = file.mimetype.startsWith('video/');
        const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

        if (file.size > maxSize) {
            throw new BadRequestException(`File size exceeds limit (${isVideo ? '50MB' : '5MB'})`);
        }

        try {
            let buffer = file.buffer;
            let mimeType = file.mimetype;
            let ext = file.originalname.split('.').pop() || 'bin';

            // 3. Optimize if Image
            if (!isVideo) {
                buffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                mimeType = 'image/webp';
                ext = 'webp';
            }

            // 4. Generate Path
            const filename = `${Date.now()}-${randomUUID()}.${ext}`;
            const path = `products/${contextId}/${filename}`;

            // 5. Upload to Supabase
            // Note: Reuse 'products' bucket logic
            const bucket = 'products';
            const url = await this.supabaseStorageService.uploadFile(bucket, path, buffer, mimeType);

            return { url, path, type: isVideo ? 'video' : 'image' };

        } catch (error) {
            this.logger.error(`Media upload failed: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Media upload failed');
        }
    }

    async uploadDocument(file: Express.Multer.File, userId: string, documentType: string): Promise<{ url: string, path: string }> {
        // 1. Validate MIME Type
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new BadRequestException(`Invalid document type. Allowed: ${allowedMimes.join(', ')}`);
        }

        // 2. Validate Size (Max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException('Document exceeds 10MB limit');
        }

        try {
            // 3. Generate Path
            const ext = file.originalname.split('.').pop() || 'bin';
            const filename = `${Date.now()}-${randomUUID()}.${ext}`;
            const path = `documents/${userId}/${filename}`;

            // 4. Upload to Supabase Storage
            const bucket = 'users';
            const url = await this.supabaseStorageService.uploadFile(bucket, path, file.buffer, file.mimetype);
            return { url, path };

        } catch (error) {
            this.logger.error(`Document upload failed: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Document upload failed');
        }
    }

    async deleteFile(path: string, context?: UploadContext) {
        const bucket = context ? this.getSupabaseBucket(context) : 'users';
        await this.supabaseStorageService.deleteFile(bucket, path);
        return { message: 'File deleted from Supabase Storage successfully' };
    }
}

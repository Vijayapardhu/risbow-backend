import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import { AzureStorageService } from '../shared/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import sharp = require('sharp');
import { randomUUID } from 'crypto';
import { UploadContext } from './dto/upload.dto';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly SUPABASE_BUCKET = 'risbow-uploads';

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly azureStorageService: AzureStorageService,
        private readonly configService: ConfigService,
    ) { }

    private getSupabaseClient() {
        return this.supabaseService.getClient();
    }

    private getAzureContainer(context: UploadContext): string {
        switch (context) {
            case UploadContext.PRODUCT:
                return this.configService.get<string>('AZURE_STORAGE_CONTAINER_PRODUCTS') || 'products';
            case UploadContext.VENDOR:
                return this.configService.get<string>('AZURE_STORAGE_CONTAINER_USERS') || 'users';
            default:
                return 'general';
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

            // 5. Upload to Preferred Storage (Azure vs Supabase)
            if (this.azureStorageService.isEnabled()) {
                const container = this.getAzureContainer(context);
                const url = await this.azureStorageService.uploadFile(container, path, optimizedBuffer, 'image/webp');
                return { url, path };
            }

            // Fallback to Supabase
            const { data, error } = await this.getSupabaseClient()
                .storage
                .from(this.SUPABASE_BUCKET)
                .upload(path, optimizedBuffer, {
                    contentType: 'image/webp',
                    upsert: false
                });

            if (error) {
                this.logger.error(`Supabase upload failed: ${error.message}`);
                throw new InternalServerErrorException('Failed to upload image');
            }

            const { data: publicData } = this.getSupabaseClient()
                .storage
                .from(this.SUPABASE_BUCKET)
                .getPublicUrl(path);

            return {
                url: publicData.publicUrl,
                path: path
            };

        } catch (error) {
            this.logger.error(`Image processing failed: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Image upload failed');
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

            // 4. Upload to Preferred Storage
            if (this.azureStorageService.isEnabled()) {
                const container = this.configService.get<string>('AZURE_STORAGE_CONTAINER_USERS') || 'users';
                const url = await this.azureStorageService.uploadFile(container, path, file.buffer, file.mimetype);
                return { url, path };
            }

            // Fallback to Supabase
            const { data, error } = await this.getSupabaseClient()
                .storage
                .from(this.SUPABASE_BUCKET)
                .upload(path, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                    metadata: { type: documentType }
                });

            if (error) {
                this.logger.error(`Supabase document upload failed: ${error.message}`);
                throw new InternalServerErrorException('Failed to upload document');
            }

            const { data: publicData } = this.getSupabaseClient()
                .storage
                .from(this.SUPABASE_BUCKET)
                .getPublicUrl(path);

            return {
                url: publicData.publicUrl,
                path: path
            };

        } catch (error) {
            this.logger.error(`Document upload failed: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Document upload failed');
        }
    }

    async deleteFile(path: string, context?: UploadContext) {
        if (this.azureStorageService.isEnabled()) {
            const container = context ? this.getAzureContainer(context) : (this.configService.get<string>('AZURE_STORAGE_CONTAINER_USERS') || 'users');
            await this.azureStorageService.deleteFile(container, path);
            return { message: 'File deleted from Azure successfully' };
        }

        const { error } = await this.getSupabaseClient()
            .storage
            .from(this.SUPABASE_BUCKET)
            .remove([path]);

        if (error) {
            this.logger.error(`Failed to delete file ${path}: ${error.message}`);
            throw new InternalServerErrorException('Failed to delete file');
        }

        return { message: 'File deleted from Supabase successfully' };
    }
}

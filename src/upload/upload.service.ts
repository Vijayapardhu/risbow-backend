import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import sharp = require('sharp');
import { v4 as uuidv4 } from 'uuid';
import { UploadContext } from './dto/upload.dto';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly BUCKET_NAME = 'risbow-uploads';

    constructor(private readonly supabaseService: SupabaseService) { }

    private getClient() {
        return this.supabaseService.getClient();
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
            // const optimizedBuffer = file.buffer; // DEBUG: Bypass sharp

            // 4. Generate Path
            const filename = `${Date.now()}-${uuidv4()}.webp`;
            const path = `${context}/${contextId}/${filename}`;

            // 5. Upload to Supabase
            const { data, error } = await this.getClient()
                .storage
                .from(this.BUCKET_NAME)
                .upload(path, optimizedBuffer, {
                    contentType: 'image/webp',
                    upsert: false
                });

            if (error) {
                this.logger.error(`Supabase upload failed: ${error.message}`);
                throw new InternalServerErrorException('Failed to upload image');
            }

            // 6. Get Public URL
            const { data: publicData } = this.getClient()
                .storage
                .from(this.BUCKET_NAME)
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
            const filename = `${Date.now()}-${uuidv4()}.${ext}`;
            const path = `documents/${userId}/${filename}`; // documentType could be a subfolder if needed

            // 4. Upload to Supabase (No optimization for docs)
            const { data, error } = await this.getClient()
                .storage
                .from(this.BUCKET_NAME)
                .upload(path, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                    metadata: { type: documentType }
                });

            if (error) {
                this.logger.error(`Supabase document upload failed: ${error.message}`);
                throw new InternalServerErrorException('Failed to upload document');
            }

            // 5. Get Public URL
            const { data: publicData } = this.getClient()
                .storage
                .from(this.BUCKET_NAME)
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

    async deleteFile(path: string) {
        const { error } = await this.getClient()
            .storage
            .from(this.BUCKET_NAME)
            .remove([path]);

        if (error) {
            this.logger.error(`Failed to delete file ${path}: ${error.message}`);
            throw new InternalServerErrorException('Failed to delete file');
        }

        return { message: 'File deleted successfully' };
    }
}

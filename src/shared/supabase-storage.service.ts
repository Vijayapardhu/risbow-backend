import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStorageService {
    private readonly logger = new Logger(SupabaseStorageService.name);
    private supabase: SupabaseClient | null = null;
    private enabled: boolean = false;
    private readonly privateBuckets = new Set(['vendorDocuments']);

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            this.logger.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set. Supabase Storage will be unavailable.');
            this.enabled = false;
            return;
        }

        try {
            this.supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            this.enabled = true;
            this.logger.log('✅ Supabase Storage client initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Supabase Storage client: ${error.message}`);
            this.enabled = false;
        }
    }

    private getBucketName(context: string): string {
        // Map context to Supabase storage bucket names
        const bucketMap: Record<string, string> = {
            'products': 'products',
            'users': 'users',
            'videos': 'videos',
            'documents': 'vendorDocuments',
            'general': 'products',
        };
        return bucketMap[context] || 'products';
    }

    async uploadFile(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
        if (!this.enabled || !this.supabase) {
            throw new InternalServerErrorException('Supabase Storage is not enabled. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
        }

        try {
            // Ensure bucket exists (create if not exists)
            const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
            if (!listError) {
                const bucketExists = buckets?.some(b => b.name === bucket);
                if (!bucketExists) {
                    // Create bucket if it doesn't exist
                    const { error: createError } = await this.supabase.storage.createBucket(bucket, {
                        public: !this.privateBuckets.has(bucket),
                        fileSizeLimit: 52428800, // 50MB
                        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']
                    });
                    if (createError && !createError.message.includes('already exists')) {
                        this.logger.warn(`Failed to create bucket ${bucket}: ${createError.message}`);
                    }
                }
            }

            // Upload file
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, buffer, {
                    contentType,
                    upsert: true,
                });

            if (error) {
                throw new Error(`Supabase upload error: ${error.message}`);
            }

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            if (!urlData?.publicUrl) {
                throw new Error('Failed to get public URL after upload');
            }

            this.logger.log(`File uploaded to Supabase Storage: ${bucket}/${path}`);
            return urlData.publicUrl;
        } catch (error) {
            this.logger.error(`Supabase upload failed for ${path}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to upload file to Supabase Storage: ${error.message}`);
        }
    }

    async deleteFile(bucket: string, path: string): Promise<void> {
        if (!this.enabled || !this.supabase) {
            throw new InternalServerErrorException('Supabase Storage is not enabled.');
        }

        try {
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                throw new Error(`Supabase delete error: ${error.message}`);
            }

            this.logger.log(`File deleted from Supabase Storage: ${bucket}/${path}`);
        } catch (error) {
            this.logger.error(`Supabase delete failed for ${path}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete file from Supabase Storage: ${error.message}`);
        }
    }

    async getSignedUrl(bucket: string, path: string, expiresInSeconds: number = 3600): Promise<string> {
        if (!this.enabled || !this.supabase) {
            throw new InternalServerErrorException('Supabase Storage is not enabled.');
        }

        try {
            const isPrivate = this.privateBuckets.has(bucket);

            if (!isPrivate) {
                // For public buckets, return public URL directly
                const { data: urlData } = this.supabase.storage
                    .from(bucket)
                    .getPublicUrl(path);

                if (urlData?.publicUrl) {
                    return urlData.publicUrl;
                }
            }

            // For private buckets, generate signed URL
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresInSeconds);

            if (error) {
                throw new Error(`Supabase signed URL error: ${error.message}`);
            }

            if (!data?.signedUrl) {
                throw new Error('Failed to generate signed URL');
            }

            return data.signedUrl;
        } catch (error) {
            this.logger.error(`Failed to generate signed URL for ${path}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to generate signed URL: ${error.message}`);
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

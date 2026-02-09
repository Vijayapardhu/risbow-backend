import {
    Injectable,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../shared/supabase-storage.service';
import { ConfigService } from '@nestjs/config';
import sharp = require('sharp');
import { randomUUID } from 'crypto';

interface ListUploadsParams {
    page: number;
    limit: number;
    folder?: string;
    type?: string;
    search?: string;
}

@Injectable()
export class AdminUploadsService {
    private readonly logger = new Logger(AdminUploadsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly supabaseStorageService: SupabaseStorageService,
        private readonly configService: ConfigService,
    ) {}

    async listUploads(params: ListUploadsParams) {
        const { page, limit, folder, type, search } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            isDeleted: false,
        };

        if (folder && folder !== 'ALL') {
            where.folder = folder;
        }

        if (type && type !== 'ALL') {
            if (type === 'image') {
                where.mimetype = { startsWith: 'image/' };
            } else if (type === 'video') {
                where.mimetype = { startsWith: 'video/' };
            } else if (type === 'audio') {
                where.mimetype = { startsWith: 'audio/' };
            } else if (type === 'document') {
                where.mimetype = {
                    in: [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain',
                    ],
                };
            }
        }

        if (search) {
            where.OR = [
                { originalName: { contains: search, mode: 'insensitive' } },
                { filename: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [files, total] = await Promise.all([
            this.prisma.uploadFile.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.uploadFile.count({ where }),
        ]);

        return {
            data: files,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getStats() {
        const [
            totalFiles,
            totalSize,
            imageCount,
            videoCount,
            documentCount,
        ] = await Promise.all([
            this.prisma.uploadFile.count({ where: { isDeleted: false } }),
            this.prisma.uploadFile
                .aggregate({
                    where: { isDeleted: false },
                    _sum: { size: true },
                })
                .then((r) => r._sum.size || 0),
            this.prisma.uploadFile.count({
                where: {
                    isDeleted: false,
                    mimetype: { startsWith: 'image/' },
                },
            }),
            this.prisma.uploadFile.count({
                where: {
                    isDeleted: false,
                    mimetype: { startsWith: 'video/' },
                },
            }),
            this.prisma.uploadFile.count({
                where: {
                    isDeleted: false,
                    mimetype: {
                        in: [
                            'application/pdf',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'application/vnd.ms-excel',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'text/plain',
                        ],
                    },
                },
            }),
        ]);

        // Storage limit (configurable, default 100GB)
        const storageLimitGB = this.configService.get<number>('STORAGE_LIMIT_GB', 100);
        const storageLimit = storageLimitGB * 1024 * 1024 * 1024;

        return {
            totalFiles,
            totalSize,
            imageCount,
            videoCount,
            documentCount,
            storageUsed: totalSize,
            storageLimit,
        };
    }

    async getFolders() {
        const folders = await this.prisma.uploadFile.groupBy({
            by: ['folder'],
            where: { isDeleted: false },
            _count: { id: true },
        });

        return folders.map((f) => ({
            name: f.folder,
            count: f._count.id,
        }));
    }

    async uploadFile(
        file: Express.Multer.File,
        uploadedBy: string,
        folder = 'general',
    ) {
        // Validate file
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            throw new BadRequestException('File size exceeds 50MB limit');
        }

        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        if (!isImage && !isVideo && !this.isAllowedDocument(file.mimetype)) {
            throw new BadRequestException(
                'Invalid file type. Allowed: images, videos, PDFs, documents',
            );
        }

        try {
            let buffer = file.buffer;
            let mimeType = file.mimetype;
            let ext = file.originalname.split('.').pop() || 'bin';
            let thumbnailUrl: string | undefined;

            // Optimize images
            if (isImage) {
                const optimizedBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();

                // Generate thumbnail
                const thumbnailBuffer = await sharp(file.buffer)
                    .resize({ width: 300, height: 300, fit: 'cover' })
                    .webp({ quality: 70 })
                    .toBuffer();

                const thumbnailFilename = `thumb-${Date.now()}-${randomUUID()}.webp`;
                const thumbnailPath = `${folder}/${thumbnailFilename}`;
                thumbnailUrl = await this.supabaseStorageService.uploadFile(
                    'users',
                    thumbnailPath,
                    thumbnailBuffer,
                    'image/webp',
                );

                buffer = optimizedBuffer;
                mimeType = 'image/webp';
                ext = 'webp';
            }

            // Generate storage path
            const filename = `${Date.now()}-${randomUUID()}.${ext}`;
            const storagePath = `${folder}/${filename}`;

            // Upload to Supabase
            const bucket = isImage ? 'products' : 'users';
            const url = await this.supabaseStorageService.uploadFile(
                bucket,
                storagePath,
                buffer,
                mimeType,
            );

            // Save to database
            const uploadFile = await this.prisma.uploadFile.create({
                data: {
                    filename,
                    originalName: file.originalname,
                    mimetype: mimeType,
                    size: file.size,
                    url,
                    thumbnailUrl,
                    folder,
                    bucket,
                    storagePath,
                    uploadedBy,
                    uploaderType: 'ADMIN',
                },
            });

            return uploadFile;
        } catch (error) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('File upload failed');
        }
    }

    async deleteFile(id: string, deletedBy: string) {
        const file = await this.prisma.uploadFile.findUnique({
            where: { id },
        });

        if (!file || file.isDeleted) {
            throw new NotFoundException('File not found');
        }

        try {
            // Delete from Supabase
            await this.supabaseStorageService.deleteFile(file.bucket, file.storagePath);

            // Delete thumbnail if exists
            if (file.thumbnailUrl) {
                const thumbPath = `${file.folder}/thumb-${file.filename}`;
                try {
                    await this.supabaseStorageService.deleteFile(file.bucket, thumbPath);
                } catch (e) {
                    this.logger.warn(`Failed to delete thumbnail: ${e.message}`);
                }
            }

            // Soft delete in database
            await this.prisma.uploadFile.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy,
                },
            });

            return { message: 'File deleted successfully' };
        } catch (error) {
            this.logger.error(`Delete failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to delete file');
        }
    }

    async bulkDelete(ids: string[], deletedBy: string) {
        const results = await Promise.allSettled(
            ids.map((id) => this.deleteFile(id, deletedBy)),
        );

        const success = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        return {
            message: `Deleted ${success} files, ${failed} failed`,
            success,
            failed,
        };
    }

    private isAllowedDocument(mimetype: string): boolean {
        const allowedDocs = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
        ];
        return allowedDocs.includes(mimetype);
    }
}

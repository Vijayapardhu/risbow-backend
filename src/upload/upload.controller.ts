import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, Body, UseGuards, Request, Delete, Param, BadRequestException, ForbiddenException, Query } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { SingleImageUploadDto, MultipleImageUploadDto, DocumentUploadDto } from './dto/upload.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
    constructor(
        private readonly uploadService: UploadService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('image')
    @ApiOperation({ summary: 'Upload a single image (optimized to WebP)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                context: { type: 'string', example: 'products' },
                contextId: { type: 'string', format: 'uuid' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: SingleImageUploadDto
    ) {
        if (!file) throw new BadRequestException('File is required');
        return this.uploadService.uploadImage(file, dto.context, dto.contextId);
    }

    @Post('images')
    @ApiOperation({ summary: 'Upload multiple images' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
                context: { type: 'string', example: 'products' },
                contextId: { type: 'string', format: 'uuid' },
            },
        },
    })
    @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
    async uploadMultipleImages(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() dto: MultipleImageUploadDto
    ) {
        if (!files || files.length === 0) throw new BadRequestException('Files are required');

        // Upload sequentially to handle errors individually if needed, or Promise.all
        // Requirement says "fail individual files without failing entire request"
        // But throwing exception fails request. 
        // Better to return array of results { file: name, url: ..., error: ... }

        const results = await Promise.all(files.map(async (file) => {
            try {
                const res = await this.uploadService.uploadImage(file, dto.context, dto.contextId);
                return { originalName: file.originalname, status: 'success', ...res };
            } catch (error) {
                return { originalName: file.originalname, status: 'failed', error: error.message };
            }
        }));

        return results;
    }

    @Post('document')
    @ApiOperation({ summary: 'Upload a document (PDF, Image)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                documentType: { type: 'string', example: 'KYC' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: DocumentUploadDto
    ) {
        if (!file) throw new BadRequestException('File is required');
        return this.uploadService.uploadDocument(file, req.user.id, dto.documentType); // Use userId from paths
    }

    @Delete()
    @ApiOperation({ summary: 'Delete a file' })
    async deleteFile(
        @Request() req,
        @Query('path') path: string
    ) {
        if (!path) throw new BadRequestException('path is required');
        const normalized = decodeURIComponent(path).replace(/\\/g, '/');

        // Basic traversal / absolute path protection (Supabase storage paths are logical keys)
        if (normalized.includes('..') || normalized.startsWith('/') || normalized.startsWith('http')) {
            throw new BadRequestException('Invalid path');
        }

        const role: UserRole | string = req.user?.role;
        const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

        // Allow list of storage prefixes
        const allowedPrefixes = ['documents/', 'products/', 'vendors/', 'banners/'];
        if (!allowedPrefixes.some((p) => normalized.startsWith(p))) {
            throw new BadRequestException('Unsupported delete path');
        }

        // Ownership rules
        if (isAdmin) {
            return this.uploadService.deleteFile(normalized);
        }

        // documents/{userId}/...
        if (normalized.startsWith('documents/')) {
            const parts = normalized.split('/');
            const ownerUserId = parts[1];
            if (ownerUserId !== req.user.id) {
                throw new ForbiddenException('You can only delete your own documents');
            }
            return this.uploadService.deleteFile(normalized);
        }

        // vendors/{vendorId}/...
        if (normalized.startsWith('vendors/')) {
            const parts = normalized.split('/');
            const vendorId = parts[1];
            if (!req.user.vendorId || vendorId !== req.user.vendorId) {
                throw new ForbiddenException('You can only delete your own vendor assets');
            }
            return this.uploadService.deleteFile(normalized);
        }

        // products/{productId}/...  -> check product vendor ownership
        if (normalized.startsWith('products/')) {
            const parts = normalized.split('/');
            const productId = parts[1];
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: { vendorId: true },
            });
            if (!product) throw new BadRequestException('Invalid product path');
            if (!req.user.vendorId || product.vendorId !== req.user.vendorId) {
                throw new ForbiddenException('You can only delete assets for your own products');
            }
            return this.uploadService.deleteFile(normalized);
        }

        throw new ForbiddenException('Not allowed');
    }
}

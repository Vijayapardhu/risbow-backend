"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../shared/supabase.service");
const sharp = require("sharp");
const uuid_1 = require("uuid");
let UploadService = UploadService_1 = class UploadService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(UploadService_1.name);
        this.BUCKET_NAME = 'risbow-uploads';
    }
    getClient() {
        return this.supabaseService.getClient();
    }
    async uploadImage(file, context, contextId) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`);
        }
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('File size exceeds 5MB limit');
        }
        try {
            const optimizedBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            const filename = `${Date.now()}-${(0, uuid_1.v4)()}.webp`;
            const path = `${context}/${contextId}/${filename}`;
            const { data, error } = await this.getClient()
                .storage
                .from(this.BUCKET_NAME)
                .upload(path, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: false
            });
            if (error) {
                this.logger.error(`Supabase upload failed: ${error.message}`);
                throw new common_1.InternalServerErrorException('Failed to upload image');
            }
            const { data: publicData } = this.getClient()
                .storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(path);
            return {
                url: publicData.publicUrl,
                path: path
            };
        }
        catch (error) {
            this.logger.error(`Image processing failed: ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Image upload failed');
        }
    }
    async uploadDocument(file, userId, documentType) {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid document type. Allowed: ${allowedMimes.join(', ')}`);
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('Document exceeds 10MB limit');
        }
        try {
            const ext = file.originalname.split('.').pop() || 'bin';
            const filename = `${Date.now()}-${(0, uuid_1.v4)()}.${ext}`;
            const path = `documents/${userId}/${filename}`;
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
                throw new common_1.InternalServerErrorException('Failed to upload document');
            }
            const { data: publicData } = this.getClient()
                .storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(path);
            return {
                url: publicData.publicUrl,
                path: path
            };
        }
        catch (error) {
            this.logger.error(`Document upload failed: ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Document upload failed');
        }
    }
    async deleteFile(path) {
        const { error } = await this.getClient()
            .storage
            .from(this.BUCKET_NAME)
            .remove([path]);
        if (error) {
            this.logger.error(`Failed to delete file ${path}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Failed to delete file');
        }
        return { message: 'File deleted successfully' };
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], UploadService);
//# sourceMappingURL=upload.service.js.map
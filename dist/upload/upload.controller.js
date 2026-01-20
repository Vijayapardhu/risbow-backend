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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const upload_service_1 = require("./upload.service");
const upload_dto_1 = require("./dto/upload.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async uploadImage(file, dto) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        return this.uploadService.uploadImage(file, dto.context, dto.contextId);
    }
    async uploadMultipleImages(files, dto) {
        if (!files || files.length === 0)
            throw new common_1.BadRequestException('Files are required');
        const results = await Promise.all(files.map(async (file) => {
            try {
                const res = await this.uploadService.uploadImage(file, dto.context, dto.contextId);
                return { originalName: file.originalname, status: 'success', ...res };
            }
            catch (error) {
                return { originalName: file.originalname, status: 'failed', error: error.message };
            }
        }));
        return results;
    }
    async uploadDocument(req, file, dto) {
        if (!file)
            throw new common_1.BadRequestException('File is required');
        return this.uploadService.uploadDocument(file, req.user.id, dto.documentType);
    }
    async deleteFile(path) {
        return this.uploadService.deleteFile(path);
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('image'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a single image (optimized to WebP)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                context: { type: 'string', example: 'products' },
                contextId: { type: 'string', format: 'uuid' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_dto_1.SingleImageUploadDto]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('images'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload multiple images' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
                context: { type: 'string', example: 'products' },
                contextId: { type: 'string', format: 'uuid' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array,
        upload_dto_1.MultipleImageUploadDto]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadMultipleImages", null);
__decorate([
    (0, common_1.Post)('document'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a document (PDF, Image)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                documentType: { type: 'string', example: 'KYC' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, upload_dto_1.DocumentUploadDto]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)(':path(*)'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a file' }),
    __param(0, (0, common_1.Param)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteFile", null);
exports.UploadController = UploadController = __decorate([
    (0, swagger_1.ApiTags)('Upload'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map
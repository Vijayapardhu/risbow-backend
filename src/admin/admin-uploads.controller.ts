import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminUploadsService } from './admin-uploads.service';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Admin Uploads')
@Controller('admin/uploads')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
export class AdminUploadsController {
    constructor(private readonly adminUploadsService: AdminUploadsService) {}

    @Get()
    @ApiOperation({ summary: 'List all uploads with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'folder', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    async listUploads(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('folder') folder?: string,
        @Query('type') type?: string,
        @Query('search') search?: string,
    ) {
        const normalizedPage = Math.max(1, Number(page) || 1);
        const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 24));
        
        return this.adminUploadsService.listUploads({
            page: normalizedPage,
            limit: normalizedLimit,
            folder,
            type,
            search,
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get upload statistics' })
    async getStats() {
        return this.adminUploadsService.getStats();
    }

    @Get('folders')
    @ApiOperation({ summary: 'Get all folders with file counts' })
    async getFolders() {
        return this.adminUploadsService.getFolders();
    }

    @Post()
    @ApiOperation({ summary: 'Upload a new file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                folder: { type: 'string', example: 'products' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async uploadFile(
        @Request() req: any,
        @UploadedFile() file: Express.Multer.File,
        @Body('folder') folder?: string,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.adminUploadsService.uploadFile(file, req.user.id, folder);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a file by ID' })
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    async deleteFile(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        return this.adminUploadsService.deleteFile(id, req.user.id);
    }

    @Post('bulk-delete')
    @ApiOperation({ summary: 'Delete multiple files by IDs' })
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async bulkDelete(
        @Request() req: any,
        @Body() body: { ids: string[] },
    ) {
        if (!body.ids || !Array.isArray(body.ids)) {
            throw new BadRequestException('ids array is required');
        }
        return this.adminUploadsService.bulkDelete(body.ids, req.user.id);
    }
}

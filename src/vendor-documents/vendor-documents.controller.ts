import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorDocumentsService } from './vendor-documents.service';
import { RejectDocumentDto, UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vendor-documents')
export class VendorDocumentsController {
  constructor(private readonly vendorDocumentsService: VendorDocumentsService) {}

  @Post()
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.vendorDocumentsService.uploadDocument(req.user.id, file, dto.documentType);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getDocuments(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      return this.vendorDocumentsService.getAllDocuments(status);
    }
    return this.vendorDocumentsService.getVendorDocuments(req.user.id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async approveDocument(@Param('id') id: string, @Request() req: any) {
    return this.vendorDocumentsService.approveDocument(id, req.user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async rejectDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: RejectDocumentDto,
  ) {
    return this.vendorDocumentsService.rejectDocument(id, req.user.id, body.reason);
  }
}

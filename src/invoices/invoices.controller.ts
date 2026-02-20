import { 
    Controller, 
    Get, 
    Post, 
    Patch, 
    Delete, 
    Param, 
    Body, 
    Res, 
    UseGuards, 
    Request 
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoiceTemplateService } from './invoice-template.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, AdminRole } from '@prisma/client';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { CreateInvoiceTemplateDto } from './dto/create-invoice-template.dto';
import { UpdateInvoiceTemplateDto } from './dto/update-invoice-template.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly templateService: InvoiceTemplateService,
        private readonly generationService: InvoiceGenerationService,
        private readonly prisma: PrismaService
    ) {}

    // ============= INVOICE TEMPLATES =============

    @Get('vendors/templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all invoice templates for vendor' })
    @ApiResponse({ status: 200, description: 'Returns list of templates' })
    async getVendorTemplates(@Request() req) {
        return this.templateService.getTemplates(req.user.userId);
    }

    @Post('vendors/templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create invoice template' })
    @ApiResponse({ status: 201, description: 'Template created successfully' })
    async createTemplate(@Request() req, @Body() dto: CreateInvoiceTemplateDto) {
        return this.templateService.createTemplate(req.user.userId, dto);
    }

    @Get('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get template by ID' })
    @ApiResponse({ status: 200, description: 'Returns template details' })
    async getTemplateById(@Param('id') id: string) {
        return this.templateService.getTemplateById(id);
    }

    @Patch('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update invoice template' })
    @ApiResponse({ status: 200, description: 'Template updated successfully' })
    async updateTemplate(
        @Param('id') id: string,
        @Request() req,
        @Body() dto: UpdateInvoiceTemplateDto
    ) {
        return this.templateService.updateTemplate(id, req.user.userId, dto);
    }

    @Delete('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete invoice template' })
    @ApiResponse({ status: 200, description: 'Template deleted successfully' })
    async deleteTemplate(@Param('id') id: string, @Request() req) {
        return this.templateService.deleteTemplate(id, req.user.userId);
    }

    @Post('vendors/templates/:id/set-default')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Set template as default' })
    @ApiResponse({ status: 200, description: 'Default template set successfully' })
    async setDefaultTemplate(@Param('id') id: string, @Request() req) {
        return this.templateService.setDefaultTemplate(id, req.user.userId);
    }

    @Post('vendors/templates/:id/duplicate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Duplicate invoice template' })
    @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
    async duplicateTemplate(@Param('id') id: string, @Request() req) {
        return this.templateService.duplicateTemplate(id, req.user.userId);
    }

    // ============= INVOICE GENERATION =============

    // Vendor Download Invoice (must be before generic :orderId route)
    @Get('vendors/invoices/:orderId/download')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download invoice PDF for vendor' })
    @ApiResponse({ status: 200, description: 'Returns PDF invoice' })
    async vendorDownloadInvoice(
        @Param('orderId') orderId: string,
        @Request() req,
        @Res() res: Response
    ) {
        const pdfBuffer = await this.invoicesService.generateInvoice(orderId, req.user.id);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }

    @Get('vendors/invoices/:orderId/preview')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Preview invoice with template' })
    @ApiResponse({ status: 200, description: 'Returns PDF invoice preview' })
    async previewInvoice(
        @Param('orderId') orderId: string,
        @Res() res: Response
    ) {
        const pdfBuffer = await this.generationService.generateInvoiceWithTemplate(orderId);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="invoice-preview-${orderId.substring(0, 8)}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }

    @Post('vendors/invoices/:orderId/generate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate invoice PDF with custom template' })
    @ApiResponse({ status: 200, description: 'Returns PDF invoice' })
    async generateInvoiceWithTemplate(
        @Param('orderId') orderId: string,
        @Body() body: { templateId?: string },
        @Res() res: Response
    ) {
        const pdfBuffer = await this.generationService.generateInvoiceWithTemplate(
            orderId, 
            body.templateId
        );
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${orderId.substring(0, 8)}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }

    // ============= ADMIN ENDPOINTS =============

    // Customer Invoice Download (for customer/user to download their invoice)
    @Get('customer/:orderId/download')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.CUSTOMER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download invoice PDF for customer' })
    @ApiResponse({ status: 200, description: 'Returns PDF invoice' })
    async customerDownloadInvoice(
        @Param('orderId') orderId: string,
        @Request() req,
        @Res() res: Response
    ) {
        const pdfBuffer = await this.invoicesService.generateInvoice(orderId);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }

    // Admin Download Invoice
    @Get('admin/invoices/:orderId/download')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
    @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download invoice PDF for an order (Admin)' })
    @ApiResponse({ 
        status: 200, 
        description: 'Returns PDF invoice',
        content: {
            'application/pdf': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async downloadInvoice(
        @Param('orderId') orderId: string,
        @Res() res: Response
    ) {
        const pdfBuffer = await this.invoicesService.generateInvoice(orderId);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }

    @Get('admin/templates')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
    @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all vendor invoice templates (Admin)' })
    @ApiResponse({ status: 200, description: 'Returns all templates' })
    async getAllTemplates() {
        return this.prisma.invoiceTemplate.findMany({
            where: { isActive: true },
            include: {
                Vendor: {
                    select: {
                        id: true,
                        name: true,
                        storeName: true,
                        email: true
                    }
                },
                InvoiceCustomField: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    @Get('admin/templates/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
    @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Preview vendor template (Admin)' })
    @ApiResponse({ status: 200, description: 'Returns template details' })
    async adminGetTemplate(@Param('id') id: string) {
        return this.templateService.getTemplateById(id);
    }

    // ============= LEGACY ENDPOINT =============

    @Get(':orderId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR)
    @ApiOperation({ summary: 'Generate PDF invoice for an order (Legacy)' })
    @ApiResponse({ 
        status: 200, 
        description: 'Returns PDF invoice',
        content: {
            'application/pdf': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async generateInvoice(
        @Param('orderId') orderId: string,
        @Res() res: Response
    ) {
        const pdfBuffer = await this.invoicesService.generateInvoice(orderId);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${orderId.substring(0, 8)}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    }
}


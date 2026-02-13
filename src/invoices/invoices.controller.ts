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
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all invoice templates for vendor' })
    @ApiResponse({ status: 200, description: 'Returns list of templates' })
    async getVendorTemplates(@Request() req: any) {
        return this.templateService.getTemplates(req.user.userId);
    }

    @Post('vendors/templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create invoice template' })
    @ApiResponse({ status: 201, description: 'Template created successfully' })
    async createTemplate(@Request() req: any, @Body() dto: CreateInvoiceTemplateDto) {
        return this.templateService.createTemplate(req.user.userId, dto);
    }

    @Get('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get template by ID' })
    @ApiResponse({ status: 200, description: 'Returns template details' })
    async getTemplateById(@Param('id') id: string) {
        return this.templateService.getTemplateById(id);
    }

    @Patch('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update invoice template' })
    @ApiResponse({ status: 200, description: 'Template updated successfully' })
    async updateTemplate(
        @Param('id') id: string,
        @Request() req: any,
        @Body() dto: UpdateInvoiceTemplateDto
    ) {
        return this.templateService.updateTemplate(id, req.user.userId, dto);
    }

    @Delete('vendors/templates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete invoice template' })
    @ApiResponse({ status: 200, description: 'Template deleted successfully' })
    async deleteTemplate(@Param('id') id: string, @Request() req: any) {
        return this.templateService.deleteTemplate(id, req.user.userId);
    }

    @Post('vendors/templates/:id/set-default')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Set template as default' })
    @ApiResponse({ status: 200, description: 'Default template set successfully' })
    async setDefaultTemplate(@Param('id') id: string, @Request() req: any) {
        return this.templateService.setDefaultTemplate(id, req.user.userId);
    }

    @Post('vendors/templates/:id/duplicate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Duplicate invoice template' })
    @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
    async duplicateTemplate(@Param('id') id: string, @Request() req: any) {
        return this.templateService.duplicateTemplate(id, req.user.userId);
    }

    // ============= INVOICE GENERATION =============

    @Get('vendors/invoices/:orderId/preview')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
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
    @Roles('VENDOR')
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

    @Get('admin/templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Preview vendor template (Admin)' })
    @ApiResponse({ status: 200, description: 'Returns template details' })
    async adminGetTemplate(@Param('id') id: string) {
        return this.templateService.getTemplateById(id);
    }

    // ============= LEGACY ENDPOINT =============

    @Get(':orderId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'VENDOR')
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


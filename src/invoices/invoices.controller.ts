import { Controller, Get, Param, Res, UseGuards, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
    private readonly logger = new Logger(InvoicesController.name);

    constructor(private readonly invoicesService: InvoicesService) {}

    @Get(':orderId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'VENDOR')
    @ApiOperation({ summary: 'Generate PDF invoice for an order' })
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
        try {
            this.logger.log(`Generating invoice for order: ${orderId}`);
            const pdfBuffer = await this.invoicesService.generateInvoice(orderId);
            
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${orderId.substring(0, 8)}.pdf"`,
                'Content-Length': pdfBuffer.length
            });
            
            res.send(pdfBuffer);
            this.logger.log(`Invoice generated successfully for order: ${orderId}`);
        } catch (error) {
            this.logger.error(`Failed to generate invoice for order ${orderId}:`, error.message);
            throw error;
        }
    }
}

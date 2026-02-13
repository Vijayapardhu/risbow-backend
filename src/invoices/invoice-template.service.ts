import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { CreateInvoiceTemplateDto } from './dto/create-invoice-template.dto';
import { UpdateInvoiceTemplateDto } from './dto/update-invoice-template.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoiceTemplateService {
    constructor(private prisma: PrismaService) {}

    async createTemplate(vendorId: string, dto: CreateInvoiceTemplateDto) {
        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.invoiceTemplate.updateMany({
                where: { vendorId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const template = await this.prisma.invoiceTemplate.create({
            data: {
                vendorId,
                templateName: dto.templateName,
                logoUrl: dto.logoUrl,
                companyName: dto.companyName,
                address: dto.address,
                phone: dto.phone,
                email: dto.email,
                gstin: dto.gstin,
                taxFields: dto.taxFields ? JSON.parse(JSON.stringify(dto.taxFields)) : { fields: [] },
                headerText: dto.headerText,
                footerText: dto.footerText,
                showQrCode: dto.showQrCode ?? true,
                currency: dto.currency || 'INR',
                locale: dto.locale || 'en-IN',
                isDefault: dto.isDefault ?? false,
            },
            include: {
                InvoiceCustomField: true
            }
        });

        // Create custom fields if provided
        if (dto.customFields && dto.customFields.length > 0) {
            await this.prisma.invoiceCustomField.createMany({
                data: dto.customFields.map(field => ({
                    templateId: template.id,
                    fieldName: field.fieldName,
                    fieldValue: field.fieldValue,
                    displayOrder: field.displayOrder
                }))
            });
        }

        return this.getTemplateById(template.id);
    }

    async getTemplates(vendorId: string) {
        return this.prisma.invoiceTemplate.findMany({
            where: { vendorId, isActive: true },
            include: {
                InvoiceCustomField: {
                    orderBy: { displayOrder: 'asc' }
                }
            },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }

    async getTemplateById(templateId: string) {
        const template = await this.prisma.invoiceTemplate.findUnique({
            where: { id: templateId },
            include: {
                InvoiceCustomField: {
                    orderBy: { displayOrder: 'asc' }
                },
                Vendor: {
                    select: {
                        id: true,
                        name: true,
                        storeName: true
                    }
                }
            }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return template;
    }

    async updateTemplate(templateId: string, vendorId: string, dto: UpdateInvoiceTemplateDto) {
        const template = await this.prisma.invoiceTemplate.findFirst({
            where: { id: templateId, vendorId }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.invoiceTemplate.updateMany({
                where: { vendorId, isDefault: true, id: { not: templateId } },
                data: { isDefault: false }
            });
        }

        // Update template
        const updated = await this.prisma.invoiceTemplate.update({
            where: { id: templateId },
            data: {
                templateName: dto.templateName,
                logoUrl: dto.logoUrl,
                companyName: dto.companyName,
                address: dto.address,
                phone: dto.phone,
                email: dto.email,
                gstin: dto.gstin,
                taxFields: dto.taxFields ? JSON.parse(JSON.stringify(dto.taxFields)) : undefined,
                headerText: dto.headerText,
                footerText: dto.footerText,
                showQrCode: dto.showQrCode,
                currency: dto.currency,
                locale: dto.locale,
                isDefault: dto.isDefault,
            }
        });

        // Update custom fields if provided
        if (dto.customFields) {
            // Delete existing custom fields
            await this.prisma.invoiceCustomField.deleteMany({
                where: { templateId }
            });

            // Create new custom fields
            if (dto.customFields.length > 0) {
                await this.prisma.invoiceCustomField.createMany({
                    data: dto.customFields.map(field => ({
                        templateId,
                        fieldName: field.fieldName,
                        fieldValue: field.fieldValue,
                        displayOrder: field.displayOrder
                    }))
                });
            }
        }

        return this.getTemplateById(templateId);
    }

    async deleteTemplate(templateId: string, vendorId: string) {
        const template = await this.prisma.invoiceTemplate.findFirst({
            where: { id: templateId, vendorId }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (template.isDefault) {
            throw new BadRequestException('Cannot delete default template');
        }

        await this.prisma.invoiceTemplate.update({
            where: { id: templateId },
            data: { isActive: false }
        });

        return { message: 'Template deleted successfully' };
    }

    async setDefaultTemplate(templateId: string, vendorId: string) {
        const template = await this.prisma.invoiceTemplate.findFirst({
            where: { id: templateId, vendorId }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        // Unset all other defaults
        await this.prisma.invoiceTemplate.updateMany({
            where: { vendorId, isDefault: true },
            data: { isDefault: false }
        });

        // Set this as default
        await this.prisma.invoiceTemplate.update({
            where: { id: templateId },
            data: { isDefault: true }
        });

        return { message: 'Default template set successfully' };
    }

    async duplicateTemplate(templateId: string, vendorId: string) {
        const template = await this.prisma.invoiceTemplate.findFirst({
            where: { id: templateId, vendorId },
            include: {
                InvoiceCustomField: true
            }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const newTemplate = await this.prisma.invoiceTemplate.create({
            data: {
                vendorId,
                templateName: `${template.templateName} (Copy)`,
                logoUrl: template.logoUrl,
                companyName: template.companyName,
                address: template.address,
                phone: template.phone,
                email: template.email,
                gstin: template.gstin,
                taxFields: template.taxFields === null ? undefined : (template.taxFields as Prisma.JsonValue) || undefined,
                headerText: template.headerText,
                footerText: template.footerText,
                showQrCode: template.showQrCode,
                currency: template.currency,
                locale: template.locale,
                isDefault: false,
            }
        });

        // Copy custom fields
        if (template.InvoiceCustomField.length > 0) {
            await this.prisma.invoiceCustomField.createMany({
                data: template.InvoiceCustomField.map(field => ({
                    templateId: newTemplate.id,
                    fieldName: field.fieldName,
                    fieldValue: field.fieldValue,
                    displayOrder: field.displayOrder
                }))
            });
        }

        return this.getTemplateById(newTemplate.id);
    }

    async getDefaultTemplate(vendorId: string) {
        const template = await this.prisma.invoiceTemplate.findFirst({
            where: { vendorId, isDefault: true, isActive: true },
            include: {
                InvoiceCustomField: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        });

        return template;
    }
}

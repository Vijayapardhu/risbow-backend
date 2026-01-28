import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, VendorRole } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { NotificationsService } from '../shared/notifications.service';

/**
 * Wholesalers Service
 * 
 * Separate wholesaler functionality from vendor functionality.
 * Wholesalers:
 * - Sell in bulk to vendors only
 * - Set MOQ (Minimum Order Quantity)
 * - Manage wholesale pricing tiers
 * - Access vendor-only marketplace
 */
@Injectable()
export class WholesalersService {
    private readonly logger = new Logger(WholesalersService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) {}

    /**
     * Register a new wholesaler
     */
    async registerWholesaler(dto: {
        name: string;
        mobile: string;
        email?: string;
        gstNumber?: string;
        pan?: string;
        bankAccount?: string;
        bankIfsc?: string;
    }) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { mobile: dto.mobile },
        });

        if (existingUser) {
            throw new BadRequestException('User with this mobile already exists');
        }

        // Create user with WHOLESALER role
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                role: UserRole.WHOLESALER,
                status: 'ACTIVE',
            },
        });

        // Create vendor record with WHOLESALER role
        const vendor = await this.prisma.vendor.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                role: VendorRole.WHOLESALER,
                kycStatus: 'PENDING',
                tier: 'BASIC',
                gstNumber: dto.gstNumber,
                isGstVerified: !!dto.gstNumber,
                kycDocuments: {
                    pan: dto.pan,
                    bankAccount: dto.bankAccount,
                    bankIfsc: dto.bankIfsc,
                },
            },
        });

        this.logger.log(`Wholesaler registered: ${vendor.id} (user: ${user.id})`);
        return { user, vendor };
    }

    /**
     * Get wholesaler dashboard stats
     */
    async getWholesalerDashboard(wholesalerId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: wholesalerId, role: VendorRole.WHOLESALER },
            include: {
                products: {
                    where: { isWholesale: true },
                    select: { id: true, title: true, stock: true, price: true },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Wholesaler not found');
        }

        // Get bulk orders (orders from vendors)
        const bulkOrders = await this.prisma.order.findMany({
            where: {
                items: {
                    path: ['$[*].vendorId'],
                    array_contains: wholesalerId,
                },
            },
            include: {
                user: {
                    select: { id: true, name: true, role: true },
                },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
        });

        // Filter orders from vendors only (not customers)
        const vendorOrders = bulkOrders.filter(
            order => order.user?.role === UserRole.VENDOR
        );

        const totalProducts = vendor.products.length;
        const totalStock = vendor.products.reduce((sum, p) => sum + p.stock, 0);
        const lowStockProducts = vendor.products.filter(p => p.stock < 10).length;

        return {
            wholesalerId: vendor.id,
            name: vendor.name,
            stats: {
                totalProducts,
                totalStock,
                lowStockProducts,
                pendingOrders: vendorOrders.filter(o => o.status === 'PENDING').length,
                totalOrders: vendorOrders.length,
            },
            recentOrders: vendorOrders.slice(0, 5),
        };
    }

    /**
     * Bulk upload products for wholesaler
     */
    async bulkUploadProducts(wholesalerId: string, fileBuffer: Buffer) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: wholesalerId, role: VendorRole.WHOLESALER },
        });

        if (!vendor) {
            throw new NotFoundException('Wholesaler not found');
        }

        let records: any[];
        try {
            records = parse(fileBuffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
            });
        } catch (e) {
            throw new BadRequestException('Invalid CSV format: ' + e.message);
        }

        const results = {
            total: records.length,
            imported: 0,
            failed: 0,
            errors: [] as string[],
        };

        const validProducts = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNum = i + 1;

            try {
                // Validate required fields
                if (!row.title || !row.price || !row.stock) {
                    results.errors.push(`Row ${rowNum}: Missing required fields (title, price, stock)`);
                    results.failed++;
                    continue;
                }

                const price = parseInt(row.price, 10);
                const stock = parseInt(row.stock, 10);
                const moq = parseInt(row.moq || '1', 10);
                const wholesalePrice = parseInt(row.wholesalePrice || row.price, 10);

                if (isNaN(price) || isNaN(stock) || isNaN(moq)) {
                    results.errors.push(`Row ${rowNum}: Invalid numeric values`);
                    results.failed++;
                    continue;
                }

                // Check SKU uniqueness
                if (row.sku) {
                    const existing = await this.prisma.product.findUnique({
                        where: { sku: row.sku },
                    });
                    if (existing) {
                        results.errors.push(`Row ${rowNum}: SKU '${row.sku}' already exists`);
                        results.failed++;
                        continue;
                    }
                }

                validProducts.push({
                    vendorId: wholesalerId,
                    title: row.title,
                    description: row.description || '',
                    price: price * 100, // Convert to paise
                    offerPrice: row.offerPrice ? parseInt(row.offerPrice, 10) * 100 : price * 100,
                    wholesalePrice: wholesalePrice * 100,
                    stock: stock,
                    moq: moq,
                    isWholesale: true,
                    categoryId: row.categoryId || '', // Should be validated
                    sku: row.sku || `WH-${Date.now()}-${i}`,
                    brandName: row.brandName || vendor.name,
                    isActive: false, // Require approval
                    images: [],
                    tags: ['WHOLESALE'],
                });
            } catch (error) {
                results.errors.push(`Row ${rowNum}: ${error.message}`);
                results.failed++;
            }
        }

        // Batch insert
        if (validProducts.length > 0) {
            await this.prisma.product.createMany({
                data: validProducts,
                skipDuplicates: true,
            });
            results.imported = validProducts.length;
        }

        return results;
    }

    /**
     * Set MOQ (Minimum Order Quantity) for a product
     */
    async setProductMOQ(wholesalerId: string, productId: string, moq: number) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                vendorId: wholesalerId,
                isWholesale: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Wholesale product not found');
        }

        if (moq < 1) {
            throw new BadRequestException('MOQ must be at least 1');
        }

        return await this.prisma.product.update({
            where: { id: productId },
            data: { moq },
        });
    }

    /**
     * Set wholesale pricing tiers for a product
     */
    async setWholesalePricingTiers(
        wholesalerId: string,
        productId: string,
        tiers: Array<{ minQty: number; pricePerUnit: number }>,
    ) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                vendorId: wholesalerId,
                isWholesale: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Wholesale product not found');
        }

        // Validate tiers (should be sorted by minQty ascending)
        const sortedTiers = tiers.sort((a, b) => a.minQty - b.minQty);
        for (let i = 0; i < sortedTiers.length - 1; i++) {
            if (sortedTiers[i].minQty >= sortedTiers[i + 1].minQty) {
                throw new BadRequestException('Tiers must have increasing minQty values');
            }
        }

        // Store tiers in product metadata or a separate table
        // For now, we'll store in a JSON field or use the existing wholesalePrice
        // In production, you might want a separate WholesalePricingTier table

        return await this.prisma.product.update({
            where: { id: productId },
            data: {
                // Store tiers in metadata or use existing fields
                // This is a simplified approach - in production, use a dedicated table
                wholesalePrice: sortedTiers[0].pricePerUnit * 100, // Use first tier as default
            },
        });
    }

    /**
     * Get vendor inquiries for wholesaler products
     */
    async getVendorInquiries(wholesalerId: string) {
        // Wholesaler = Vendor table id (vendorId in Product)
        const inquiries = await (this.prisma as any).vendorInquiry.findMany({
            where: { wholesalerVendorId: wholesalerId },
            orderBy: { createdAt: 'desc' },
            include: {
                requester: { select: { id: true, name: true, mobile: true, email: true } },
                product: { select: { id: true, title: true, moq: true, wholesalePrice: true } },
            },
            take: 50,
        });

        return { inquiries };
    }

    async createInquiry(requesterUserId: string, dto: { productId: string; quantity: number; message?: string }) {
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            select: { id: true, vendorId: true, isWholesale: true, moq: true, isActive: true, title: true },
        });

        if (!product || !product.isActive) {
            throw new NotFoundException('Product not found');
        }
        if (!product.isWholesale) {
            throw new BadRequestException('Product is not a wholesale product');
        }
        if (dto.quantity < (product.moq || 1)) {
            throw new BadRequestException(`Quantity must be >= MOQ (${product.moq || 1})`);
        }

        const inquiry = await (this.prisma as any).vendorInquiry.create({
            data: {
                wholesalerVendorId: product.vendorId,
                requesterUserId,
                productId: dto.productId,
                quantity: dto.quantity,
                message: dto.message,
                status: 'PENDING',
            },
            include: {
                product: { select: { title: true } },
                requester: { select: { name: true, mobile: true } },
            },
        });

        // Send notification to wholesaler
        try {
            const wholesalerUser = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { id: product.vendorId },
                    ],
                    role: { in: ['WHOLESALER', 'VENDOR'] },
                },
                select: { id: true },
            });

            if (wholesalerUser) {
                await this.notificationsService.createNotification(
                    wholesalerUser.id,
                    'New Wholesale Inquiry',
                    `${inquiry.requester.name || inquiry.requester.mobile} inquired about ${product.title} (Qty: ${dto.quantity})`,
                    'INQUIRY',
                    'INDIVIDUAL',
                );
            }
        } catch (error) {
            this.logger.warn(`Failed to send notification for inquiry ${inquiry.id}: ${error.message}`);
        }

        return inquiry;
    }

    async respondToInquiry(wholesalerVendorId: string, inquiryId: string, dto: { status: 'RESPONDED' | 'ACCEPTED' | 'REJECTED'; response?: string }) {
        const inquiry = await (this.prisma as any).vendorInquiry.findFirst({
            where: { id: inquiryId, wholesalerVendorId },
        });
        if (!inquiry) throw new NotFoundException('Inquiry not found');

        return (this.prisma as any).vendorInquiry.update({
            where: { id: inquiryId },
            data: {
                status: dto.status,
                response: dto.response,
                respondedAt: new Date(),
            },
        });
    }

    // Vendor buyer accepts/rejects an inquiry response (simple status transition)
    async acceptInquiry(requesterUserId: string, inquiryId: string) {
        const inquiry = await (this.prisma as any).vendorInquiry.findFirst({
            where: { id: inquiryId, requesterUserId },
        });
        if (!inquiry) throw new NotFoundException('Inquiry not found');
        return (this.prisma as any).vendorInquiry.update({
            where: { id: inquiryId },
            data: { status: 'ACCEPTED' },
        });
    }

    async rejectInquiry(requesterUserId: string, inquiryId: string) {
        const inquiry = await (this.prisma as any).vendorInquiry.findFirst({
            where: { id: inquiryId, requesterUserId },
        });
        if (!inquiry) throw new NotFoundException('Inquiry not found');
        return (this.prisma as any).vendorInquiry.update({
            where: { id: inquiryId },
            data: { status: 'REJECTED' },
        });
    }

    async getMyInquiries(requesterUserId: string) {
        const inquiries = await (this.prisma as any).vendorInquiry.findMany({
            where: { requesterUserId },
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { id: true, title: true, moq: true, wholesalePrice: true } },
                wholesaler: { select: { id: true, name: true, mobile: true, storeName: true } },
            },
            take: 50,
        });
        return { inquiries };
    }

    /**
     * Get wholesaler analytics
     */
    async getWholesalerAnalytics(wholesalerId: string, period: '7d' | '30d' | '90d' = '30d') {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: since },
                items: {
                    path: ['$[*].vendorId'],
                    array_contains: wholesalerId,
                },
                user: {
                    role: UserRole.VENDOR,
                },
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });

        const totalRevenue = orders.reduce((sum, order) => {
            const items = Array.isArray(order.items) ? (order.items as any[]) : [];
            const orderTotal = items.reduce((itemSum: number, item: any) => {
                return itemSum + (Number(item.price || 0) * Number(item.quantity || 0));
            }, 0);
            return sum + orderTotal;
        }, 0);

        const uniqueVendors = new Set(orders.map(o => o.userId)).size;

        return {
            period,
            totalOrders: orders.length,
            totalRevenue: totalRevenue / 100, // Convert to ₹
            uniqueVendors,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length / 100 : 0,
        };
    }
}

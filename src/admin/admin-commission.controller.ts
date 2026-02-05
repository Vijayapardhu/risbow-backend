import { Controller, Get, Post, Body, UseGuards, Query, Patch, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCategoryCommissionDto } from './dto/commission.dto';
import { AdminService } from './admin.service';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCommissionRuleDto, UpdateCommissionRuleDto, ListCommissionRulesQueryDto } from './dto/commission-rule.dto';
import { CommissionService } from '../common/commission.service';

@ApiTags('Admin Commission')
@Controller('admin/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')  // SECURITY: Financial rules require SUPER_ADMIN only
@ApiBearerAuth()
export class AdminCommissionController {
    constructor(
        private prisma: PrismaService,
        private adminService: AdminService,
        private commissionService: CommissionService
    ) { }

    @Get('categories')
    @ApiOperation({ summary: 'List all category commissions' })
    async listCategoryCommissions() {
        return this.prisma.categoryCommission.findMany({
            include: { Category: true }
        });
    }

    @Post('category')
    @Throttle({ default: { limit: 5, ttl: 60000 } })  // SECURITY: Rate limit financial changes
    @ApiOperation({ summary: 'Set commission for a category' })
    async setCategoryCommission(@Body() dto: UpdateCategoryCommissionDto) {
        return this.prisma.categoryCommission.upsert({
            where: { categoryId: dto.categoryId },
            update: {
                commissionRate: dto.commissionRate,
                isActive: dto.isActive ?? true
            },
            create: {
                id: randomUUID(),
                commissionRate: dto.commissionRate,
                isActive: dto.isActive ?? true,
                Category: { connect: { id: dto.categoryId } }
            }
        });
    }

    @Get('settlements')
    @ApiOperation({ summary: 'List recent settlements' })
    async listSettlements(@Query('status') status?: any) {
        return this.prisma.orderSettlement.findMany({
            where: status ? { status } : {},
            orderBy: { createdAt: 'desc' },
            include: {
                Order: { select: { totalAmount: true, createdAt: true } },
                Vendor: { select: { name: true, storeName: true } }
            },
            take: 50
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get revenue and platform stats' })
    async getRevenueStats() {
        const stats = await this.prisma.orderFinancialSnapshot.aggregate({
            _sum: {
                subtotal: true,
                platformEarnings: true,
                vendorEarnings: true
            }
        });

        return {
            totalGmv: stats._sum.subtotal || 0,
            platformRevenue: stats._sum.platformEarnings || 0,
            vendorTotal: stats._sum.vendorEarnings || 0
        };
    }

    @Get('preview')
    @ApiOperation({ summary: 'Preview commission for a product/vendor/category' })
    async previewCommission(
        @Query('price') price?: string,
        @Query('categoryId') categoryId?: string,
        @Query('vendorId') vendorId?: string,
        @Query('productId') productId?: string,
    ) {
        const amount = price ? Number(price) : NaN;
        if (!price || Number.isNaN(amount) || amount <= 0) {
            throw new BadRequestException('price query param (paise) is required');
        }

        return this.commissionService.getCommissionPreview({
            price: amount,
            categoryId,
            vendorId,
            productId,
        });
    }

    @Get('rules')
    @ApiOperation({ summary: 'List commission rules' })
    async listCommissionRules(@Query() query: ListCommissionRulesQueryDto) {
        const where: any = {};
        if (query.scope) where.scope = query.scope;
        if (query.isActive !== undefined) where.isActive = query.isActive;
        if (query.vendorId) where.vendorId = query.vendorId;
        if (query.categoryId) where.categoryId = query.categoryId;
        if (query.productId) where.productId = query.productId;

        return this.prisma.commissionRule.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                Vendor: { select: { name: true, storeName: true } },
                Category: { select: { name: true } },
                Product: { select: { title: true, name: true } },
            },
        });
    }

    @Post('rules')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Create commission rule' })
    async createCommissionRule(@Body() dto: CreateCommissionRuleDto) {
        return this.prisma.commissionRule.create({
            data: {
                id: randomUUID(),
                scope: dto.scope,
                commissionRate: dto.commissionRate,
                isActive: dto.isActive ?? true,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
                vendorId: dto.vendorId,
                categoryId: dto.categoryId,
                productId: dto.productId,
                reason: dto.reason,
            },
        });
    }

    @Patch('rules')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Update commission rule' })
    async updateCommissionRule(@Body() dto: UpdateCommissionRuleDto) {
        return this.prisma.commissionRule.update({
            where: { id: dto.id },
            data: {
                scope: dto.scope,
                commissionRate: dto.commissionRate,
                isActive: dto.isActive,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
                vendorId: dto.vendorId,
                categoryId: dto.categoryId,
                productId: dto.productId,
                reason: dto.reason,
            },
        });
    }
}

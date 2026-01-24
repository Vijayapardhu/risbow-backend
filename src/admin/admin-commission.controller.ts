import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCategoryCommissionDto } from './dto/commission.dto';
import { AdminService } from './admin.service';
import { randomUUID } from 'crypto';
// import { RolesGuard } from '../auth/guards/roles.guard'; // Assume these exist
// import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin Commission')
@Controller('admin/commissions')
// @UseGuards(RolesGuard)
// @Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminCommissionController {
    constructor(
        private prisma: PrismaService,
        private adminService: AdminService
    ) { }

    @Get('categories')
    @ApiOperation({ summary: 'List all category commissions' })
    async listCategoryCommissions() {
        return this.prisma.categoryCommission.findMany({
            include: { Category: true }
        });
    }

    @Post('category')
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
}

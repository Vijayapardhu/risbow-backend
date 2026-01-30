import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, MembershipTier, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSubscriptionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() query: { page?: number; limit?: number; tier?: MembershipTier; search?: string }) {
    const { page = 1, limit = 10, tier, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorMembershipWhereInput = {};
    if (tier) where.tier = tier;
    if (search) {
      where.vendor = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.vendorMembership.count({ where }),
      this.prisma.vendorMembership.findMany({
        where,
        skip,
        take: Number(limit),
        include: { vendor: { select: { id: true, name: true, email: true, mobile: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Get('stats')
  async getStats() {
    const [
      total,
      free,
      basic,
      pro,
      premium,
      elite,
      totalRevenue
    ] = await Promise.all([
      this.prisma.vendorMembership.count(),
      this.prisma.vendorMembership.count({ where: { tier: MembershipTier.FREE } }),
      this.prisma.vendorMembership.count({ where: { tier: MembershipTier.BASIC } }),
      this.prisma.vendorMembership.count({ where: { tier: MembershipTier.PRO } }),
      this.prisma.vendorMembership.count({ where: { tier: MembershipTier.PREMIUM } }),
      this.prisma.vendorMembership.count({ where: { tier: MembershipTier.ELITE } }),
      this.prisma.vendorMembership.aggregate({ _sum: { price: true } })
    ]);

    return {
      total,
      byTier: { free, basic, pro, premium, elite },
      totalRevenue: totalRevenue._sum.price || 0
    };
  }

  @Get('plans')
  async getPlans() {
    // Return predefined membership plans configuration
    return [
      { tier: MembershipTier.FREE, price: 0, skuLimit: 10, commissionRate: 0.15, features: ['Basic listing', '3 images per product'] },
      { tier: MembershipTier.BASIC, price: 999, skuLimit: 50, commissionRate: 0.12, features: ['Priority listing', '5 images per product', 'Analytics dashboard'] },
      { tier: MembershipTier.PRO, price: 2999, skuLimit: 200, commissionRate: 0.10, features: ['Featured listing', '10 images per product', 'Advanced analytics', 'Priority support'] },
      { tier: MembershipTier.PREMIUM, price: 7999, skuLimit: 500, commissionRate: 0.08, features: ['Premium placement', 'Unlimited images', 'Dedicated account manager', 'Custom branding'] },
      { tier: MembershipTier.ELITE, price: 19999, skuLimit: 2000, commissionRate: 0.05, features: ['Elite placement', 'Unlimited everything', 'White glove service', 'API access'] }
    ];
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const subscription = await this.prisma.vendorMembership.findUnique({
      where: { id },
      include: { vendor: true }
    });

    if (!subscription) throw new Error('Subscription not found');
    return subscription;
  }

  @Post(':id/extend')
  async extendSubscription(@Param('id') id: string, @Body() dto: { months: number }) {
    const subscription = await this.prisma.vendorMembership.findUnique({ where: { id } });
    if (!subscription) throw new Error('Subscription not found');

    const currentEndDate = subscription.endDate || new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + dto.months);

    return this.prisma.vendorMembership.update({
      where: { id },
      data: { endDate: newEndDate, isActive: true }
    });
  }

  @Post(':id/cancel')
  async cancelSubscription(@Param('id') id: string) {
    return this.prisma.vendorMembership.update({
      where: { id },
      data: { isActive: false, autoRenew: false }
    });
  }
}

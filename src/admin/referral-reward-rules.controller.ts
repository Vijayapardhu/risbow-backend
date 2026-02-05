import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLogService } from '../audit/audit.service';
import { CreateReferralRewardRuleDto, UpdateReferralRewardRuleDto } from './dto/referral-reward-rule.dto';

@ApiTags('Admin Referral Rewards')
@ApiBearerAuth()
@Controller('admin/referrals/reward-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')  // SECURITY: Financial rules require SUPER_ADMIN only
export class ReferralRewardRulesController {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List referral reward slab rules' })
  async list(@Query('activeOnly') activeOnly?: string) {
    const where: any = {};
    if (activeOnly === 'true' || activeOnly === '1') where.isActive = true;
    return this.prisma.referralRewardRule.findMany({ where, orderBy: { minOrderPaise: 'asc' } });
  }

  @Post()
  @ApiOperation({ summary: 'Create referral reward slab rule' })
  async create(@Request() req, @Body() dto: CreateReferralRewardRuleDto) {
    // Overlap validation (active window + range)
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const overlaps = await this.prisma.referralRewardRule.findFirst({
      where: {
        isActive: true,
        // time window overlap
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        // range overlap
        minOrderPaise: { lt: dto.maxOrderPaise ?? 2147483647 },
        AND: [{ maxOrderPaise: null }, { maxOrderPaise: { gt: dto.minOrderPaise } }],
      } as any,
      select: { id: true },
    });
    if (overlaps) {
      throw new Error('Overlapping slab rule exists for the active window');
    }

    const created = await this.prisma.referralRewardRule.create({
      data: {
        minOrderPaise: dto.minOrderPaise,
        maxOrderPaise: dto.maxOrderPaise ?? null,
        coinsInviter: dto.coinsInviter,
        coinsInvitee: dto.coinsInvitee,
        isActive: dto.isActive ?? true,
        effectiveFrom,
        effectiveTo,
        setByAdminId: req.user?.id,
      } as any,
    });

    await this.audit.logAdminAction(req.user?.id, 'REFERRAL_RULE_CREATE', 'ReferralRewardRule', created.id, dto as any);
    return created;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update referral reward slab rule' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateReferralRewardRuleDto) {
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined;
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : undefined;

    const updated = await this.prisma.referralRewardRule.update({
      where: { id },
      data: {
        minOrderPaise: dto.minOrderPaise,
        maxOrderPaise: dto.maxOrderPaise ?? null,
        coinsInviter: dto.coinsInviter,
        coinsInvitee: dto.coinsInvitee,
        isActive: dto.isActive,
        effectiveFrom,
        effectiveTo,
      } as any,
    });

    await this.audit.logAdminAction(req.user?.id, 'REFERRAL_RULE_UPDATE', 'ReferralRewardRule', id, dto as any);
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete referral reward slab rule' })
  async delete(@Request() req, @Param('id') id: string) {
    // Check if rule has been used in any grants
    const grantCount = await this.prisma.referralRewardGrant.count({
      where: { ruleId: id },
    });

    if (grantCount > 0) {
      throw new Error(
        `Cannot delete rule: ${grantCount} reward grants are associated with this rule. Consider deactivating instead.`,
      );
    }

    const deleted = await this.prisma.referralRewardRule.delete({
      where: { id },
    });

    await this.audit.logAdminAction(req.user?.id, 'REFERRAL_RULE_DELETE', 'ReferralRewardRule', id, {} as any);
    return { success: true, message: 'Rule deleted successfully' };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get referral program analytics' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Total referrals created
    const totalReferrals = await this.prisma.referralTracking.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    // Completed referrals (first order placed)
    const completedReferrals = await this.prisma.referralTracking.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: start, lte: end },
      },
    });

    // Total rewards distributed
    const rewardGrants = await this.prisma.referralRewardGrant.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { coinsInviterAtAward: true, coinsInviteeAtAward: true },
    });

    const totalRewardsDistributed = rewardGrants.reduce(
      (sum, grant) => sum + grant.coinsInviterAtAward + grant.coinsInviteeAtAward,
      0,
    );

    // Conversion rate
    const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

    // Top performers stats
    const topReferrersCount = await this.prisma.referralTracking.groupBy({
      by: ['referrerId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { referrerId: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: 10,
    });

    // Daily breakdown
    const dailyStats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as referrals,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM "ReferralTracking"
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return {
      summary: {
        totalReferrals,
        completedReferrals,
        pendingReferrals: totalReferrals - completedReferrals,
        totalRewardsDistributed,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        topReferrersCount: topReferrersCount.length,
      },
      dailyStats,
      topReferrersPreview: topReferrersCount.slice(0, 5),
    };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top referrers leaderboard' })
  async getLeaderboard(
    @Query('period') period?: 'all' | '30d' | '7d',
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    let startDate: Date | undefined;

    if (period === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const leaderboard = await this.prisma.referralTracking.groupBy({
      by: ['referrerId'],
      where: startDate ? { createdAt: { gte: startDate } } : undefined,
      _count: { referrerId: true },
      _sum: { coinsAwarded: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: limit,
    });

    // Get user details for each referrer
    const referrerIds = leaderboard.map((entry) => entry.referrerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: referrerIds } },
      select: { id: true, name: true, email: true, mobile: true, referralCode: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return leaderboard.map((entry, index) => {
      const user = userMap.get(entry.referrerId);
      return {
        rank: index + 1,
        userId: entry.referrerId,
        name: user?.name || 'Unknown User',
        email: user?.email,
        mobile: user?.mobile,
        referralCode: user?.referralCode,
        totalReferrals: entry._count.referrerId,
        totalCoinsEarned: entry._sum.coinsAwarded || 0,
      };
    });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get referral reward transaction history' })
  async getTransactions(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) {
      where.OR = [{ inviterUserId: userId }, { inviteeUserId: userId }];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.referralRewardGrant.findMany({
        where,
        include: {
          User_ReferralRewardGrant_inviterUserIdToUser: {
            select: { id: true, name: true, email: true, mobile: true },
          },
          User_ReferralRewardGrant_inviteeUserIdToUser: {
            select: { id: true, name: true, email: true, mobile: true },
          },
          Order: {
            select: { id: true, orderNumber: true, totalAmount: true, status: true },
          },
          ReferralRewardRule: {
            select: { id: true, minOrderPaise: true, maxOrderPaise: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referralRewardGrant.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        orderNumber: t.Order.orderNumber,
        orderValue: t.orderValuePaiseAtAward / 100,
        inviter: {
          id: t.inviterUserId,
          name: t.User_ReferralRewardGrant_inviterUserIdToUser.name,
          email: t.User_ReferralRewardGrant_inviterUserIdToUser.email,
          mobile: t.User_ReferralRewardGrant_inviterUserIdToUser.mobile,
          coinsAwarded: t.coinsInviterAtAward,
        },
        invitee: {
          id: t.inviteeUserId,
          name: t.User_ReferralRewardGrant_inviteeUserIdToUser.name,
          email: t.User_ReferralRewardGrant_inviteeUserIdToUser.email,
          mobile: t.User_ReferralRewardGrant_inviteeUserIdToUser.mobile,
          coinsAwarded: t.coinsInviteeAtAward,
        },
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}


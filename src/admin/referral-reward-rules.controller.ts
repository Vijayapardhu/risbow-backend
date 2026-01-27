import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
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
@Roles('ADMIN', 'SUPER_ADMIN')
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
}


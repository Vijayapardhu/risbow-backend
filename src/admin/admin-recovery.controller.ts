import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../shared/notifications.service';
import { TelecallerService } from '../telecaller/telecaller.service';
import { CheckoutRecoveryStatus } from '@prisma/client';

@ApiTags('Admin Recovery')
@ApiBearerAuth()
@Controller('admin/recovery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminRecoveryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly telecallerService: TelecallerService,
  ) {}

  @Get('carts')
  @ApiOperation({ summary: 'Admin: List abandoned checkouts (recovery carts)' })
  async listCarts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { is: { mobile: { contains: search, mode: 'insensitive' } } } },
        { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.abandonedCheckout.count({ where }),
      this.prisma.abandonedCheckout.findMany({
        where,
        skip,
        take,
        orderBy: { abandonedAt: 'desc' },
        include: { user: { select: { id: true, name: true, mobile: true, email: true } }, agent: { select: { id: true, name: true } } },
      }),
    ]);

    const data = rows.map((lead) => {
      const finance = lead.financeSnapshot as any;
      const items = lead.cartSnapshot as any;
      return {
        id: lead.id,
        userId: lead.userId,
        userName: lead.user?.name || (lead.guestInfo as any)?.name || 'Guest',
        userEmail: lead.user?.email,
        userPhone: lead.user?.mobile || (lead.guestInfo as any)?.phone,
        cartValue: finance?.totalAmount || 0,
        items: Array.isArray(items) ? items.map((i) => ({ productId: i.productId, productName: i.title || i.name || i.productId, quantity: i.quantity || 1 })) : [],
        abandonedAt: lead.abandonedAt,
        lastNotifiedAt: (lead.metadata as any)?.lastNotifiedAt,
        recoveryStatus: lead.status,
        recoveryChannel: (lead.metadata as any)?.recoveryChannel,
        assignedTo: lead.agent ? { id: lead.agent.id, name: lead.agent.name } : null,
      };
    });

    return {
      data,
      meta: { total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Admin: Recovery analytics' })
  async analytics(@Query('period') period: string = '30d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalAbandoned, recovered, totalValueAgg, recoveredValueAgg] = await Promise.all([
      this.prisma.abandonedCheckout.count({ where: { abandonedAt: { gte: since } } }),
      this.prisma.abandonedCheckout.count({ where: { abandonedAt: { gte: since }, status: CheckoutRecoveryStatus.CONVERTED } }),
      this.prisma.abandonedCheckout.findMany({ where: { abandonedAt: { gte: since } }, select: { financeSnapshot: true } }),
      this.prisma.abandonedCheckout.findMany({ where: { abandonedAt: { gte: since }, status: CheckoutRecoveryStatus.CONVERTED }, select: { financeSnapshot: true } }),
    ]);

    const totalAbandonedValue = totalValueAgg.reduce((s, r) => s + (((r.financeSnapshot as any)?.totalAmount) || 0), 0);
    const recoveredValue = recoveredValueAgg.reduce((s, r) => s + (((r.financeSnapshot as any)?.totalAmount) || 0), 0);

    const recoveryRate = totalAbandoned > 0 ? Math.round((recovered / totalAbandoned) * 10000) / 100 : 0;

    return {
      totalAbandonedCarts: totalAbandoned,
      totalAbandonedValue,
      recoveredCarts: recovered,
      recoveredValue,
      recoveryRate,
      averageRecoveryTime: 0,
    };
  }

  @Post('carts/:id/assign')
  @ApiOperation({ summary: 'Admin: Assign a recovery cart to a telecaller' })
  async assign(@Param('id') id: string, @Body() body: { telecallerId: string }) {
    const lockedUntil = new Date();
    lockedUntil.setHours(lockedUntil.getHours() + 24);

    const updated = await this.prisma.abandonedCheckout.update({
      where: { id },
      data: { agentId: body.telecallerId, lockedUntil, status: CheckoutRecoveryStatus.ASSIGNED },
    });

    await this.telecallerService.logPerformance(body.telecallerId, 'ASSIGNED').catch(() => null);
    return updated;
  }

  @Post('carts/:id/status')
  @ApiOperation({ summary: 'Admin: Update recovery cart status and add follow-up note' })
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: CheckoutRecoveryStatus; notes?: string }) {
    const updated = await this.prisma.abandonedCheckout.update({
      where: { id },
      data: {
        status: body.status,
        metadata: { ...(await this.getMetadata(id)), lastStatusNote: body.notes, lastStatusAt: new Date().toISOString() },
      },
    });

    // Add followup note if present
    if (body.notes) {
      await this.prisma.checkoutFollowup.create({
        data: { checkoutId: id, agentId: req.user.id, note: body.notes },
      });
    }

    // Best-effort performance tracking if agent assigned
    if (updated.agentId) {
      const action = body.status === CheckoutRecoveryStatus.CONVERTED ? 'CONVERTED' : body.status === CheckoutRecoveryStatus.FOLLOW_UP ? 'CONTACTED' : body.status === CheckoutRecoveryStatus.DROPPED ? 'DROPPED' : null;
      if (action) await this.telecallerService.logPerformance(updated.agentId, action as any).catch(() => null);
    }

    return updated;
  }

  @Post('carts/:id/notify')
  @ApiOperation({ summary: 'Admin: Send a recovery notification to the user' })
  async notify(@Param('id') id: string) {
    const checkout = await this.prisma.abandonedCheckout.findUnique({ where: { id }, select: { userId: true, financeSnapshot: true, metadata: true } });
    if (!checkout?.userId) {
      return { queued: false, reason: 'No userId (guest checkout)' };
    }
    const value = ((checkout.financeSnapshot as any)?.totalAmount) || 0;
    await this.notifications.createNotification(checkout.userId, 'Complete your order', `You left items in your cart worth ₹${value}. Complete checkout now.`, 'RECOVERY', 'INDIVIDUAL');
    await this.prisma.abandonedCheckout.update({
      where: { id },
      data: { metadata: { ...(checkout.metadata as any || {}), lastNotifiedAt: new Date().toISOString(), recoveryChannel: 'PUSH' } },
    });
    return { queued: true };
  }

  private async getMetadata(id: string) {
    const row = await this.prisma.abandonedCheckout.findUnique({ where: { id }, select: { metadata: true } });
    return (row?.metadata as any) || {};
  }
}


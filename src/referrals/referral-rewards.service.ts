import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinsService } from '../coins/coins.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReferralRewardsService {
  private readonly logger = new Logger(ReferralRewardsService.name);

  constructor(private prisma: PrismaService, private coins: CoinsService) {}

  private getPaidStatuses(): OrderStatus[] {
    // Treat these as “paid/confirmed enough” for first order
    return [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
  }

  private computeOrderValuePaise(args: {
    order: any;
    payment?: any | null;
    snapshot?: any | null;
  }): number {
    // Prefer immutable snapshot if present (paise ints)
    if (args.snapshot) {
      const subtotal = Number(args.snapshot.subtotal || 0);
      const tax = Number(args.snapshot.taxAmount || 0);
      const ship = Number(args.snapshot.shippingAmount || 0);
      const discount = Number(args.snapshot.discountAmount || 0);
      return Math.max(0, subtotal + tax + ship - discount);
    }
    // Next: payment amount (paise)
    if (args.payment?.amount != null) return Number(args.payment.amount);
    // Fallback: assume order.totalAmount is rupees and convert to paise
    if (args.order?.totalAmount != null) return Number(args.order.totalAmount) * 100;
    return 0;
  }

  async awardForOrderIfEligible(orderId: string): Promise<{ awarded: boolean; reason?: string }> {
    const paidStatuses = this.getPaidStatuses();
    const now = new Date();

    // Must be in a “paid” state at time of awarding
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, financialSnapshot: true },
    });
    if (!order) return { awarded: false, reason: 'ORDER_NOT_FOUND' };

    if (!paidStatuses.includes(order.status)) return { awarded: false, reason: 'ORDER_NOT_PAID' };

    const invitee = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { id: true, referredBy: true },
    });
    if (!invitee?.referredBy) return { awarded: false, reason: 'NO_REFERRER' };

    // Only the invitee’s first paid order qualifies
    const firstPaid = await this.prisma.order.findFirst({
      where: { userId: invitee.id, status: { in: paidStatuses } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!firstPaid || firstPaid.id !== orderId) return { awarded: false, reason: 'NOT_FIRST_PAID_ORDER' };

    const orderValuePaise = this.computeOrderValuePaise({
      order,
      payment: order.payment,
      snapshot: order.financialSnapshot,
    });

    const rule = await this.prisma.referralRewardRule.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        minOrderPaise: { lte: orderValuePaise },
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
          { OR: [{ maxOrderPaise: null }, { maxOrderPaise: { gt: orderValuePaise } }] },
        ],
      } as any,
      orderBy: { minOrderPaise: 'desc' },
    });
    if (!rule) return { awarded: false, reason: 'NO_RULE_MATCH' };

    const referenceId = `referral:${orderId}`;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Idempotency: unique per order
        const existing = await tx.referralRewardGrant.findUnique({ where: { orderId } });
        if (existing) return;

        await tx.referralRewardGrant.create({
          data: {
            orderId,
            inviterUserId: invitee.referredBy,
            inviteeUserId: invitee.id,
            ruleId: rule.id,
            orderValuePaiseAtAward: orderValuePaise,
            coinsInviterAtAward: rule.coinsInviter,
            coinsInviteeAtAward: rule.coinsInvitee,
          } as any,
        });

        // Credit invitee + inviter atomically
        await this.coins.credit(invitee.id, rule.coinsInvitee, CoinSource.REFERRAL, referenceId, tx);
        await this.coins.credit(invitee.referredBy, rule.coinsInviter, CoinSource.REFERRAL, referenceId, tx);

        try {
          await tx.auditLog.create({
            data: {
              adminId: invitee.referredBy,
              entity: 'Order',
              entityId: orderId,
              action: 'REFERRAL_REWARD_GRANTED',
              details: {
                inviteeUserId: invitee.id,
                inviterUserId: invitee.referredBy,
                ruleId: rule.id,
                orderValuePaise,
                coinsInvitee: rule.coinsInvitee,
                coinsInviter: rule.coinsInviter,
              },
            } as any,
          });
        } catch {
          // never block awarding on audit failure
        }
      });
    } catch (e: any) {
      this.logger.error(`Referral award failed for order ${orderId}: ${e?.message || e}`);
      return { awarded: false, reason: 'AWARD_FAILED' };
    }

    return { awarded: true };
  }
}


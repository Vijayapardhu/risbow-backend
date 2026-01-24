
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStatus } from '@prisma/client';
import { BuyLaterService } from '../catalog/buy-later.service';
import { RecoveryService } from '../analytics/recovery.service';
import { CartAbandonmentService } from '../analytics/cart-abandonment.service';
import { RedisLockService } from './redis-lock.service';
import { RedisService } from '../shared/redis.service';
import { TelecallerService } from '../telecaller/telecaller.service';
import { VendorMembershipsService } from '../vendor-memberships/vendor-memberships.service';
import { CoinsService } from '../coins/coins.service';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(BuyLaterService) private buyLaterService: BuyLaterService,
        private recoveryService: RecoveryService,
        private cartAbandonmentService: CartAbandonmentService,
        private redisLock: RedisLockService,
        private redisService: RedisService,
        private telecallerService: TelecallerService,
        private vendorMembershipsService: VendorMembershipsService,
        private coinsService: CoinsService,
    ) { }

    // SRS FR-2: Check expiry every min -> EXPIRED if past endAt.
    @Cron(CronExpression.EVERY_MINUTE)
    async handleRoomExpiry() {
        // 🔐 P0 FIX: Use distributed lock to prevent concurrent execution
        await this.redisLock.withLock('cron:room-expiry', async () => {
            this.logger.debug('Checking for expired rooms...');

            const result = await this.prisma.room.updateMany({
                where: {
                    status: { in: [RoomStatus.LOCKED, RoomStatus.ACTIVE] },
                    endAt: { lt: new Date() }
                },
                data: {
                    status: RoomStatus.EXPIRED
                }
            });

            if (result.count > 0) {
                this.logger.log(`Expired ${result.count} rooms.`);
            }
        }, 60); // 1 minute lock TTL
    }

    // SRS FR-5: Expiry: 3 months cron notify (Simulated here by just logging or removing)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCoinExpiry() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:coin-expiry', async () => {
            this.logger.debug('Checking for expired coins...');
            const result = await this.coinsService.expireCoinsCron();
            this.logger.log(`Coin expiry check complete. Marked expired: ${result?.expired ?? 0}`);
        }, 300); // 5 minute lock TTL
    }

    // Buy Later Price Drop Check - runs every 30 minutes
    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleBuyLaterPriceDrops() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:buy-later-price-drops', async () => {
            this.logger.debug('Checking for buy later price drops...');

            try {
                if (this.buyLaterService) {
                    await this.buyLaterService.checkPriceDrops();
                    this.logger.log('Buy later price drop check completed successfully');
                } else {
                    this.logger.warn('BuyLaterService not available');
                }
            } catch (error) {
                this.logger.error(`Buy later price drop check failed: ${error.message}`);
            }
        }, 1800); // 30 minute lock TTL
    }
    // Checkout Recovery Processing - runs every 10 minutes
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleCheckoutRecovery() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:checkout-recovery', async () => {
            this.logger.debug('Starting checkout recovery cycle...');
            try {
                await this.recoveryService.processNewLeads();
                await this.recoveryService.escalateCheckouts();
                this.logger.log('Checkout recovery cycle completed');
            } catch (error) {
                this.logger.error(`Checkout recovery failed: ${error.message}`);
            }
        }, 600); // 10 minute lock TTL
    }

    // Cart Abandonment Detection - runs every 15 minutes
    @Cron('0 */15 * * * *')
    async handleCartAbandonment() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:cart-abandonment', async () => {
            this.logger.debug('Starting cart abandonment detection...');
            try {
                const count = await this.cartAbandonmentService.detectAbandonedCarts();
                this.logger.log(`Cart abandonment detection completed. Created ${count} new records.`);
            } catch (error) {
                this.logger.error(`Cart abandonment detection failed: ${error.message}`);
            }
        }, 900); // 15 minute lock TTL
    }

    // Stale Redis Reservation Cleanup - runs every 30 minutes
    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleStaleReservationCleanup() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:redis-reservation-cleanup', async () => {
            this.logger.debug('Starting stale Redis reservation cleanup...');
            try {
                // Get all reservation keys
                const reservationKeys = await this.redisService.keys('reservation:*').catch(() => []);

                let cleanedCount = 0;
                const reservationTTL = 900; // 15 minutes in seconds

                for (const key of reservationKeys) {
                    // Check if key exists and get its value
                    const value = await this.redisService.get(key);
                    
                    if (!value) {
                        // Key expired or doesn't exist, skip
                        continue;
                    }

                    // Extract productId and variantId from key
                    // Format: reservation:productId:variantId or reservation:productId:base
                    const parts = key.replace('reservation:', '').split(':');
                    const productId = parts[0];
                    const variantId = parts[1] !== 'base' ? parts[1] : undefined;

                    // Check if there's an active order for this product
                    // Look for orders in PENDING or PENDING_PAYMENT status that contain this product
                    const pendingOrders = await this.prisma.order.findMany({
                        where: {
                            status: { in: ['PENDING', 'PENDING_PAYMENT'] },
                        },
                        select: { id: true, items: true },
                    });

                    let hasActiveOrder = false;
                    for (const order of pendingOrders) {
                        const items = Array.isArray(order.items) ? order.items : [];
                        const orderHasProduct = items.some((item: any) => {
                            if (item.productId === productId) {
                                if (!variantId || item.variantId === variantId) {
                                    return true;
                                }
                            }
                            return false;
                        });

                        if (orderHasProduct) {
                            hasActiveOrder = true;
                            break;
                        }
                    }

                    if (!hasActiveOrder) {
                        // No active order, reservation is stale - release it
                        const reservedQty = parseInt(value, 10) || 0;
                        if (reservedQty > 0) {
                            await this.redisService.del(key);
                            cleanedCount++;
                            this.logger.debug(`Cleaned stale reservation: ${key} (qty: ${reservedQty})`);
                        }
                    }
                }

                if (cleanedCount > 0) {
                    this.logger.log(`Cleaned ${cleanedCount} stale Redis reservations`);
                } else {
                    this.logger.debug('No stale reservations found');
                }
            } catch (error) {
                this.logger.error(`Stale reservation cleanup failed: ${error.message}`);
            }
        }, 1800); // 30 minute lock TTL
    }

    // Telecaller Lock Expiration - runs every hour
    @Cron(CronExpression.EVERY_HOUR)
    async handleTelecallerLockExpiration() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:telecaller-lock-expiration', async () => {
            this.logger.debug('Checking for expired telecaller locks...');
            try {
                const releasedCount = await this.telecallerService.releaseExpiredLocks();
                if (releasedCount > 0) {
                    this.logger.log(`Released ${releasedCount} expired telecaller locks`);
                }
            } catch (error) {
                this.logger.error(`Telecaller lock expiration check failed: ${error.message}`);
            }
        }, 3600); // 1 hour lock TTL
    }

    // Vendor Membership Expiry Reminders - runs daily at 9 AM
    @Cron('0 9 * * *')
    async handleMembershipExpiryReminders() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:membership-expiry-reminders', async () => {
            this.logger.debug('Checking for expiring memberships...');
            try {
                const notifiedCount = await this.vendorMembershipsService.checkExpiringMemberships();
                if (notifiedCount > 0) {
                    this.logger.log(`Sent expiry reminders to ${notifiedCount} vendors`);
                }
            } catch (error) {
                this.logger.error(`Membership expiry reminder check failed: ${error.message}`);
            }
        }, 3600); // 1 hour lock TTL
    }

    // Vendor Membership Auto-Renewal - runs daily at midnight
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleMembershipAutoRenewals() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:membership-auto-renewals', async () => {
            this.logger.debug('Processing membership auto-renewals...');
            try {
                const renewedCount = await this.vendorMembershipsService.processAutoRenewals();
                if (renewedCount > 0) {
                    this.logger.log(`Auto-renewed ${renewedCount} memberships`);
                }
            } catch (error) {
                this.logger.error(`Membership auto-renewal failed: ${error.message}`);
            }
        }, 3600); // 1 hour lock TTL
    }
}

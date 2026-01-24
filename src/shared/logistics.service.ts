import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export interface TrackingWebhookPayload {
    awb: string;
    status: string; // DELIVERED, SHIPPED, OUT_FOR_DELIVERY, etc.
    courier: string;
    timestamp: string;
    location?: string;
}

@Injectable()
export class LogisticsService {
    private readonly logger = new Logger(LogisticsService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    /**
     * Processes a webhook from a courier partner (e.g., Shiprocket/Delhivery).
     */
    async handleTrackingWebhook(payload: TrackingWebhookPayload) {
        this.logger.log(`[LOGISTICS WEBHOOK] AWB: ${payload.awb} | Status: ${payload.status}`);

        const order = await this.prisma.order.findFirst({
            where: { awbNumber: payload.awb }
        });

        if (!order) {
            this.logger.warn(`Order not found for AWB ${payload.awb}`);
            return { success: false, message: 'Order mapping failed' };
        }

        const normalizedStatus = this.normalizeStatus(payload.status);

        if (normalizedStatus && normalizedStatus !== order.status) {
            await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: normalizedStatus as OrderStatus,
                    deliveredAt: normalizedStatus === 'DELIVERED' ? new Date(payload.timestamp) : undefined,
                    updatedAt: new Date()
                }
            });

            this.logger.log(`Order ${order.id} status updated to ${normalizedStatus} via Logistics Webhook`);
        }

        return { success: true };
    }

    /**
     * Maps carrier statuses to internal OrderStatus.
     */
    private normalizeStatus(carrierStatus: string): string | null {
        const s = carrierStatus.toUpperCase();
        if (s.includes('DELIVERED')) return 'DELIVERED';
        if (s.includes('OUT_FOR_DELIVERY')) return 'SHIPPED'; // mapped to active shipping
        if (s.includes('SHIPPED') || s.includes('IN_TRANSIT')) return 'SHIPPED';
        if (s.includes('PICKED_UP') || s.includes('PACKED')) return 'PACKED';
        return null;
    }

    /**
     * Manually sync tracking for an order (fallback logic).
     */
    async syncTracking(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || !order.awbNumber) return;

        // Implementation for pulling data from carrier API
        // const trackingData = await carrierApi.track(order.awbNumber);
        // await this.handleTrackingWebhook(trackingData);
    }
}

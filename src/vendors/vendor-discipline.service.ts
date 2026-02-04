import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorDisciplineService {
  private readonly logger = new Logger(VendorDisciplineService.name);

  constructor(private prisma: PrismaService) {}

  async addStrike(vendorId: string, orderId: string, reason: string) {
    // Create VendorDisciplineEvent (STRIKE_ADDED)
    await this.prisma.vendorDisciplineEvent.create({
      data: {
        id: randomUUID(),
        vendorId,
        orderId,
        eventType: 'STRIKE_ADDED',
        reason,
        performedBy: null, // Auto
      },
    });

    // Recalculate VendorDisciplineState
    await this.recalculateDisciplineState(vendorId);

    // Get updated state
    const state = await this.getDisciplineState(vendorId);

    // Check for auto-block (3 strikes)
    if (state.activeStrikes >= 3) {
      await this.autoBlockVendor(vendorId, orderId);
    }

    return state;
  }

  async processSuccessfulDelivery(vendorId: string, orderId: string) {
    // Get current state
    const currentState = await this.prisma.vendorDisciplineState.findUnique({
      where: { vendorId },
    });

    const consecutiveSuccesses = (currentState?.consecutiveSuccesses || 0) + 1;

    // Update consecutive successes
    await this.prisma.vendorDisciplineState.upsert({
      where: { vendorId },
      create: {
        Vendor: { connect: { id: vendorId } },
        state: 'ACTIVE',
        activeStrikes: 0,
        consecutiveSuccesses: 1,
        updatedAt: new Date(),
      },
      update: {
        consecutiveSuccesses,
      },
    });

    // Check for strike removal (10 consecutive)
    if (consecutiveSuccesses >= 10) {
      await this.removeStrikes(vendorId, orderId);
    }

    return { consecutiveSuccesses };
  }

  async getDisciplineState(vendorId: string) {
    const state = await this.prisma.vendorDisciplineState.findUnique({
      where: { vendorId },
    });

    if (!state) {
      // Return default state
      return {
        vendorId,
        state: 'ACTIVE',
        activeStrikes: 0,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
        updatedAt: new Date(),
      };
    }

    return state;
  }

  async getDisciplineHistory(vendorId: string, limit = 50) {
    return this.prisma.vendorDisciplineEvent.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async recalculateDisciplineState(vendorId: string) {
    // Count STRIKE_ADDED events minus STRIKE_REMOVED events
    const [strikeAdded, strikeRemoved] = await Promise.all([
      this.prisma.vendorDisciplineEvent.count({
        where: {
          vendorId,
          eventType: 'STRIKE_ADDED',
        },
      }),
      this.prisma.vendorDisciplineEvent.count({
        where: {
          vendorId,
          eventType: 'STRIKE_REMOVED',
        },
      }),
    ]);

    const activeStrikes = strikeAdded - strikeRemoved;

    // Determine state
    let state = 'ACTIVE';
    if (activeStrikes >= 3) {
      state = 'BLOCKED';
    } else if (activeStrikes >= 2) {
      state = 'WARNING';
    }

    // Update or create state
    await this.prisma.vendorDisciplineState.upsert({
      where: { vendorId },
      create: {
        Vendor: { connect: { id: vendorId } },
        state,
        activeStrikes,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
        updatedAt: new Date(),
      },
      update: {
        state,
        activeStrikes,
        lastStateChange: new Date(),
      },
    });
  }

  private async autoBlockVendor(vendorId: string, orderId: string) {
    // Create AUTO_BLOCKED event
    await this.prisma.vendorDisciplineEvent.create({
      data: {
        id: randomUUID(),
        vendorId,
        orderId,
        eventType: 'AUTO_BLOCKED',
        reason: 'Auto-blocked due to 3 or more active strikes',
        performedBy: null,
      },
    });

    // Update vendor storeStatus to SUSPENDED
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { storeStatus: 'SUSPENDED' },
    });

    this.logger.warn(`Vendor ${vendorId} auto-blocked due to 3+ strikes`);
  }

  private async removeStrikes(vendorId: string, orderId: string) {
    // Get current active strikes
    const state = await this.getDisciplineState(vendorId);
    const activeStrikes = state.activeStrikes;

    if (activeStrikes > 0) {
      // Create STRIKE_REMOVED events for all active strikes
      for (let i = 0; i < activeStrikes; i++) {
        await this.prisma.vendorDisciplineEvent.create({
          data: {
            id: randomUUID(),
            vendorId,
            orderId,
            eventType: 'STRIKE_REMOVED',
            reason: `Strike removed after 10 consecutive successful deliveries`,
            performedBy: null,
          },
        });
      }
    }

    // Update state to ACTIVE and reset counters
    await this.prisma.vendorDisciplineState.upsert({
      where: { vendorId },
      create: {
        Vendor: { connect: { id: vendorId } },
        state: 'ACTIVE',
        activeStrikes: 0,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
        updatedAt: new Date(),
      },
      update: {
        state: 'ACTIVE',
        activeStrikes: 0,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
      },
    });

    // Update vendor storeStatus to ACTIVE if it was SUSPENDED
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { storeStatus: 'ACTIVE' },
    });

    this.logger.log(`Strikes removed for vendor ${vendorId} after 10 consecutive successes`);
  }

  async adminOverride(vendorId: string, adminId: string, action: 'BLOCK' | 'UNBLOCK', reason: string) {
    // Create ADMIN_OVERRIDE event
    await this.prisma.vendorDisciplineEvent.create({
      data: {
        id: randomUUID(),
        vendorId,
        eventType: 'ADMIN_OVERRIDE',
        reason: `${action}: ${reason}`,
        performedBy: adminId,
      },
    });

    // Update state
    const newState = action === 'BLOCK' ? 'BLOCKED' : 'ACTIVE';
    await this.prisma.vendorDisciplineState.upsert({
      where: { vendorId },
      create: {
        Vendor: { connect: { id: vendorId } },
        state: newState,
        activeStrikes: 0,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
        updatedAt: new Date(),
      },
      update: {
        state: newState,
        lastStateChange: new Date(),
      },
    });

    // Update vendor storeStatus
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { storeStatus: action === 'BLOCK' ? 'SUSPENDED' : 'ACTIVE' },
    });

    return { success: true, state: newState };
  }
}

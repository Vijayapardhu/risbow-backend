import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StrikeType,
  StrikeResolution,
  DisciplineStatus,
  Prisma,
} from '@prisma/client';
import { AdminAuditService, AuditActionType, AuditResourceType } from '../audit/admin-audit.service';

/**
 * Strike tier thresholds for automatic discipline
 */
const STRIKE_THRESHOLDS = {
  WARNING: 1, // First strike: Warning
  PRODUCT_SUSPENSION: 2, // Second strike: Products suspended temporarily
  ACCOUNT_SUSPENSION: 3, // Third strike: Account suspended
  PERMANENT_BAN: 5, // Fifth strike: Permanent ban
};

/**
 * Strike point values by type
 */
const STRIKE_POINTS: Record<StrikeType, number> = {
  FAILED_DELIVERY: 2,
  SHOP_CLOSED: 1,
  LATE_PREPARATION: 1,
  CUSTOMER_COMPLAINT: 2,
  QUALITY_ISSUE: 2,
  REPEATED_CANCELLATION: 3,
  POLICY_VIOLATION: 3,
  CONTENT_VIOLATION: 2,
  WARNING: 1,
  PRODUCT_VIOLATION: 2,
  DELIVERY_FAILURE: 2,
  FRAUD: 5,
  REPEATED_OFFENSE: 3,
};

/**
 * Default suspension durations (in days)
 */
const SUSPENSION_DURATIONS = {
  PRODUCT_SUSPENSION: 7,
  ACCOUNT_SUSPENSION: 30,
  SECOND_SUSPENSION: 60,
};

interface CreateStrikeDto {
  vendorId: string;
  type: StrikeType;
  reason: string;
  evidence?: string[];
  orderId?: string;
  productId?: string;
  issuedBy: string;
  issuedByEmail?: string;
}

interface ResolveStrikeDto {
  resolution: StrikeResolution;
  resolutionNotes?: string;
  resolvedBy: string;
  resolvedByEmail?: string;
}

interface AppealStrikeDto {
  appealReason: string;
  appealEvidence?: string[];
}

@Injectable()
export class VendorStrikeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  /**
   * Issue a strike to a vendor
   */
  async issueStrike(dto: CreateStrikeDto) {
    // Verify vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
      include: {
        VendorStrike: {
          where: {
            resolution: null, // Only active strikes
          },
        },
        VendorDiscipline: {
          where: {
            status: { in: [DisciplineStatus.ACTIVE, DisciplineStatus.SUSPENDED] },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Calculate strike points
    const points = STRIKE_POINTS[dto.type];

    // Create strike
    const strike = await this.prisma.vendorStrike.create({
      data: {
        id: randomUUID(),
        Vendor: { connect: { id: dto.vendorId } },
        type: dto.type,
        reason: dto.reason,
        evidence: dto.evidence || [],
        Order: dto.orderId ? { connect: { id: dto.orderId } } : undefined,
        productId: dto.productId,
        issuedBy: dto.issuedBy,
        points,
      },
    });

    // Log audit
    await this.auditService.log({
      adminId: dto.issuedBy,
      adminEmail: dto.issuedByEmail,
      action: AuditActionType.VENDOR_STRIKE_ISSUED,
      resourceType: AuditResourceType.VENDOR,
      resourceId: dto.vendorId,
      details: {
        strikeId: strike.id,
        type: dto.type,
        points,
        reason: dto.reason,
      },
    });

    // Check if automatic discipline is needed
    const totalActiveStrikes = (vendor.VendorStrike?.length || 0) + 1;
    const totalPoints = (vendor.VendorStrike?.reduce((sum, s) => sum + s.points, 0) || 0) + points;

    await this.checkAndApplyDiscipline(vendor.id, totalActiveStrikes, totalPoints, dto.issuedBy);

    return strike;
  }

  /**
   * Resolve a strike (with appeal outcome)
   */
  async resolveStrike(strikeId: string, dto: ResolveStrikeDto) {
    const strike = await this.prisma.vendorStrike.findUnique({
      where: { id: strikeId },
      include: { Vendor: true },
    });

    if (!strike) {
      throw new NotFoundException('Strike not found');
    }

    if (strike.resolution) {
      throw new BadRequestException('Strike already resolved');
    }

    const updatedStrike = await this.prisma.vendorStrike.update({
      where: { id: strikeId },
      data: {
        resolution: dto.resolution,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: new Date(),
        resolvedBy: dto.resolvedBy,
      },
    });

    // If strike was overturned, re-evaluate discipline
    if (dto.resolution === StrikeResolution.OVERTURNED) {
      await this.reevaluateDiscipline(strike.vendorId, dto.resolvedBy);
    }

    // Log audit
    await this.auditService.log({
      adminId: dto.resolvedBy,
      adminEmail: dto.resolvedByEmail,
      action: AuditActionType.VENDOR_STRIKE_REVOKED,
      resourceType: AuditResourceType.VENDOR,
      resourceId: strike.vendorId,
      details: {
        strikeId,
        resolution: dto.resolution,
        notes: dto.resolutionNotes,
      },
    });

    return updatedStrike;
  }

  /**
   * File an appeal for a strike
   */
  async fileAppeal(strikeId: string, vendorId: string, dto: AppealStrikeDto) {
    const strike = await this.prisma.vendorStrike.findUnique({
      where: { id: strikeId },
    });

    if (!strike) {
      throw new NotFoundException('Strike not found');
    }

    if (strike.vendorId !== vendorId) {
      throw new ForbiddenException('Cannot appeal strike for another vendor');
    }

    if (strike.resolution) {
      throw new BadRequestException('Strike already resolved');
    }

    if (strike.appealedAt) {
      throw new BadRequestException('Appeal already filed');
    }

    return this.prisma.vendorStrike.update({
      where: { id: strikeId },
      data: {
        appealedAt: new Date(),
        appealReason: dto.appealReason,
        appealEvidence: dto.appealEvidence || [],
      },
    });
  }

  /**
   * Get vendor strikes with filters
   */
  async getVendorStrikes(
    vendorId: string,
    options?: {
      includeResolved?: boolean;
      type?: StrikeType;
      page?: number;
      limit?: number;
    },
  ) {
    const { includeResolved = false, type, page = 1, limit = 20 } = options || {};

    const where: Prisma.VendorStrikeWhereInput = {
      vendorId,
    };

    if (!includeResolved) {
      where.resolution = null;
    }

    if (type) {
      where.type = type;
    }

    const [strikes, total] = await Promise.all([
      this.prisma.vendorStrike.findMany({
        where,
        include: {
          Order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorStrike.count({ where }),
    ]);

    return {
      strikes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending appeals for review
   */
  async getPendingAppeals(page = 1, limit = 20) {
    const where: Prisma.VendorStrikeWhereInput = {
      appealedAt: { not: null },
      resolution: null,
    };

    const [strikes, total] = await Promise.all([
      this.prisma.vendorStrike.findMany({
        where,
        include: {
          Vendor: { select: { id: true, storeName: true } },
          Order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { appealedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorStrike.count({ where }),
    ]);

    return {
      appeals: strikes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor discipline history
   */
  async getVendorDiscipline(vendorId: string) {
    return this.prisma.vendorDiscipline.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get current active discipline for vendor
   */
  async getActiveDiscipline(vendorId: string) {
    return this.prisma.vendorDiscipline.findFirst({
      where: {
        vendorId,
        status: { in: [DisciplineStatus.ACTIVE, DisciplineStatus.SUSPENDED] },
      },
    });
  }

  /**
   * Manually apply discipline action
   */
  async applyDiscipline(
    vendorId: string,
    action: DisciplineStatus,
    reason: string,
    adminId: string,
    durationDays?: number,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // End any existing active discipline
    await this.prisma.vendorDiscipline.updateMany({
      where: {
        vendorId,
        status: { in: [DisciplineStatus.ACTIVE, DisciplineStatus.SUSPENDED] },
      },
      data: {
        status: DisciplineStatus.EXPIRED,
        endedAt: new Date(),
      },
    });

    // Create new discipline record
    const discipline = await this.prisma.vendorDiscipline.create({
      data: {
        id: randomUUID(),
        Vendor: { connect: { id: vendorId } },
        status: action,
        reason,
        startedAt: new Date(),
        endsAt: durationDays
          ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
          : null,
        appliedBy: adminId,
      },
    });

    // Update vendor status if needed
    if (action === DisciplineStatus.SUSPENDED || action === DisciplineStatus.BANNED) {
      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: { isActive: false },
      });
    }

    return discipline;
  }

  /**
   * Lift a discipline action
   */
  async liftDiscipline(disciplineId: string, adminId: string, reason: string) {
    const discipline = await this.prisma.vendorDiscipline.findUnique({
      where: { id: disciplineId },
    });

    if (!discipline) {
      throw new NotFoundException('Discipline record not found');
    }

    if (discipline.status === DisciplineStatus.EXPIRED || discipline.status === DisciplineStatus.LIFTED) {
      throw new BadRequestException('Discipline is not active');
    }

    // Update discipline
    await this.prisma.vendorDiscipline.update({
      where: { id: disciplineId },
      data: {
        status: DisciplineStatus.LIFTED,
        endedAt: new Date(),
        liftedBy: adminId,
        liftReason: reason,
      },
    });

    // Reactivate vendor
    await this.prisma.vendor.update({
      where: { id: discipline.vendorId },
      data: { isActive: true },
    });

    return { success: true };
  }

  /**
   * Check expired disciplines and auto-lift
   */
  async processExpiredDisciplines() {
    const expired = await this.prisma.vendorDiscipline.findMany({
      where: {
        status: DisciplineStatus.SUSPENDED,
        endsAt: { lte: new Date() },
      },
    });

    for (const discipline of expired) {
      await this.prisma.$transaction([
        this.prisma.vendorDiscipline.update({
          where: { id: discipline.id },
          data: {
            status: DisciplineStatus.EXPIRED,
            endedAt: new Date(),
          },
        }),
        this.prisma.vendor.update({
          where: { id: discipline.vendorId },
          data: { isActive: true },
        }),
      ]);
    }

    return { processed: expired.length };
  }

  // Private helper methods

  /**
   * Check if automatic discipline should be applied
   */
  private async checkAndApplyDiscipline(
    vendorId: string,
    strikeCount: number,
    totalPoints: number,
    adminId: string,
  ) {
    let action: DisciplineStatus | null = null;
    let durationDays: number | undefined;
    let reason: string;

    if (totalPoints >= STRIKE_THRESHOLDS.PERMANENT_BAN * 3) {
      action = DisciplineStatus.BANNED;
      reason = 'Automatic permanent ban due to excessive violations';
    } else if (strikeCount >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION) {
      action = DisciplineStatus.SUSPENDED;
      durationDays = strikeCount >= 4 ? SUSPENSION_DURATIONS.SECOND_SUSPENSION : SUSPENSION_DURATIONS.ACCOUNT_SUSPENSION;
      reason = `Automatic account suspension for ${durationDays} days due to ${strikeCount} active strikes`;
    } else if (strikeCount >= STRIKE_THRESHOLDS.PRODUCT_SUSPENSION) {
      action = DisciplineStatus.SUSPENDED;
      durationDays = SUSPENSION_DURATIONS.PRODUCT_SUSPENSION;
      reason = `Automatic suspension for ${durationDays} days due to ${strikeCount} active strikes`;
    } else if (strikeCount >= STRIKE_THRESHOLDS.WARNING) {
      action = DisciplineStatus.WARNING;
      reason = 'Official warning issued due to policy violation';
    }

    if (action) {
      await this.applyDiscipline(vendorId, action, reason, adminId, durationDays);
    }
  }

  /**
   * Re-evaluate discipline after strike resolution
   */
  private async reevaluateDiscipline(vendorId: string, adminId: string) {
    const activeStrikes = await this.prisma.vendorStrike.findMany({
      where: {
        vendorId,
        resolution: null,
      },
    });

    const activeDiscipline = await this.getActiveDiscipline(vendorId);

    // If no active strikes but has discipline, consider lifting
    if (activeStrikes.length === 0 && activeDiscipline) {
      await this.liftDiscipline(
        activeDiscipline.id,
        adminId,
        'Automatically lifted after all strikes resolved',
      );
    }
  }
}


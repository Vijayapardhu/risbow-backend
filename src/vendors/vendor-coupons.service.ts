import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVendorCouponDto,
  UpdateVendorCouponDto,
  VendorCouponQueryDto,
  CouponDiscountType,
  CouponUsageStatsDto,
} from './dto/vendor-coupon.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorId(userId: string): Promise<string> {
    // Note: Vendor model doesn't have userId field
    // Assuming userId IS the vendor ID in this context
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor not found');
    }

    return vendor.id;
  }

  async create(userId: string, dto: CreateVendorCouponDto) {
    const vendorId = await this.getVendorId(userId);

    // Check for duplicate coupon code for this vendor
    const existingCoupon = await this.prisma.coupon.findFirst({
      where: {
        code: dto.code.toUpperCase(),
        vendorId,
      },
    });

    if (existingCoupon) {
      throw new ConflictException(`Coupon code '${dto.code}' already exists for this vendor`);
    }

    // Validate percentage value
    if (dto.type === CouponDiscountType.PERCENTAGE && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        id: randomUUID(),
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountType: dto.type,
        discountValue: dto.value,
        minOrderAmount: dto.minOrder ?? 0,
        maxDiscount: dto.maxDiscount,
        validFrom: new Date(),
        validUntil: dto.expiresAt ? new Date(dto.expiresAt) : null,
        usageLimit: dto.usageLimit,
        minQuantity: dto.minQuantity,
        productIds: dto.productIds ?? [],
        categoryIds: dto.categoryIds ?? [],
        vendorId,
        isActive: true,
        usedCount: 0,
        updatedAt: new Date(),
      },
    });

    return coupon;
  }

  async findAll(userId: string, query: VendorCouponQueryDto) {
    const vendorId = await this.getVendorId(userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.code = {
        contains: query.search.toUpperCase(),
        mode: 'insensitive',
      };
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, couponId: string) {
    const vendorId = await this.getVendorId(userId);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException('Coupon does not belong to this vendor');
    }

    return coupon;
  }

  async update(userId: string, couponId: string, dto: UpdateVendorCouponDto) {
    const vendorId = await this.getVendorId(userId);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException('Coupon does not belong to this vendor');
    }

    // If updating code, check for duplicates
    if (dto.code && dto.code.toUpperCase() !== coupon.code) {
      const existingCoupon = await this.prisma.coupon.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          vendorId,
          id: { not: couponId },
        },
      });

      if (existingCoupon) {
        throw new ConflictException(`Coupon code '${dto.code}' already exists for this vendor`);
      }
    }

    // Validate percentage value
    const discountType = dto.type ?? coupon.discountType;
    if (discountType === CouponDiscountType.PERCENTAGE && dto.value && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.code) updateData.code = dto.code.toUpperCase();
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type) updateData.discountType = dto.type;
    if (dto.value !== undefined) updateData.discountValue = dto.value;
    if (dto.minOrder !== undefined) updateData.minOrderAmount = dto.minOrder;
    if (dto.maxDiscount !== undefined) updateData.maxDiscount = dto.maxDiscount;
    if (dto.expiresAt !== undefined) updateData.validUntil = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.usageLimit !== undefined) updateData.usageLimit = dto.usageLimit;
    if (dto.minQuantity !== undefined) updateData.minQuantity = dto.minQuantity;
    if (dto.productIds !== undefined) updateData.productIds = dto.productIds;
    if (dto.categoryIds !== undefined) updateData.categoryIds = dto.categoryIds;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: updateData,
    });
  }

  async delete(userId: string, couponId: string) {
    const vendorId = await this.getVendorId(userId);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException('Coupon does not belong to this vendor');
    }

    // Soft delete by deactivating if coupon has been used
    if (coupon.usedCount > 0) {
      return this.prisma.coupon.update({
        where: { id: couponId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }

    // Hard delete if never used
    await this.prisma.coupon.delete({
      where: { id: couponId },
    });

    return { message: 'Coupon deleted successfully' };
  }

  async getUsageStats(userId: string, couponId: string): Promise<CouponUsageStatsDto> {
    const vendorId = await this.getVendorId(userId);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException('Coupon does not belong to this vendor');
    }

    // Get orders that used this coupon
    const ordersWithCoupon = await this.prisma.order.findMany({
      where: {
        couponCode: coupon.code,
      },
      select: {
        id: true,
        userId: true,
        discountAmount: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calculate stats
    const totalDiscountGiven = ordersWithCoupon.reduce(
      (sum, order) => sum + order.discountAmount,
      0,
    );

    const uniqueCustomers = new Set(ordersWithCoupon.map((o) => o.userId)).size;

    return {
      couponId: coupon.id,
      code: coupon.code,
      totalUses: coupon.usedCount,
      usageLimit: coupon.usageLimit,
      remainingUses: coupon.usageLimit ? coupon.usageLimit - coupon.usedCount : null,
      totalDiscountGiven,
      uniqueCustomers,
      recentOrders: ordersWithCoupon.map((order) => ({
        orderId: order.id,
        userId: order.userId,
        discountAmount: order.discountAmount,
        orderTotal: order.totalAmount,
        createdAt: order.createdAt,
      })),
    };
  }
}

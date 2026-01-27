import { Injectable, BadRequestException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { NotificationsService } from '../shared/notifications.service';
import { RoomType, RoomStatus } from '@prisma/client';

@Injectable()
export class ClearanceService {
  private readonly logger = new Logger(ClearanceService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RoomsService))
    private roomsService?: RoomsService,
    private notificationsService?: NotificationsService,
  ) {}

  async addToClearance(
    vendorId: string,
    productId: string,
    clearancePrice: number,
    originalPrice: number,
    expiryDate: Date,
    quantity: number,
  ) {
    // Verify product belongs to vendor
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (product.vendorId !== vendorId) {
      throw new BadRequestException('Unauthorized. Product does not belong to you.');
    }

    // Check if already in clearance
    const existing = await this.prisma.clearanceProduct.findFirst({
      where: {
        productId,
        vendorId,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Product is already in clearance.');
    }

    // Create clearance product
    const clearanceProduct = await this.prisma.clearanceProduct.create({
      data: {
        productId,
        vendorId,
        clearancePrice,
        originalPrice,
        expiryDate,
        quantity,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
    });

    return clearanceProduct;
  }

  async getClearanceProducts(vendorId?: string, limit = 50, offset = 0) {
    const where: any = {
      isActive: true,
      expiryDate: { gt: new Date() },
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.prisma.clearanceProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            categoryId: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
            storeLogo: true,
          },
        },
      },
    });
  }

  async getVendorClearance(vendorId: string) {
    return this.prisma.clearanceProduct.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
    });
  }

  async removeFromClearance(clearanceId: string, vendorId: string) {
    const clearanceProduct = await this.prisma.clearanceProduct.findUnique({
      where: { id: clearanceId },
    });

    if (!clearanceProduct) {
      throw new NotFoundException('Clearance product not found.');
    }

    if (clearanceProduct.vendorId !== vendorId) {
      throw new BadRequestException('Unauthorized to remove this clearance product.');
    }

    await this.prisma.clearanceProduct.update({
      where: { id: clearanceId },
      data: { isActive: false },
    });

    return { success: true, message: 'Product removed from clearance.' };
  }

  async expireClearanceProducts() {
    const now = new Date();
    const result = await this.prisma.clearanceProduct.updateMany({
      where: {
        isActive: true,
        expiryDate: { lt: now },
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Deactivated ${result.count} expired clearance products`);
    return { deactivated: result.count };
  }

  /**
   * Auto-add products to clearance sale when they're near expiry
   * Uses vendor's configured threshold days and discount percentage
   */
  async autoAddToClearance() {
    const now = new Date();
    let totalAdded = 0;

    // Get all vendors with auto-clearance enabled (has threshold configured)
    const vendors = await this.prisma.vendor.findMany({
      where: {
        autoClearanceThresholdDays: { not: null },
      },
      select: {
        id: true,
        autoClearanceThresholdDays: true,
        defaultClearanceDiscountPercent: true,
      },
    });

    for (const vendor of vendors) {
      const thresholdDays = vendor.autoClearanceThresholdDays ?? 7;
      const discountPercent = vendor.defaultClearanceDiscountPercent ?? 20;

      // Calculate the threshold date (products expiring within thresholdDays)
      const thresholdDate = new Date(now);
      thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

      // Find products near expiry that:
      // 1. Belong to this vendor
      // 2. Have an expiryDate set
      // 3. Are expiring within thresholdDays
      // 4. Are not already in clearance
      // 5. Are active
      // 6. Auto-clearance is not disabled
      const productsNearExpiry = await this.prisma.product.findMany({
        where: {
          vendorId: vendor.id,
          expiryDate: {
            not: null,
            gte: now,
            lte: thresholdDate,
          },
          isActive: true,
          disableAutoClearance: false, // Only process products with auto-clearance enabled
          clearanceProducts: {
            none: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          title: true,
          price: true,
          offerPrice: true,
          stock: true,
          expiryDate: true,
        },
      });

      for (const product of productsNearExpiry) {
        try {
          // Calculate clearance price (apply discount to offerPrice or price)
          const originalPrice = product.offerPrice || product.price;
          const discountAmount = Math.round((originalPrice * discountPercent) / 100);
          const clearancePrice = originalPrice - discountAmount;

          // Use product expiryDate as clearance expiryDate
          const expiryDate = product.expiryDate || new Date(thresholdDate);

          // Create clearance product
          const clearanceProduct = await this.prisma.clearanceProduct.create({
            data: {
              productId: product.id,
              vendorId: vendor.id,
              clearancePrice,
              originalPrice,
              expiryDate,
              quantity: product.stock,
              isActive: true,
            },
            include: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          });

          // Create a discount room for this clearance product
          let roomCreated = false;
          try {
            if (this.roomsService) {
              // Calculate discount percentage for room
              const roomDiscountPercent = Math.round(
                ((originalPrice - clearancePrice) / originalPrice) * 100,
              );

              // Get vendor's user ID by matching mobile number (vendors and users are linked by mobile)
              const vendorDetails = await this.prisma.vendor.findUnique({
                where: { id: vendor.id },
                select: { mobile: true, email: true },
              });

              const vendorUser = vendorDetails
                ? await this.prisma.user.findFirst({
                    where: {
                      OR: [
                        { mobile: vendorDetails.mobile },
                        ...(vendorDetails.email ? [{ email: vendorDetails.email }] : []),
                      ],
                      role: { in: ['VENDOR', 'WHOLESALER'] },
                    },
                    select: { id: true },
                  })
                : null;

              if (vendorUser) {
                // Create a discount room for this clearance product
                const room = await this.roomsService.createDiscountRoom(vendorUser.id, {
                  productId: product.id,
                  maxDiscount: roomDiscountPercent,
                  maxMembers: 10, // Default max members for clearance rooms
                  name: `Clearance Sale: ${product.title || 'Product'}`,
                });

                roomCreated = true;
                this.logger.log(
                  `Created discount room ${room.id} for clearance product ${product.id} (discount: ${roomDiscountPercent}%)`,
                );
              }
            }
          } catch (roomError) {
            // Don't fail clearance creation if room creation fails
            this.logger.warn(
              `Failed to create room for clearance product ${product.id}: ${roomError.message}`,
            );
          }

          // Send notification to vendor (reuse vendorUser from room creation if available)
          try {
            if (this.notificationsService && vendorUser) {
              await this.notificationsService.createNotification(
                vendorUser.id,
                'Product Auto-Added to Clearance',
                `Your product "${product.title || product.id}" has been automatically added to clearance sale with ${discountPercent}% discount. ${roomCreated ? 'A discount room has been created.' : ''}`,
                'CLEARANCE',
                'INDIVIDUAL',
              );
            } else if (this.notificationsService && !vendorUser) {
              // If no user found, try to find by mobile/email again
              const vendorDetails = await this.prisma.vendor.findUnique({
                where: { id: vendor.id },
                select: { mobile: true, email: true },
              });

              if (vendorDetails) {
                const userForNotification = await this.prisma.user.findFirst({
                  where: {
                    OR: [
                      { mobile: vendorDetails.mobile },
                      ...(vendorDetails.email ? [{ email: vendorDetails.email }] : []),
                    ],
                    role: { in: ['VENDOR', 'WHOLESALER'] },
                  },
                  select: { id: true },
                });

                if (userForNotification) {
                  await this.notificationsService.createNotification(
                    userForNotification.id,
                    'Product Auto-Added to Clearance',
                    `Your product "${product.title || product.id}" has been automatically added to clearance sale with ${discountPercent}% discount. ${roomCreated ? 'A discount room has been created.' : ''}`,
                    'CLEARANCE',
                    'INDIVIDUAL',
                  );
                }
              }
            }
          } catch (notifError) {
            this.logger.warn(
              `Failed to send notification for clearance product ${product.id}: ${notifError.message}`,
            );
          }

          totalAdded++;
          this.logger.log(
            `Auto-added product ${product.id} to clearance (vendor ${vendor.id}, discount ${discountPercent}%)`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to auto-add product ${product.id} to clearance: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(`Auto-clearance: Added ${totalAdded} products to clearance sale`);
    return { added: totalAdded };
  }

  /**
   * Get auto-clearance analytics for a vendor
   */
  async getAutoClearanceAnalytics(vendorId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalAutoAdded, totalManual, recentAuto, activeClearance, expiredClearance] = await Promise.all([
      // Count auto-added clearance products (created in last 30 days)
      this.prisma.clearanceProduct.count({
        where: {
          vendorId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      // Count manually added (older than 30 days)
      this.prisma.clearanceProduct.count({
        where: {
          vendorId,
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      }),
      // Recent auto-added (last 7 days)
      this.prisma.clearanceProduct.findMany({
        where: {
          vendorId,
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Active clearance products
      this.prisma.clearanceProduct.count({
        where: {
          vendorId,
          isActive: true,
          expiryDate: { gt: new Date() },
        },
      }),
      // Expired clearance products
      this.prisma.clearanceProduct.count({
        where: {
          vendorId,
          OR: [
            { isActive: false },
            { expiryDate: { lt: new Date() } },
          ],
        },
      }),
    ]);

    // Calculate total revenue from clearance (if we track sales)
    const clearanceProducts = await this.prisma.clearanceProduct.findMany({
      where: {
        vendorId,
        isActive: true,
        expiryDate: { gt: new Date() },
      },
      select: {
        clearancePrice: true,
        quantity: true,
      },
    });

    const totalClearanceValue = clearanceProducts.reduce(
      (sum, cp) => sum + cp.clearancePrice * cp.quantity,
      0,
    );

    return {
      totalAutoAdded,
      totalManual,
      recentAuto,
      activeClearance,
      expiredClearance,
      totalClearanceValue,
      summary: {
        total: totalAutoAdded + totalManual,
        autoAdded: totalAutoAdded,
        manual: totalManual,
        active: activeClearance,
        expired: expiredClearance,
      },
    };
  }

  /**
   * Get products near expiry for a vendor (for dashboard preview)
   */
  async getProductsNearExpiry(vendorId: string, days: number = 7) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        autoClearanceThresholdDays: true,
      },
    });

    const thresholdDays = vendor?.autoClearanceThresholdDays ?? days;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

    const products = await this.prisma.product.findMany({
      where: {
        vendorId,
        expiryDate: {
          not: null,
          gte: new Date(),
          lte: thresholdDate,
        },
        isActive: true,
        disableAutoClearance: false,
        clearanceProducts: {
          none: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        title: true,
        price: true,
        offerPrice: true,
        stock: true,
        expiryDate: true,
        images: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
      take: 20,
    });

    return {
      products,
      count: products.length,
      thresholdDays,
    };
  }
}

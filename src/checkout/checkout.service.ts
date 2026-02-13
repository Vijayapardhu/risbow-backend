import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentMode } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../shared/redis.service';
import { PriceResolverService } from '../common/price-resolver.service';
import { CommissionService } from '../common/commission.service';
import { DeliveryOptionsService } from '../delivery/delivery-options.service';
import { GeoService } from '../shared/geo.service';
import { VendorAvailabilityService } from '../vendors/vendor-availability.service';
import { OrderStatus } from '@prisma/client';
import { generateOrderNumber } from '../common/order-number.utils';
import { randomUUID } from 'crypto';

@Injectable()
export class CheckoutService {
    private readonly logger = new Logger(CheckoutService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentsService: PaymentsService,
        private readonly giftsService: GiftsService,
        private readonly couponsService: CouponsService,
        private readonly inventoryService: InventoryService,  // 🔐 P0 FIX: Add InventoryService
        private readonly redisService: RedisService,
        private readonly priceResolver: PriceResolverService,
        private readonly commissionService: CommissionService,
        private readonly deliveryOptions: DeliveryOptionsService,
        private readonly geoService: GeoService,
        private readonly vendorAvailability: VendorAvailabilityService,
    ) { }

    private allocateDiscountProportionally(totalDiscount: number, vendorSubtotals: Array<{ vendorId: string; subtotal: number }>) {
        const total = vendorSubtotals.reduce((s, v) => s + v.subtotal, 0);
        if (total <= 0 || totalDiscount <= 0) return vendorSubtotals.map((v) => ({ vendorId: v.vendorId, discount: 0 }));

        const raw = vendorSubtotals.map((v) => {
            const exact = (totalDiscount * v.subtotal) / total;
            const floor = Math.floor(exact);
            return { vendorId: v.vendorId, floor, frac: exact - floor };
        });
        let remaining = totalDiscount - raw.reduce((s, r) => s + r.floor, 0);
        raw.sort((a, b) => b.frac - a.frac);
        const out = raw.map((r) => ({ vendorId: r.vendorId, discount: r.floor }));
        let i = 0;
        while (remaining > 0 && out.length > 0) {
            out[i % out.length].discount += 1;
            remaining -= 1;
            i += 1;
        }
        return out;
    }

    private pickDeliverySelection(dto: CheckoutDto, vendorId: string): { slotStartAt: string; slotEndAt: string } | null {
        const selections = Array.isArray((dto as any).deliverySelections) ? ((dto as any).deliverySelections as any[]) : [];
        const found = selections.find((s) => String(s.vendorId) === String(vendorId));
        if (!found) return null;
        return { slotStartAt: String(found.slotStartAt), slotEndAt: String(found.slotEndAt) };
    }

    async getDeliveryOptionsForCart(userId: string, shippingAddressId: string) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: { CartItem: { include: { Product: true } } },
        });
        if (!cart || cart.CartItem.length === 0) throw new BadRequestException('Cart is empty');

        const address = await this.prisma.address.findUnique({ where: { id: shippingAddressId } });
        if (!address || address.userId !== userId) throw new BadRequestException('Invalid shipping address');

        // Best-effort geo fill if missing
        let lat = (address as any).latitude != null ? Number((address as any).latitude) : null;
        let lng = (address as any).longitude != null ? Number((address as any).longitude) : null;
        if ((lat == null || lng == null) && address.pincode) {
            const geo = await this.geoService.resolveAddressGeo({
                addressLine1: (address as any).addressLine1,
                addressLine2: (address as any).addressLine2,
                city: (address as any).city,
                state: (address as any).state,
                pincode: (address as any).pincode,
            });
            if (geo?.point?.lat != null && geo?.point?.lng != null) {
                lat = geo.point.lat;
                lng = geo.point.lng;
                await this.prisma.address
                    .update({
                        where: { id: address.id },
                        data: { latitude: lat, longitude: lng, geoSource: geo.source as any, geoUpdatedAt: new Date() } as any,
                    })
                    .catch(() => undefined);
            }
        }
        if (lat == null || lng == null) throw new BadRequestException('Address geo is missing (lat/lng)');

        const vendorIds = Array.from(new Set(cart.CartItem.map((i) => i.Product.vendorId))).filter(Boolean);
        const results = await Promise.all(
            vendorIds.map(async (vendorId) => {
                const res = await this.deliveryOptions.getDeliveryOptions({ vendorId, point: { lat: lat!, lng: lng! } });
                return { vendorId, ...res };
            }),
        );

        return { shippingAddressId, point: { lat, lng }, vendors: results };
    }

    async checkout(userId: string, dto: CheckoutDto) {
        const { paymentMode, shippingAddressId, notes, giftId, couponCode } = dto;

        // Best-effort: ensure address has geo before entering transaction (no external calls inside tx)
        const addr = await this.prisma.address.findUnique({ where: { id: shippingAddressId } });
        if (!addr || addr.userId !== userId) throw new BadRequestException('Invalid shipping address');
        const lat0 = (addr as any).latitude != null ? Number((addr as any).latitude) : null;
        const lng0 = (addr as any).longitude != null ? Number((addr as any).longitude) : null;
        if ((lat0 == null || lng0 == null) && (addr as any).pincode) {
            const geo = await this.geoService.resolveAddressGeo({
                addressLine1: (addr as any).addressLine1,
                addressLine2: (addr as any).addressLine2,
                city: (addr as any).city,
                state: (addr as any).state,
                pincode: (addr as any).pincode,
            });
            if (geo?.point?.lat != null && geo?.point?.lng != null) {
                await this.prisma.address
                    .update({
                        where: { id: addr.id },
                        data: { latitude: geo.point.lat, longitude: geo.point.lng, geoSource: geo.source as any, geoUpdatedAt: new Date() } as any,
                    })
                    .catch(() => undefined);
            }
        }

        // 🔐 P0 FIX: Pre-fetch cart for stock reservation BEFORE transaction
        const cartForReservation = await this.prisma.cart.findUnique({
            where: { userId },
            include: { CartItem: { include: { Product: true } } }
        });

        if (!cartForReservation || cartForReservation.CartItem.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        // 🔐 P0 FIX: Reserve stock BEFORE transaction to prevent overselling
        const reservedItems: { productId: string; variantId?: string; quantity: number }[] = [];

        try {
            for (const item of cartForReservation.CartItem) {
                await this.inventoryService.reserveStock(
                    item.productId,
                    item.quantity,
                    item.variantId || undefined
                );
                reservedItems.push({
                    productId: item.productId,
                    variantId: item.variantId || undefined,
                    quantity: item.quantity
                });
            }
        } catch (reservationError) {
            // Release any already reserved stock if reservation fails
            for (const reserved of reservedItems) {
                await this.inventoryService.releaseStock(
                    reserved.productId,
                    reserved.quantity,
                    reserved.variantId
                ).catch(err => this.logger.error(`Failed to release reservation: ${err.message}`));
            }
            throw reservationError;
        }

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const cart = await tx.cart.findUnique({
                    where: { userId },
                    include: { CartItem: { include: { Product: true } } },
                });
                if (!cart || cart.CartItem.length === 0) throw new BadRequestException('Cart is empty');

                const address = await tx.address.findUnique({ where: { id: shippingAddressId } });
                if (!address || address.userId !== userId) throw new BadRequestException('Invalid shipping address');

                const lat = (address as any).latitude != null ? Number((address as any).latitude) : null;
                const lng = (address as any).longitude != null ? Number((address as any).longitude) : null;
                if (lat == null || lng == null) throw new BadRequestException('Address geo is missing (lat/lng)');

                // Build order items with server-side pricing (paise) + validate stock
                const orderItems: any[] = [];
                const categoryIds = new Set<string>();
                const vendorToCategories = new Map<string, Set<string>>();

                for (const item of cart.CartItem) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
                    categoryIds.add(product.categoryId);
                    if (!vendorToCategories.has(product.vendorId)) vendorToCategories.set(product.vendorId, new Set<string>());
                    vendorToCategories.get(product.vendorId)!.add(product.categoryId);

                    // Price resolver (includes local promos); returns paise
                    const priceOut = await this.priceResolver.resolvePriceDetailed({
                        productId: product.id,
                        variantId: item.variantId || undefined,
                        location: { lat, lng, pincode: (address as any).pincode },
                    });
                    let pricePaise = Number(priceOut.unitPrice);

                    // Wholesale MOQ enforcement (best-effort, uses product flags)
                    if ((product as any).isWholesale) {
                        if (item.quantity < ((product as any).moq || 1)) {
                            throw new BadRequestException(`Minimum order quantity for ${product.title} is ${(product as any).moq}`);
                        }
                        pricePaise = Number((product as any).wholesalePrice || pricePaise);
                    }

                    // Stock check (variant-aware)
                    let stock = Number(product.stock);
                    let variantSnapshot: any = null;
                    if (item.variantId) {
                        const variant = await (tx as any).productVariant.findFirst({
                            where: { id: item.variantId, productId: product.id },
                        });
                        if (!variant) throw new BadRequestException(`Variant not found for product ${product.title}`);
                        stock = Number(variant.stock);
                        variantSnapshot = { attributes: variant.attributes, sku: variant.sku };
                        if (variant.price != null) pricePaise = Number(variant.price);
                    }
                    if (stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.title}`);

                    const subtotalPaise = pricePaise * item.quantity;
                    orderItems.push({
                        productId: product.id,
                        variantId: item.variantId,
                        vendorId: product.vendorId,
                        categoryId: product.categoryId,
                        productTitle: product.title,
                        productName: product.title,
                        image: product.images?.[0] || null,
                        quantity: item.quantity,
                        price: pricePaise,
                        subtotal: subtotalPaise,
                        variantSnapshot,
                        appliedLocalPromotionId: priceOut.appliedLocalPromotionId,
                    });
                }

                // Split by vendor
                const vendorGroups = new Map<string, any[]>();
                for (const it of orderItems) {
                    if (!vendorGroups.has(it.vendorId)) vendorGroups.set(it.vendorId, []);
                    vendorGroups.get(it.vendorId)!.push(it);
                }
                const vendorIds = Array.from(vendorGroups.keys());

                // 🔐 DB-LEVEL ENFORCEMENT: Check shop availability for each vendor
                for (const vendorId of vendorIds) {
                    // Gate vendors that are inactive or not KYC verified
                    const vendor = await tx.vendor.findUnique({
                        where: { id: vendorId },
                        select: { isActive: true, kycStatus: true },
                    });
                    if (!vendor || vendor.isActive === false || vendor.kycStatus !== 'VERIFIED') {
                        throw new BadRequestException(`Cannot place order: Vendor ${vendorId} is not eligible (KYC/active check failed)`);
                    }

                    const availability = await this.vendorAvailability.checkShopOpen(vendorId);
                    if (!availability.isOpen) {
                        throw new BadRequestException(
                            `Cannot place order: Shop with vendor ID ${vendorId} is closed.${availability.nextOpenAt ? ` Next open at: ${availability.nextOpenAt}` : ''}`
                        );
                    }
                }

                // Validate deliverability per vendor
                const perVendorEligibility = await Promise.all(
                    vendorIds.map(async (vendorId) => ({ vendorId, res: await this.deliveryOptions.getDeliveryOptions({ vendorId, point: { lat, lng } }) })),
                );
                for (const e of perVendorEligibility) {
                    if (!e.res.eligible) throw new BadRequestException(`Vendor ${e.vendorId} not deliverable: ${e.res.reason || 'OUT_OF_COVERAGE'}`);
                    if (!e.res.availableSlots || e.res.availableSlots.length === 0) throw new BadRequestException(`No delivery slots available for vendor ${e.vendorId}`);
                }

                // Gift validation (whole-cart), but we attach gift to one vendor order deterministically
                let selectedGiftId: string | null = null;
                let giftVendorId: string | null = null;
                if (giftId) {
                    const gift = await tx.giftSKU.findUnique({ where: { id: giftId } });
                    if (!gift) throw new NotFoundException('Gift not found');
                    if (gift.stock <= 0) throw new BadRequestException('Gift out of stock');

                    const eligibleCategories = (gift.eligibleCategories as any as string[]) || [];
                    const cartCategories = Array.from(categoryIds);
                    const hasEligibleCategory = eligibleCategories.length === 0 || eligibleCategories.some((cat) => cartCategories.includes(cat));
                    if (!hasEligibleCategory) throw new BadRequestException('Gift not eligible for cart items');

                    selectedGiftId = giftId;
                    // Pick vendor with highest subtotal that also contains an eligible category (if any)
                    const vendorSubtotals = vendorIds.map((vId) => ({
                        vendorId: vId,
                        subtotal: vendorGroups.get(vId)!.reduce((s, x) => s + Number(x.subtotal), 0),
                        hasEligibleCat:
                            eligibleCategories.length === 0 ||
                            Array.from(vendorToCategories.get(vId) || []).some((cat) => eligibleCategories.includes(cat)),
                    }));
                    const eligibleVendors = vendorSubtotals.filter((v) => v.hasEligibleCat);
                    eligibleVendors.sort((a, b) => b.subtotal - a.subtotal);
                    giftVendorId = eligibleVendors[0]?.vendorId || vendorIds[0];

                    await tx.giftSKU.update({ where: { id: giftId }, data: { stock: { decrement: 1 } } });
                }

                // Coupon validation on whole-cart subtotal (paise)
                const cartSubtotalPaise = orderItems.reduce((s, it) => s + Number(it.subtotal), 0);
                let discountAmountPaise = 0;
                let appliedCouponCode: string | null = null;
                if (couponCode) {
                    const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
                    if (!coupon) throw new NotFoundException('Coupon not found');
                    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
                    if (coupon.validUntil && new Date() > coupon.validUntil) throw new BadRequestException('Coupon has expired');
                    if (coupon.minOrderAmount && cartSubtotalPaise < coupon.minOrderAmount) {
                        throw new BadRequestException(`Minimum order amount of ₹${Math.round(coupon.minOrderAmount / 100)} required`);
                    }

                    const couponUpdateResult = await tx.coupon.updateMany({
                        where: {
                            id: coupon.id,
                            OR: [{ usageLimit: null }, { usedCount: { lt: coupon.usageLimit ?? undefined } }],
                        },
                        data: { usedCount: { increment: 1 } },
                    });
                    if (couponUpdateResult.count === 0) throw new BadRequestException('Coupon usage limit exceeded');

                    if (coupon.discountType === 'PERCENTAGE') {
                        discountAmountPaise = Math.floor((cartSubtotalPaise * coupon.discountValue) / 100);
                        if (coupon.maxDiscount && discountAmountPaise > coupon.maxDiscount) discountAmountPaise = coupon.maxDiscount;
                    } else if (coupon.discountType === 'FLAT') {
                        discountAmountPaise = coupon.discountValue;
                    }
                    if (discountAmountPaise > cartSubtotalPaise) discountAmountPaise = cartSubtotalPaise;
                    appliedCouponCode = couponCode;
                }

                const vendorSubtotals = vendorIds.map((vendorId) => ({
                    vendorId,
                    subtotal: vendorGroups.get(vendorId)!.reduce((s, it) => s + Number(it.subtotal), 0),
                }));
                const perVendorDiscount = this.allocateDiscountProportionally(discountAmountPaise, vendorSubtotals);
                const discountByVendor = new Map(perVendorDiscount.map((d) => [d.vendorId, d.discount]));

                // Delivery slot selection per vendor
                const chosenSlotByVendor = new Map<string, { startAt: string; endAt: string; source: 'AUTO' | 'CUSTOMER' }>();
                for (const e of perVendorEligibility) {
                    const selection = this.pickDeliverySelection(dto, e.vendorId);
                    if (selection) {
                        const ok = e.res.availableSlots.some((s) => s.startAt === selection.slotStartAt && s.endAt === selection.slotEndAt);
                        if (!ok) throw new BadRequestException(`Invalid delivery slot selection for vendor ${e.vendorId}`);
                        chosenSlotByVendor.set(e.vendorId, { startAt: selection.slotStartAt, endAt: selection.slotEndAt, source: 'CUSTOMER' });
                    } else {
                        const first = e.res.availableSlots[0];
                        chosenSlotByVendor.set(e.vendorId, { startAt: first.startAt, endAt: first.endAt, source: 'AUTO' });
                    }
                }

                // Create split orders
                const isCod = paymentMode === PaymentMode.COD;
                const orderStatus = isCod ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT;

                // Abandoned checkout only for ONLINE
                const paymentTimeoutMinutes = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '10', 10);
                const ttlSeconds = paymentTimeoutMinutes * 60;

                let checkoutGroup: any = null;
                let razorpayOrder: any = null;
                let abandonedCheckout: any = null;

                // Pre-create CheckoutGroup for ONLINE (so orders can reference)
                if (!isCod) {
                    checkoutGroup = await tx.checkoutGroup.create({
                        data: {
                            userId,
                            totalAmountPaise: 0, // set after computing totals
                            currency: 'INR',
                            status: 'PENDING_PAYMENT',
                        } as any,
                    });
                }

                const createdOrders: any[] = [];
                for (const vendorId of vendorIds) {
                    const items = vendorGroups.get(vendorId)!;
                    const subtotal = vendorSubtotals.find((v) => v.vendorId === vendorId)!.subtotal;
                    const allocDiscount = Number(discountByVendor.get(vendorId) || 0);
                    const totalAmountPaise = Math.max(0, subtotal - allocDiscount);

                    // Generate unique order number for this order
                    const orderNumber = await generateOrderNumber(this.prisma);

                    const created = await tx.order.create({
                        data: {
                            userId,
                            addressId: shippingAddressId,
                            orderNumber,
                            totalAmount: totalAmountPaise,
                            status: orderStatus,
                            itemsSnapshot: items as any,
                            giftId: selectedGiftId && giftVendorId === vendorId ? selectedGiftId : null,
                            couponCode: appliedCouponCode,
                            discountAmount: allocDiscount,
                            abandonedCheckoutId: null,
                            checkoutGroupId: checkoutGroup?.id || null,
                        } as any,
                    });
                    createdOrders.push({ ...created, vendorId, subtotal, allocDiscount, totalAmountPaise });

                    const slot = chosenSlotByVendor.get(vendorId)!;
                    await tx.orderDeliverySlotSnapshot.create({
                        data: {
                            orderId: created.id,
                            vendorId,
                            slotStartAt: new Date(slot.startAt),
                            slotEndAt: new Date(slot.endAt),
                            timezone: 'Asia/Kolkata',
                            source: slot.source,
                        } as any,
                    });

                    // === Financial snapshot + settlement (immutable after confirmation) ===
                    // Allocate the vendor-level discount to items proportionally (largest remainder)
                    const itemRaw = items.map((it: any) => {
                        const exact = subtotal > 0 ? (allocDiscount * Number(it.subtotal)) / subtotal : 0;
                        const floor = Math.floor(exact);
                        return { it, floor, frac: exact - floor };
                    });
                    let itemRemaining = allocDiscount - itemRaw.reduce((s: number, r: any) => s + r.floor, 0);
                    itemRaw.sort((a: any, b: any) => b.frac - a.frac);
                    const itemDiscounts = new Map<string, number>();
                    for (const r of itemRaw) {
                        const key = `${r.it.productId}:${r.it.variantId || ''}`;
                        itemDiscounts.set(key, r.floor);
                    }
                    let di = 0;
                    while (itemRemaining > 0 && itemRaw.length > 0) {
                        const r = itemRaw[di % itemRaw.length];
                        const key = `${r.it.productId}:${r.it.variantId || ''}`;
                        itemDiscounts.set(key, (itemDiscounts.get(key) || 0) + 1);
                        itemRemaining -= 1;
                        di += 1;
                    }

                    // Commission amount is computed per-item based on net (after-discount) amounts
                    let commissionAmountPaise = 0;
                    for (const it of items) {
                        const key = `${it.productId}:${it.variantId || ''}`;
                        const itemDiscount = Number(itemDiscounts.get(key) || 0);
                        const netItemSubtotal = Math.max(0, Number(it.subtotal) - itemDiscount);
                        commissionAmountPaise += await this.commissionService.calculateCommission(
                            netItemSubtotal,
                            String((it as any).categoryId),
                            vendorId,
                            String(it.productId),
                        );
                    }

                    const commissionRateBp =
                        totalAmountPaise > 0
                            ? Math.round((commissionAmountPaise * 10000) / totalAmountPaise)
                            : 0;
                    const vendorEarningsPaise = Math.max(0, totalAmountPaise - commissionAmountPaise);

                    await tx.orderFinancialSnapshot.create({
                        data: {
                            id: randomUUID(),
                            orderId: created.id,
                            subtotal: subtotal,
                            taxAmount: 0,
                            shippingAmount: 0,
                            discountAmount: allocDiscount,
                            giftCost: 0,
                            commissionRate: commissionRateBp,
                            commissionAmount: commissionAmountPaise,
                            vendorEarnings: vendorEarningsPaise,
                            platformEarnings: commissionAmountPaise,
                            currency: 'INR',
                        } as any,
                    });

                    await (tx as any).orderSettlement.create({
                        data: {
                            id: randomUUID(),
                            orderId: created.id,
                            vendorId,
                            amount: vendorEarningsPaise,
                            status: 'PENDING',
                        } as any,
                    });
                }

                // Clear cart items (both COD + ONLINE)
                await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

                if (isCod) {
                    // COD: deduct stock now (no payment confirm path). This also releases Redis reservations.
                    for (const o of createdOrders) {
                        const items = Array.isArray((o as any).itemsSnapshot) ? ((o as any).itemsSnapshot as any[]) : (vendorGroups.get(o.vendorId) || []);
                        for (const it of items) {
                            await this.inventoryService.deductStock(it.productId, it.quantity, it.variantId, tx);
                        }
                    }
                    return {
                        message: 'Orders placed successfully',
                        paymentMode: 'COD',
                        orders: createdOrders.map((o) => ({ orderId: o.id, vendorId: o.vendorId, totalAmountPaise: o.totalAmountPaise, discountPaise: o.allocDiscount })),
                    };
                }

                const groupTotalPaise = createdOrders.reduce((s, o) => s + Number(o.totalAmountPaise), 0);

                // Create abandoned checkout and payment records INSIDE transaction (without Razorpay IDs)
                // Razorpay API call will happen OUTSIDE the transaction to avoid holding DB locks during external I/O
                abandonedCheckout = await tx.abandonedCheckout.create({
                    data: {
                        userId,
                        cartSnapshot: { checkoutGroupId: checkoutGroup.id, orders: createdOrders.map((o) => ({ orderId: o.id, vendorId: o.vendorId, items: vendorGroups.get(o.vendorId) })) } as any,
                        financeSnapshot: { totalAmount: groupTotalPaise, currency: 'INR', discountAmount: discountAmountPaise } as any,
                        status: 'NEW',
                        abandonReason: 'PAYMENT_PENDING',
                        paymentMethod: 'ONLINE',
                        metadata: {
                            type: 'CHECKOUT_GROUP',
                            checkoutGroupId: checkoutGroup.id,
                            createdAt: new Date().toISOString(),
                        },
                        abandonedAt: new Date(),
                    } as any,
                });

                await tx.checkoutGroup.update({
                    where: { id: checkoutGroup.id },
                    data: { totalAmountPaise: groupTotalPaise },
                });

                // Create payment records with providerOrderId as null (will be linked after Razorpay call)
                for (const o of createdOrders) {
                    await tx.payment.create({
                        data: {
                            orderId: o.id,
                            amount: o.totalAmountPaise,
                            currency: 'INR',
                            provider: 'RAZORPAY',
                            providerOrderId: null,
                            status: 'PENDING',
                        } as any,
                    });
                    await tx.order.update({
                        where: { id: o.id },
                        data: { abandonedCheckoutId: abandonedCheckout.id },
                    });
                }

                // Return data needed for post-transaction Razorpay call
                return {
                    _needsRazorpay: true,
                    checkoutGroupId: checkoutGroup.id,
                    abandonedCheckoutId: abandonedCheckout.id,
                    groupTotalPaise,
                    ttlSeconds,
                    createdOrders: createdOrders.map((o) => ({ orderId: o.id, vendorId: o.vendorId, totalAmountPaise: o.totalAmountPaise, discountPaise: o.allocDiscount })),
                };
            });

            // PHASE 2: External API call OUTSIDE the database transaction
            // This prevents holding DB locks during network I/O to Razorpay
            if (result && (result as any)._needsRazorpay) {
                const txResult = result as any;
                const razorpayOrder = await this.paymentsService.generateRazorpayOrder(
                    txResult.groupTotalPaise, 'INR', txResult.checkoutGroupId, {
                        userId,
                        checkoutGroupId: txResult.checkoutGroupId,
                        orderIds: txResult.createdOrders.map((o: any) => o.orderId),
                    }
                );

                // Link Razorpay order ID to all related records
                await this.prisma.checkoutGroup.update({
                    where: { id: txResult.checkoutGroupId },
                    data: { providerOrderId: razorpayOrder.id } as any,
                });

                // Update all payments and orders with Razorpay order ID
                for (const o of txResult.createdOrders) {
                    await this.prisma.payment.updateMany({
                        where: { orderId: o.orderId, provider: 'RAZORPAY', status: 'PENDING' } as any,
                        data: { providerOrderId: razorpayOrder.id },
                    });
                    await this.prisma.order.update({
                        where: { id: o.orderId },
                        data: { razorpayOrderId: razorpayOrder.id } as any,
                    });
                }

                // Update abandoned checkout metadata with Razorpay order ID
                await this.prisma.abandonedCheckout.update({
                    where: { id: txResult.abandonedCheckoutId },
                    data: {
                        metadata: {
                            type: 'CHECKOUT_GROUP',
                            checkoutGroupId: txResult.checkoutGroupId,
                            razorpayOrderId: razorpayOrder.id,
                            createdAt: new Date().toISOString(),
                        },
                    } as any,
                });

                await this.redisService
                    .set(`payment:timeout:cg:${txResult.checkoutGroupId}`, txResult.abandonedCheckoutId, txResult.ttlSeconds)
                    .catch((err: any) => this.logger.warn(`Failed to set payment timeout TTL: ${err.message}`));

                return {
                    message: 'Checkout created, proceed to payment',
                    paymentMode: 'ONLINE',
                    checkoutGroupId: txResult.checkoutGroupId,
                    razorpayOrderId: razorpayOrder.id,
                    amountPaise: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID,
                    orders: txResult.createdOrders,
                };
            }

            return result;
        } catch (error) {
            // 🔐 P0 FIX: Release reservations on transaction failure
            this.logger.error(`Checkout failed, releasing reservations: ${error.message}`);
            for (const reserved of reservedItems) {
                await this.inventoryService.releaseStock(
                    reserved.productId,
                    reserved.quantity,
                    reserved.variantId
                ).catch(err => this.logger.error(`Failed to release reservation: ${err.message}`));
            }
            throw error;
        }
    }
}

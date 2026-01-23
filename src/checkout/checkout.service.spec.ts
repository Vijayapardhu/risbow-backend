import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMode } from './dto/checkout.dto';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prismaService: any;
  let inventoryService: any;
  let paymentsService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      cart: {
        findUnique: jest.fn(),
      },
      address: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      giftSKU: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockInventoryService = {
      reserveStock: jest.fn().mockResolvedValue(true),
      releaseStock: jest.fn().mockResolvedValue(undefined),
      deductStock: jest.fn().mockResolvedValue(undefined),
    };

    const mockPaymentsService = {
      generateRazorpayOrder: jest.fn(),
    };

    const mockGiftsService = {};
    const mockCouponsService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: GiftsService, useValue: mockGiftsService },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    prismaService = module.get(PrismaService);
    inventoryService = module.get(InventoryService);
    paymentsService = module.get(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Stock Reservation - P0 Security Fix', () => {
    const userId = 'user-123';
    const mockAddress = { id: 'addr-1', userId, city: 'Mumbai', state: 'MH', pincode: '400001' };
    const mockProduct = {
      id: 'product-1',
      title: 'Test Product',
      price: 1000,
      offerPrice: 900,
      stock: 10,
      categoryId: 'cat-1',
      vendorId: 'vendor-1',
      variants: null,
    };

    const mockCart = {
      id: 'cart-1',
      userId,
      items: [
        {
          productId: 'product-1',
          variantId: null,
          quantity: 2,
          product: mockProduct,
        },
      ],
    };

    beforeEach(() => {
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prismaService.order.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (prismaService.cartItem.deleteMany as jest.Mock).mockResolvedValue({});
      inventoryService.reserveStock.mockResolvedValue(true);
      inventoryService.releaseStock.mockResolvedValue(undefined);
    });

    it('should reserve stock before transaction', async () => {
      inventoryService.reserveStock.mockResolvedValue(true);

      await service.checkout(userId, {
        paymentMode: PaymentMode.COD,
        shippingAddressId: 'addr-1',
      });

      // Stock reservation should be called BEFORE transaction
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        'product-1',
        2,
        undefined
      );
    });

    it('should reserve variant stock when variantId provided', async () => {
      const cartWithVariant = {
        ...mockCart,
        items: [
          {
            productId: 'product-1',
            variantId: 'variant-1',
            quantity: 3,
            product: {
              ...mockProduct,
              variants: [{ id: 'variant-1', stock: 5, price: 1100 }],
            },
          },
        ],
      };

      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(cartWithVariant);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(cartWithVariant.items[0].product);
      inventoryService.reserveStock.mockResolvedValue(true);

      await service.checkout(userId, {
        paymentMode: PaymentMode.COD,
        shippingAddressId: 'addr-1',
      });

      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        'product-1',
        3,
        'variant-1'
      );
    });

    it('should release reservations if checkout transaction fails', async () => {
      inventoryService.reserveStock.mockResolvedValue(true);
      (prismaService.address.findUnique as jest.Mock).mockResolvedValue(null); // Will cause failure

      await expect(
        service.checkout(userId, {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
        })
      ).rejects.toThrow();

      // Reservations should be released on failure
      expect(inventoryService.releaseStock).toHaveBeenCalledWith(
        'product-1',
        2,
        undefined
      );
    });

    it('should release partial reservations if reservation fails midway', async () => {
      const cartWithMultiple = {
        ...mockCart,
        items: [
          { productId: 'product-1', variantId: null, quantity: 2, product: mockProduct },
          { productId: 'product-2', variantId: null, quantity: 3, product: { ...mockProduct, id: 'product-2' } },
        ],
      };

      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(cartWithMultiple);
      
      // First reservation succeeds, second fails
      inventoryService.reserveStock
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new BadRequestException('Insufficient stock'));

      await expect(
        service.checkout(userId, {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
        })
      ).rejects.toThrow('Insufficient stock');

      // First reservation should be released
      expect(inventoryService.releaseStock).toHaveBeenCalledWith(
        'product-1',
        2,
        undefined
      );
    });

    it('should not call releaseStock if no reservations were made', async () => {
      // First reservation fails immediately
      inventoryService.reserveStock.mockRejectedValue(new BadRequestException('Out of stock'));

      await expect(
        service.checkout(userId, {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
        })
      ).rejects.toThrow('Out of stock');

      // No reservations to release
      expect(inventoryService.releaseStock).not.toHaveBeenCalled();
    });
  });

  describe('Atomic Coupon Usage - P0 Fix', () => {
    const userId = 'user-123';
    const mockCart = {
      id: 'cart-1',
      userId,
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          product: { id: 'product-1', price: 1000, stock: 10, categoryId: 'cat-1', vendorId: 'v-1' },
        },
      ],
    };
    const mockAddress = { id: 'addr-1', userId };

    beforeEach(() => {
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(mockCart.items[0].product);
      inventoryService.reserveStock.mockResolvedValue(true);
      inventoryService.releaseStock.mockResolvedValue(undefined);
    });

    it('should use atomic updateMany for coupon usage increment', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'SAVE10',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        usageLimit: 100,
        usedCount: 50,
        minOrderAmount: 0,
      };

      (prismaService.coupon.findUnique as jest.Mock).mockResolvedValue(mockCoupon);
      (prismaService.coupon.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.order.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (prismaService.cartItem.deleteMany as jest.Mock).mockResolvedValue({});

      await service.checkout(userId, {
        paymentMode: PaymentMode.COD,
        shippingAddressId: 'addr-1',
        couponCode: 'SAVE10',
      });

      // Verify atomic coupon update with WHERE clause
      expect(prismaService.coupon.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'coupon-1',
            OR: expect.arrayContaining([
              { usageLimit: null },
              { usedCount: { lt: 100 } },
            ]),
          }),
          data: { usedCount: { increment: 1 } },
        })
      );
    });

    it('should reject if coupon usage limit exceeded (race condition)', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'LIMITED',
        isActive: true,
        discountType: 'FLAT',
        discountValue: 100,
        usageLimit: 10,
        usedCount: 9, // Almost at limit
      };

      (prismaService.coupon.findUnique as jest.Mock).mockResolvedValue(mockCoupon);
      (prismaService.coupon.updateMany as jest.Mock).mockResolvedValue({ count: 0 }); // Atomic check failed

      await expect(
        service.checkout(userId, {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
          couponCode: 'LIMITED',
        })
      ).rejects.toThrow('Coupon usage limit exceeded');
    });
  });

  describe('Cart Clearing - P0 Fix', () => {
    const userId = 'user-123';
    const mockCart = {
      id: 'cart-1',
      userId,
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          product: { id: 'product-1', price: 1000, stock: 10, categoryId: 'cat-1', vendorId: 'v-1' },
        },
      ],
    };
    const mockAddress = { id: 'addr-1', userId };

    beforeEach(() => {
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(mockCart.items[0].product);
      (prismaService.order.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
      inventoryService.reserveStock.mockResolvedValue(true);
    });

    it('should clear cart for COD payment', async () => {
      await service.checkout(userId, {
        paymentMode: PaymentMode.COD,
        shippingAddressId: 'addr-1',
      });

      expect(prismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });

    it('should clear cart for ONLINE payment', async () => {
      (paymentsService.generateRazorpayOrder as jest.Mock).mockResolvedValue({
        id: 'rzp_order_1',
        amount: 100000,
        currency: 'INR',
      });
      (prismaService.payment.create as jest.Mock).mockResolvedValue({});
      (prismaService.order.update as jest.Mock).mockResolvedValue({});

      await service.checkout(userId, {
        paymentMode: PaymentMode.ONLINE,
        shippingAddressId: 'addr-1',
      });

      // Cart should be cleared even for online payment
      expect(prismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });
  });

  describe('Empty Cart Handling', () => {
    it('should reject checkout with empty cart', async () => {
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [], // Empty
      });

      await expect(
        service.checkout('user-1', {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
        })
      ).rejects.toThrow('Cart is empty');
    });

    it('should reject checkout with no cart', async () => {
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkout('user-1', {
          paymentMode: PaymentMode.COD,
          shippingAddressId: 'addr-1',
        })
      ).rejects.toThrow('Cart is empty');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EcommerceEventsService } from '../recommendations/ecommerce-events.service';

describe('CartService', () => {
  let service: CartService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockPrismaService = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      cartInsight: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockRedisService = {
      setnx: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };

    const mockEvents = {
      track: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EcommerceEventsService, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Cart Locking - P0 Security Fix', () => {
    const userId = 'user-123';
    const mockProduct = {
      id: 'product-1',
      title: 'Test Product',
      price: 1000,
      offerPrice: 900,
      stock: 10,
      minOrderQuantity: 1,
      totalAllowedQuantity: 10,
      quantityStepSize: 1,
      categoryId: 'cat-1',
      variants: null,
    };

    const mockCart = {
      id: 'cart-1',
      userId,
      items: [],
    };

    it('should acquire lock before adding item', async () => {
      redisService.setnx.mockResolvedValue(1); // Lock acquired
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.cartItem.create as jest.Mock).mockResolvedValue({ id: 'item-1' });

      await service.addItem(userId, { productId: 'product-1', quantity: 1 });

      expect(redisService.setnx).toHaveBeenCalledWith(`cart:lock:${userId}`, '1');
      expect(redisService.expire).toHaveBeenCalledWith(`cart:lock:${userId}`, 10);
      expect(redisService.del).toHaveBeenCalledWith(`cart:lock:${userId}`);
    });

    it('should throw error if cart is locked by another operation', async () => {
      redisService.setnx.mockResolvedValue(0); // Lock NOT acquired (already locked)

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 1 })
      ).rejects.toThrow(BadRequestException);

      expect(redisService.setnx).toHaveBeenCalledWith(`cart:lock:${userId}`, '1');
      // Should not call product lookup if lock fails
      expect(prismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('should release lock even if operation fails', async () => {
      redisService.setnx.mockResolvedValue(1); // Lock acquired
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(null); // Product not found

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 1 })
      ).rejects.toThrow(NotFoundException);

      // Lock should still be released
      expect(redisService.del).toHaveBeenCalledWith(`cart:lock:${userId}`);
    });

    it('should acquire lock before updating item', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 1,
        product: mockProduct,
      });
      (prismaService.cartItem.update as jest.Mock).mockResolvedValue({ id: 'item-1' });

      await service.updateItem(userId, 'item-1', { quantity: 2 });

      expect(redisService.setnx).toHaveBeenCalledWith(`cart:lock:${userId}`, '1');
      expect(redisService.del).toHaveBeenCalledWith(`cart:lock:${userId}`);
    });

    it('should acquire lock before removing item', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      });
      (prismaService.cartItem.delete as jest.Mock).mockResolvedValue({ id: 'item-1' });

      await service.removeItem(userId, 'item-1');

      expect(redisService.setnx).toHaveBeenCalledWith(`cart:lock:${userId}`, '1');
      expect(redisService.del).toHaveBeenCalledWith(`cart:lock:${userId}`);
    });
  });

  describe('Quantity Validation Rules', () => {
    const userId = 'user-123';
    
    it('should reject quantity below minimum order quantity', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        price: 1000,
        stock: 100,
        minOrderQuantity: 5, // Minimum is 5
        totalAllowedQuantity: 50,
        quantityStepSize: 1,
      });

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 2 }) // Only 2, below minimum
      ).rejects.toThrow('Minimum order quantity is 5');

      expect(redisService.del).toHaveBeenCalled(); // Lock released
    });

    it('should reject quantity above maximum allowed', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        price: 1000,
        stock: 100,
        minOrderQuantity: 1,
        totalAllowedQuantity: 10, // Maximum is 10
        quantityStepSize: 1,
      });

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 15 }) // 15 exceeds max
      ).rejects.toThrow('Maximum allowed quantity is 10');

      expect(redisService.del).toHaveBeenCalled();
    });

    it('should reject quantity not matching step size', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        price: 1000,
        stock: 100,
        minOrderQuantity: 10,
        totalAllowedQuantity: 100,
        quantityStepSize: 5, // Must be in steps of 5
      });

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 12 }) // 12-10=2, not divisible by 5
      ).rejects.toThrow('Quantity must be in steps of 5 starting from 10');

      expect(redisService.del).toHaveBeenCalled();
    });
  });

  describe('Stock Validation', () => {
    const userId = 'user-123';

    it('should reject if stock is insufficient', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        price: 1000,
        stock: 5, // Only 5 in stock
        minOrderQuantity: 1,
        totalAllowedQuantity: 100,
        quantityStepSize: 1,
      });

      await expect(
        service.addItem(userId, { productId: 'product-1', quantity: 10 }) // Requesting 10
      ).rejects.toThrow('Insufficient stock. Available: 5');

      expect(redisService.del).toHaveBeenCalled();
    });

    it('should use variant stock when variantId is provided', async () => {
      redisService.setnx.mockResolvedValue(1);
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        price: 1000,
        stock: 100, // Base stock is 100
        minOrderQuantity: 1,
        totalAllowedQuantity: 100,
        quantityStepSize: 1,
        variants: [
          { id: 'variant-1', stock: 3, price: 1200 }, // Variant has only 3
        ],
      });

      await expect(
        service.addItem(userId, { productId: 'product-1', variantId: 'variant-1', quantity: 5 })
      ).rejects.toThrow('Insufficient stock. Available: 3');

      expect(redisService.del).toHaveBeenCalled();
    });
  });
});

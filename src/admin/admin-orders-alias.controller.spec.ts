import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrdersAliasController } from './admin-orders-alias.controller';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';

describe('AdminOrdersAliasController', () => {
  let controller: AdminOrdersAliasController;
  let prismaService: PrismaService;

  const mockOrdersService = {
    findAllOrders: jest.fn(),
    getOrderDetail: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersAliasController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(AdminJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminRolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminOrdersAliasController>(AdminOrdersAliasController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPosCustomer (Race Condition Tests)', () => {
    const customerData = {
      mobile: '9876543210',
      name: 'Test Customer',
      email: 'test@example.com',
    };

    it('should create a new customer when no race condition occurs', async () => {
      // Setup: User does not exist, Create succeeds
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValueOnce({
        id: 'new-user-id',
        ...customerData,
      });

      const result = await controller.createPosCustomer(customerData);

      expect(result.id).toBe('new-user-id');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should return existing customer if customer already exists (Normal Flow)', async () => {
      // Setup: User exists
      const existingUser = {
        id: 'existing-id',
        mobile: customerData.mobile,
        name: 'Old Name',
        email: 'old@example.com',
        role: 'CUSTOMER',
        coinsBalance: 100,
        referralCode: 'REF123'
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(existingUser);

      const result = await controller.createPosCustomer(customerData);
      
      expect(result).toEqual(existingUser);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle RACE CONDITION by retrying lookup and returning user', async () => {
      // Setup:
      // 1. findUnique -> null (simulating "not found" initially)
      // 2. create -> throws P2002 (simulating "someone else inserted it just now")
      // 3. findUnique (retry) -> returns user (simulating "now it is visible")
      
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // First check
        .mockResolvedValueOnce({ id: 'raced-user-id', mobile: customerData.mobile }); // Retry check

      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      mockPrismaService.user.create.mockRejectedValueOnce(p2002Error);

      const result = await controller.createPosCustomer(customerData);

      expect(result.id).toBe('raced-user-id');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2); // Called twice
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException if race condition persists (Ghost Error)', async () => {
      // Setup:
      // 1. findUnique -> null
      // 2. create -> throws P2002
      // 3. findUnique (retry) -> null (Critical consistency issue)

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      mockPrismaService.user.create.mockRejectedValueOnce(p2002Error);

      await expect(controller.createPosCustomer(customerData)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('_findOrCreatePosUser (Internal Helper via createPosOrder)', () => {
    // Note: Since _findOrCreatePosUser is private, we test it via createPosOrder or by casting controller to any
    // For simplicity, we can test the behavior via createPosOrder which uses it.

    it('should handle race condition in createPosOrder flow gracefully', async () => {
        const orderData = {
            items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, vendorId: 'vendor-1' }],
            customerMobile: '9999999999',
            customerName: 'Raced Customer'
        };

        // Mock product lookup to avoid errors earlier in the flow
        mockPrismaService.product.findMany.mockResolvedValue([
            { id: 'prod-1', vendorId: 'vendor-1' }
        ]);
        
        // Mock User Flow:
        // 1. findUnique -> null
        // 2. create -> throws P2002
        // 3. findUnique -> returns user
        
        mockPrismaService.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'recovered-id', mobile: '9999999999' });
            
        const p2002Error = new Error('Unique constraint failed');
        (p2002Error as any).code = 'P2002';
        mockPrismaService.user.create.mockRejectedValueOnce(p2002Error);

        // We expect it to proceed to create order using 'recovered-id'
        // We mock order.create to succeed
        mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });

        const result = await controller.createPosOrder(orderData, { user: { id: 'agent-1' } });

        // Verify that the recovered ID was used in order creation
        expect(mockPrismaService.order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'recovered-id'
                })
            })
        );
    });
  });
});
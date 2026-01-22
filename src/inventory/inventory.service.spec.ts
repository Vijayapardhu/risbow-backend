import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
    product: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
};

const mockRedisService = {
    get: jest.fn(),
    incrBy: jest.fn(),
    decrBy: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
};

describe('InventoryService', () => {
    let service: InventoryService;
    let prisma: typeof mockPrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: RedisService, useValue: mockRedisService },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        prisma = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deductStock', () => {
        it('should deduct stock for simple product successfully', async () => {
            mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
            mockRedisService.decrBy.mockResolvedValue(0); // For releaseStock

            await service.deductStock('prod-1', 5);

            expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
                where: { id: 'prod-1', stock: { gte: 5 } },
                data: { stock: { decrement: 5 } },
            });
        });

        it('should throw error if simple product has insufficient stock', async () => {
            mockPrismaService.product.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.deductStock('prod-1', 5)).rejects.toThrow(BadRequestException);
        });

        it('should deduct stock for variant successfully', async () => {
            const mockProduct = {
                id: 'prod-1',
                variants: [
                    { id: 'var-1', stock: 10, isActive: true },
                    { id: 'var-2', stock: 5, isActive: true }
                ],
                stock: 15
            };
            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
            mockRedisService.decrBy.mockResolvedValue(0);

            await service.deductStock('prod-1', 2, 'var-1');

            // 10 - 2 = 8
            // New Total = 8 + 5 = 13
            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: {
                    variants: [
                        { id: 'var-1', stock: 8, isActive: true },
                        { id: 'var-2', stock: 5, isActive: true }
                    ],
                    stock: 13
                }
            });
        });

        it('should throw error if variant has insufficient stock', async () => {
            const mockProduct = {
                id: 'prod-1',
                variants: [{ id: 'var-1', stock: 1 }],
            };
            mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

            await expect(service.deductStock('prod-1', 5, 'var-1')).rejects.toThrow(BadRequestException);
        });
    });
});

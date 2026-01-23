import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from './rooms.gateway';
import { RedisService } from '../shared/redis.service';
import { ConfigService } from '@nestjs/config';
import { RoomStatus, MemberStatus } from '@prisma/client';

describe('RoomsService', () => {
    let service: RoomsService;
    let prisma: PrismaService;
    let redis: RedisService;
    let config: ConfigService;

    const mockPrisma = {
        room: {
            findUnique: jest.fn(),
            create: jest.fn(),
            updateMany: jest.fn(),
            findMany: jest.fn(),
        },
        roomMember: {
            findUnique: jest.fn(),
            create: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
        },
        weeklyOffer: {
            findFirst: jest.fn(),
        },
        order: {
            findUnique: jest.fn(),
            aggregate: jest.fn(),
            update: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const mockRedis = {
        lpush: jest.fn(),
        ltrim: jest.fn(),
        lrange: jest.fn(),
    };

    const mockConfig = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomsService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: RedisService,
                    useValue: mockRedis,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfig,
                },
                {
                    provide: RoomsGateway,
                    useValue: {
                        server: {
                            to: jest.fn().mockReturnValue({
                                emit: jest.fn(),
                            }),
                        },
                    },
                },
            ],
        }).compile();

        service = module.get<RoomsService>(RoomsService);
        prisma = module.get<PrismaService>(PrismaService);
        redis = module.get<RedisService>(RedisService);
        config = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should enforce room size limits', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
                if (key === 'ROOM_MIN_SIZE') return 2;
                if (key === 'ROOM_MAX_SIZE') return 10;
                return defaultValue;
            });

            const createRoomDto = {
                name: 'Test Room',
                size: 5,
                unlockMinOrders: 3,
                unlockMinValue: 1000,
            };

            mockPrisma.weeklyOffer.findFirst.mockResolvedValue({
                id: 'offer1',
                endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });

            mockPrisma.room.create.mockResolvedValue({
                id: 'room1',
                ...createRoomDto,
            });

            const result = await service.create('user1', createRoomDto);
            expect(result).toBeDefined();
        });

        it('should reject room size below minimum', async () => {
            mockConfig.get.mockReturnValue(2);

            const createRoomDto = {
                name: 'Test Room',
                size: 1, // Below minimum
                unlockMinOrders: 3,
                unlockMinValue: 1000,
            };

            await expect(service.create('user1', createRoomDto)).rejects.toThrow(
                'Room size must be at least 2 members'
            );
        });

        it('should reject room size above maximum', async () => {
            mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
                if (key === 'ROOM_MIN_SIZE') return 2;
                if (key === 'ROOM_MAX_SIZE') return 10;
                return defaultValue;
            });

            const createRoomDto = {
                name: 'Test Room',
                size: 15, // Above maximum
                unlockMinOrders: 3,
                unlockMinValue: 1000,
            };

            await expect(service.create('user1', createRoomDto)).rejects.toThrow(
                'Room size cannot exceed 10 members'
            );
        });
    });

    describe('join', () => {
        it('should handle atomic room join', async () => {
            const roomId = 'room1';
            const userId = 'user1';

            const mockRoom = {
                id: roomId,
                status: RoomStatus.ACTIVE,
                size: 5,
            };

            const mockMember = {
                id: 'member1',
                roomId,
                userId,
                status: MemberStatus.PENDING,
            };

            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });

            mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
            mockPrisma.roomMember.findUnique.mockResolvedValue(null);
            mockPrisma.roomMember.count.mockResolvedValue(2);
            mockPrisma.roomMember.create.mockResolvedValue(mockMember);

            const result = await service.join(roomId, userId);
            expect(result).toEqual(mockMember);
        });
    });
});
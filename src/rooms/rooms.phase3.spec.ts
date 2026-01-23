import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from './rooms.gateway';
import { AuditLogService } from '../audit/audit.service';
import { RedisService } from '../shared/redis.service';
import { ConfigService } from '@nestjs/config';

describe('RoomsService (Phase 3.1: Linear Discount)', () => {
    let service: RoomsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomsService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
                {
                    provide: RoomsGateway,
                    useValue: { server: { to: () => ({ emit: () => { } }) } },
                },
                {
                    provide: AuditLogService,
                    useValue: { logAdminAction: jest.fn() },
                },
                {
                    provide: RedisService,
                    useValue: {},
                },
                {
                    provide: ConfigService,
                    useValue: { get: () => 100 },
                },
            ],
        }).compile();

        service = module.get<RoomsService>(RoomsService);
    });

    describe('calculateCurrentDiscount', () => {
        it('should return 0 if no maxDiscount or maxMembers', () => {
            expect(service.calculateCurrentDiscount({})).toBe(0);
        });

        it('should calculate 10% discount for 1 member (80% max, 8 members)', () => {
            const room = { maxDiscount: 80, maxMembers: 8, memberCount: 1 };
            expect(service.calculateCurrentDiscount(room)).toBe(10);
        });

        it('should calculate 30% discount for 3 members (80% max, 8 members)', () => {
            const room = { maxDiscount: 80, maxMembers: 8, memberCount: 3 };
            expect(service.calculateCurrentDiscount(room)).toBe(30);
        });

        it('should cap discount at maxDiscount (8 members for 80% max, 8 members)', () => {
            const room = { maxDiscount: 80, maxMembers: 8, memberCount: 8 };
            expect(service.calculateCurrentDiscount(room)).toBe(80);
        });

        it('should not exceed maxDiscount even if extra members join accidentally', () => {
            const room = { maxDiscount: 80, maxMembers: 8, memberCount: 9 };
            expect(service.calculateCurrentDiscount(room)).toBe(80);
        });

        it('should handle decimal discounts correctly', () => {
            const room = { maxDiscount: 33, maxMembers: 3, memberCount: 1 };
            expect(service.calculateCurrentDiscount(room)).toBe(11);
        });
    });
});

import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class RoomsController {
    private readonly roomsService;
    private readonly prisma;
    constructor(roomsService: RoomsService, prisma: PrismaService);
    create(req: any, createRoomDto: CreateRoomDto): Promise<{
        members: {
            status: import(".prisma/client").$Enums.MemberStatus;
            userId: string;
            roomId: string;
        }[];
    } & {
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        createdAt: Date;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    join(req: any, id: string): Promise<{
        status: import(".prisma/client").$Enums.MemberStatus;
        userId: string;
        roomId: string;
    } | {
        message: string;
        member: {
            status: import(".prisma/client").$Enums.MemberStatus;
            userId: string;
            roomId: string;
        };
    }>;
    linkOrder(roomId: string, orderId: string, req: any): Promise<{
        message: string;
    }>;
    findAll(status: RoomStatus): import(".prisma/client").Prisma.PrismaPromise<({
        members: {
            status: import(".prisma/client").$Enums.MemberStatus;
            userId: string;
            roomId: string;
        }[];
        createdBy: {
            name: string;
        };
    } & {
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        createdAt: Date;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    })[]>;
    findOne(id: string): Promise<{
        members: {
            status: import(".prisma/client").$Enums.MemberStatus;
            userId: string;
            roomId: string;
        }[];
    } & {
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        createdAt: Date;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
}

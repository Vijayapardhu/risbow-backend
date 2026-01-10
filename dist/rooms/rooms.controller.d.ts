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
            userId: string;
            status: import(".prisma/client").$Enums.MemberStatus;
            roomId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    join(req: any, id: string): Promise<{
        userId: string;
        status: import(".prisma/client").$Enums.MemberStatus;
        roomId: string;
    } | {
        message: string;
        member: {
            userId: string;
            status: import(".prisma/client").$Enums.MemberStatus;
            roomId: string;
        };
    }>;
    linkOrder(roomId: string, orderId: string, req: any): Promise<{
        message: string;
    }>;
    findAll(status: RoomStatus): import(".prisma/client").Prisma.PrismaPromise<({
        members: {
            userId: string;
            status: import(".prisma/client").$Enums.MemberStatus;
            roomId: string;
        }[];
        createdBy: {
            name: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
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
            userId: string;
            status: import(".prisma/client").$Enums.MemberStatus;
            roomId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
}

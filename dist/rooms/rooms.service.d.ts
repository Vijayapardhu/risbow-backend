import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsGateway } from './rooms.gateway';
export declare class RoomsService {
    private prisma;
    private roomsGateway;
    constructor(prisma: PrismaService, roomsGateway: RoomsGateway);
    create(userId: string, dto: CreateRoomDto): Promise<{
        members: {
            status: import(".prisma/client").$Enums.MemberStatus;
            userId: string;
            roomId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        unlockMinOrders: number;
        unlockMinValue: number;
        startAt: Date;
        endAt: Date;
        offerId: string;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    join(roomId: string, userId: string): Promise<{
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
    checkUnlockStatus(roomId: string): Promise<void>;
    linkOrder(roomId: string, userId: string, orderId: string): Promise<{
        message: string;
    }>;
    forceUnlock(roomId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        unlockMinOrders: number;
        unlockMinValue: number;
        startAt: Date;
        endAt: Date;
        offerId: string;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    expireRoom(roomId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        unlockMinOrders: number;
        unlockMinValue: number;
        startAt: Date;
        endAt: Date;
        offerId: string;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
}

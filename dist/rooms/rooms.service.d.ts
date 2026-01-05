import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsGateway } from './rooms.gateway';
export declare class RoomsService {
    private prisma;
    private roomsGateway;
    constructor(prisma: PrismaService, roomsGateway: RoomsGateway);
    create(userId: string, dto: CreateRoomDto): Promise<{
        members: {
            userId: string;
            status: import(".prisma/client").$Enums.MemberStatus;
            roomId: string;
        }[];
    } & {
        id: string;
        name: string;
        size: number;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoomStatus;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    join(roomId: string, userId: string): Promise<{
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
    checkUnlockStatus(roomId: string): Promise<void>;
    linkOrder(roomId: string, userId: string, orderId: string): Promise<{
        message: string;
    }>;
}

import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(data: {
        roomId: string;
    }, client: Socket): {
        event: string;
        roomId: string;
    };
    handleLeaveRoom(data: {
        roomId: string;
    }, client: Socket): {
        event: string;
        roomId: string;
    };
}

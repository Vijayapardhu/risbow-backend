import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'rooms',
    cors: {
        origin: '*',
    },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_room')
    handleJoinRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.join(data.roomId);
        console.log(`Client ${client.id} joined room ${data.roomId}`);
        return { event: 'joined', roomId: data.roomId };
    }

    @SubscribeMessage('leave_room')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.roomId);
        return { event: 'left', roomId: data.roomId };
    }
}

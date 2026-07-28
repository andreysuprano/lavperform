import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface HelpRequestedPayload {
  helpRequestId: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  userName: string;
  userPhone: string;
  chatId: string;
  lastMessage: string | null;
  requestedAt: string;
}

export interface HelpStatusPayload {
  helpRequestId: string;
  agentId: string;
}

@WebSocketGateway({ namespace: '/attendant', cors: { origin: '*' } })
export class AttendantGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server: Server;
  private readonly logger = new Logger(AttendantGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Attendant client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Attendant client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { agentId: string }): void {
    if (!payload?.agentId) return;
    const room = `agent:${payload.agentId}`;
    void client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { agentId: string }): void {
    if (!payload?.agentId) return;
    const room = `agent:${payload.agentId}`;
    void client.leave(room);
  }

  emitHelpRequested(agentId: string, payload: HelpRequestedPayload): void {
    this.server.to(`agent:${agentId}`).emit('help:requested', payload);
  }

  emitHelpClaimed(agentId: string, payload: HelpStatusPayload): void {
    this.server.to(`agent:${agentId}`).emit('help:claimed', payload);
  }

  emitHelpResolved(agentId: string, payload: HelpStatusPayload): void {
    this.server.to(`agent:${agentId}`).emit('help:resolved', payload);
  }
}

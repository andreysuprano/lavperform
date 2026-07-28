import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { AgentRunStepData } from '../../application/agent-trace/ports/agent-run-query.port';

export interface RunStartedPayload {
  runId: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  inputPrompt: string | undefined;
  startedAt: Date;
}

export interface RunStepPayload {
  runId: string;
  agentId: string;
  step: AgentRunStepData;
}

export interface RunCompletedPayload {
  runId: string;
  agentId: string;
  outputText: string;
  iterations: number;
  totalToolCalls: number;
  durationMs: number | undefined;
  finishedAt: Date;
}

export interface RunFailedPayload {
  runId: string;
  agentId: string;
  errorMessage: string;
  finishedAt: Date;
}

@WebSocketGateway({ namespace: '/agent-trace', cors: { origin: '*' } })
export class AgentTraceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server: Server;
  private readonly logger = new Logger(AgentTraceGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
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
    this.logger.debug(`Client ${client.id} unsubscribed from ${room}`);
  }

  emitRunStarted(agentId: string, payload: RunStartedPayload): void {
    this.server.to(`agent:${agentId}`).emit('run:started', payload);
  }

  emitRunStep(agentId: string, payload: RunStepPayload): void {
    this.server.to(`agent:${agentId}`).emit('run:step', payload);
  }

  emitRunCompleted(agentId: string, payload: RunCompletedPayload): void {
    this.server.to(`agent:${agentId}`).emit('run:completed', payload);
  }

  emitRunFailed(agentId: string, payload: RunFailedPayload): void {
    this.server.to(`agent:${agentId}`).emit('run:failed', payload);
  }
}

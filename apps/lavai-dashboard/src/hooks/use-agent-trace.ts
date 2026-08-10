'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  RunStartedPayload,
  RunStepPayload,
  RunCompletedPayload,
  RunFailedPayload,
} from '@/lib/types';
import { getPublicApiUrl } from '@/lib/env';

const API_URL = getPublicApiUrl();

export interface AgentTraceHandlers {
  onRunStarted?: (payload: RunStartedPayload) => void;
  onRunStep?: (payload: RunStepPayload) => void;
  onRunCompleted?: (payload: RunCompletedPayload) => void;
  onRunFailed?: (payload: RunFailedPayload) => void;
}

export function useAgentTrace(agentId: string | null, handlers: AgentTraceHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!agentId) return;

    const socket = io(`${API_URL}/agent-trace`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe', { agentId });
    });

    socket.on('run:started', (payload: RunStartedPayload) => {
      handlersRef.current.onRunStarted?.(payload);
    });

    socket.on('run:step', (payload: RunStepPayload) => {
      handlersRef.current.onRunStep?.(payload);
    });

    socket.on('run:completed', (payload: RunCompletedPayload) => {
      handlersRef.current.onRunCompleted?.(payload);
    });

    socket.on('run:failed', (payload: RunFailedPayload) => {
      handlersRef.current.onRunFailed?.(payload);
    });

    return () => {
      socket.emit('unsubscribe', { agentId });
      socket.disconnect();
    };
  }, [agentId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return socketRef;
}

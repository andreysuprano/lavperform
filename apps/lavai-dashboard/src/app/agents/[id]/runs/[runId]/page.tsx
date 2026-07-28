'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { api } from '@/lib/api';
import {
  AgentRunStep,
  AgentRunStatus,
  RunStepPayload,
  RunCompletedPayload,
  RunFailedPayload,
} from '@/lib/types';
import { useAgentTrace } from '@/hooks/use-agent-trace';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RunStatusBadge } from '@/components/agents/runs/run-status-badge';
import { StepItem } from '@/components/agents/runs/step-item';

import {
  Clock,
  Layers,
  Wrench,
  Bot,
  ArrowLeft,
  MessageSquare,
  MessageSquareReply,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border">
      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-widest">{label}</p>
        <p className="text-sm font-mono font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AgentRunDetailPage() {
  const { id: agentId, runId } = useParams<{ id: string; runId: string }>();

  const { data: agent } = useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => api.agents.get(agentId),
  });

  const { data: company } = useQuery({
    queryKey: ['companies', agent?.companyId],
    queryFn: () => api.companies.get(agent!.companyId),
    enabled: !!agent?.companyId,
  });

  const {
    data: run,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['agent-runs', runId],
    queryFn: () => api.agentRuns.get(runId),
  });

  const [liveSteps, setLiveSteps] = useState<AgentRunStep[]>([]);
  const [liveStatus, setLiveStatus] = useState<AgentRunStatus | null>(null);
  const [liveOutput, setLiveOutput] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState<number | null>(null);
  const [liveIterations, setLiveIterations] = useState<number | null>(null);
  const [liveTotalTools, setLiveTotalTools] = useState<number | null>(null);

  // Initialize live state from fetched run
  useEffect(() => {
    if (run) {
      setLiveSteps(run.steps);
      setLiveStatus(run.status);
      setLiveOutput(run.outputText);
      setLiveError(run.errorMessage);
      setLiveDuration(run.durationMs);
      setLiveIterations(run.iterations);
      setLiveTotalTools(run.totalToolCalls);
    }
  }, [run]);

  const isRunning = liveStatus === 'RUNNING';
  const shouldSubscribe = run?.status === 'RUNNING';

  const handleRunStep = useCallback(
    (payload: RunStepPayload) => {
      if (payload.runId !== runId) return;
      setLiveSteps((prev) => {
        const exists = prev.some((s) => s.id === payload.step.id);
        if (exists) return prev;
        return [...prev, payload.step];
      });
    },
    [runId]
  );

  const handleRunCompleted = useCallback(
    (payload: RunCompletedPayload) => {
      if (payload.runId !== runId) return;
      setLiveStatus('COMPLETED');
      setLiveOutput(payload.outputText);
      setLiveDuration(payload.durationMs);
      setLiveIterations(payload.iterations);
      setLiveTotalTools(payload.totalToolCalls);
    },
    [runId]
  );

  const handleRunFailed = useCallback(
    (payload: RunFailedPayload) => {
      if (payload.runId !== runId) return;
      setLiveStatus('FAILED');
      setLiveError(payload.errorMessage);
    },
    [runId]
  );

  useAgentTrace(shouldSubscribe ? agentId : null, {
    onRunStep: handleRunStep,
    onRunCompleted: handleRunCompleted,
    onRunFailed: handleRunFailed,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="px-6 py-3 border-b border-border">
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Execução não encontrada</p>
          <p className="text-xs text-muted-foreground">O ID informado não corresponde a nenhuma execução.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/agents/${agentId}/runs`}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const displayStatus = liveStatus ?? run.status;
  const displayDuration = liveDuration ?? run.durationMs;
  const displayIterations = liveIterations ?? run.iterations;
  const displayTotalTools = liveTotalTools ?? run.totalToolCalls;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || agent?.companyId || '...', href: `/companies/${agent?.companyId}` },
          { label: 'Agentes' },
          { label: agent?.name || '...', href: `/agents/${agentId}` },
          { label: 'Execuções', href: `/agents/${agentId}/runs` },
          { label: runId.slice(0, 8) + '…' },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* Header card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground/60 truncate max-w-64">
                    {runId}
                  </p>
                  <p className="text-xs text-muted-foreground/40">
                    {format(new Date(run.startedAt), "dd 'de' MMMM 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <RunStatusBadge status={displayStatus} />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 p-5">
              <MetricCard
                icon={Clock}
                label="Duração"
                value={formatDuration(displayDuration)}
              />
              <MetricCard
                icon={Layers}
                label="Iterações"
                value={String(displayIterations)}
              />
              <MetricCard
                icon={Wrench}
                label="Tool calls"
                value={String(displayTotalTools)}
              />
            </div>
          </div>

          {/* Input */}
          {run.inputPrompt && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
                  Mensagem recebida
                </span>
              </div>
              <p className="px-5 py-4 text-sm text-foreground/80 leading-relaxed">
                {run.inputPrompt}
              </p>
            </div>
          )}

          {/* Output */}
          {(liveOutput || run.outputText) && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                <MessageSquareReply className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/70">
                  Resposta do agente
                </span>
              </div>
              <p className="px-5 py-4 text-sm text-foreground/80 leading-relaxed">
                {liveOutput ?? run.outputText}
              </p>
            </div>
          )}

          {/* Error */}
          {(liveError || run.errorMessage) && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-red-400/70">
                  Erro
                </span>
              </div>
              <p className="px-5 py-4 text-sm text-red-300/80 font-mono leading-relaxed">
                {liveError ?? run.errorMessage}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
                Timeline de execução
              </span>
              <span className="text-xs font-mono text-muted-foreground/40">
                ({liveSteps.length} {liveSteps.length === 1 ? 'passo' : 'passos'})
              </span>
            </div>

            {liveSteps.length === 0 && !isRunning && (
              <div className="flex items-center justify-center py-12 rounded-2xl border border-border border-dashed">
                <p className="text-sm text-muted-foreground/50">Nenhum passo registrado</p>
              </div>
            )}

            <div className="space-y-0">
              {liveSteps.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    'transition-all duration-300',
                    i === liveSteps.length - 1 && isRunning ? 'animate-fade-in' : ''
                  )}
                >
                  <StepItem
                    step={step}
                    index={i}
                    isLast={i === liveSteps.length - 1 && !isRunning}
                  />
                </div>
              ))}

              {/* Running spinner */}
              {isRunning && (
                <div className="flex gap-4 items-center py-2 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center shrink-0 z-10">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400/70 font-mono">aguardando próximo passo...</span>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-blue-400/60 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back button */}
          <div className="pt-2 pb-6">
            <Button asChild variant="outline" size="sm" className="gap-2 text-muted-foreground">
              <Link href={`/agents/${agentId}/runs`}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para execuções
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { api } from '@/lib/api';
import { AgentRunSummary, AgentRunStatus } from '@/lib/types';
import { useAgentTrace } from '@/hooks/use-agent-trace';

import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RunStatusBadge } from '@/components/agents/runs/run-status-badge';

import {
  Activity,
  ChevronRight,
  Clock,
  RefreshCw,
  Layers,
  Wrench,
  Bot,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: AgentRunStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'RUNNING', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluídos' },
  { value: 'FAILED', label: 'Falhou' },
];

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function RunRow({ run, agentId }: { run: AgentRunSummary; agentId: string }) {
  const isLive = run.status === 'RUNNING';
  return (
    <Link
      href={`/agents/${agentId}/runs/${run.id}`}
      className={cn(
        'group flex items-center gap-4 px-5 py-4 border-b border-border transition-all duration-150',
        'hover:bg-card hover:border-border',
        isLive && 'bg-blue-500/5'
      )}
    >
      {/* Status */}
      <div className="w-28 shrink-0">
        <RunStatusBadge status={run.status} />
      </div>

      {/* Conversation / ID */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm text-foreground/90 truncate leading-tight">
          {run.inputPrompt || '—'}
        </p>
        <p className="text-xs font-mono text-muted-foreground/50 truncate">
          {run.conversationId}
        </p>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1.5 w-20 shrink-0 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono">{formatDuration(run.durationMs)}</span>
      </div>

      {/* Iterations */}
      <div className="flex items-center gap-1.5 w-16 shrink-0 text-xs text-muted-foreground">
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono">{run.iterations}</span>
      </div>

      {/* Tool calls */}
      <div className="flex items-center gap-1.5 w-16 shrink-0 text-xs text-muted-foreground">
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono">{run.totalToolCalls}</span>
      </div>

      {/* Date */}
      <div className="w-36 shrink-0 text-right">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true, locale: ptBR })}
        </p>
        <p className="text-xs font-mono text-muted-foreground/40">
          {format(new Date(run.startedAt), 'dd/MM HH:mm:ss')}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </Link>
  );
}

export default function AgentRunsPage() {
  const { id: agentId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AgentRunStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

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
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['agent-runs', agentId, statusFilter, page],
    queryFn: () =>
      api.agentRuns.list({
        agentId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 20,
      }),
  });

  const handleRunStarted = useCallback(
    (payload: { runId: string; agentId: string; companyId: string; conversationId: string; inputPrompt: string; startedAt: string }) => {
      if (payload.agentId !== agentId) return;
      queryClient.invalidateQueries({ queryKey: ['agent-runs', agentId] });
    },
    [agentId, queryClient]
  );

  const handleRunCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agent-runs', agentId] });
  }, [agentId, queryClient]);

  useAgentTrace(agentId, {
    onRunStarted: handleRunStarted,
    onRunCompleted: handleRunCompleted,
    onRunFailed: handleRunCompleted,
  });

  const runs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || agent?.companyId || '...', href: `/companies/${agent?.companyId}` },
          { label: 'Agentes' },
          { label: agent?.name || '...', href: `/agents/${agentId}` },
          { label: 'Execuções' },
        ]}
      />

      <PageHeader
        title="Execuções"
        description="Histórico e monitoramento em tempo real das execuções do agente"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/agents/${agentId}`}>
            <Bot className="w-3.5 h-3.5" />
            Ver agente
          </Link>
        </Button>
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-background">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              statusFilter === f.value
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-muted-foreground/60 font-mono">ao vivo</span>
          </div>
          <Zap className="w-3 h-3 text-blue-400/60" />
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-secondary">
        <div className="w-28 shrink-0 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Status</div>
        <div className="flex-1 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Mensagem / Conversa</div>
        <div className="w-20 shrink-0 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Duração</div>
        <div className="w-16 shrink-0 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Iter.</div>
        <div className="w-16 shrink-0 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Tools</div>
        <div className="w-36 shrink-0 text-xs font-mono uppercase tracking-widest text-muted-foreground/50 text-right">Data</div>
        <div className="w-4 shrink-0" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border">
                <Skeleton className="h-5 w-28 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Erro ao carregar execuções</p>
              <p className="text-xs text-muted-foreground">Verifique sua conexão e tente novamente</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Activity className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhuma execução registrada</p>
              <p className="text-xs text-muted-foreground">
                As execuções aparecerão aqui em tempo real quando o agente processar mensagens.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && runs.length > 0 && (
          <>
            {runs.map((run) => (
              <RunRow key={run.id} run={run} agentId={agentId} />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background">
          <p className="text-xs text-muted-foreground">
            {total} execuções · página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ConfigIndicator } from '@/components/ui/config-indicator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { AgentWithConfigs } from '@/lib/types';

export default function PlatformAgentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteAgent, setDeleteAgent] = useState<AgentWithConfigs | null>(null);

  const { data: agents, isLoading, isError, error } = useQuery({
    queryKey: ['platform-agents'],
    queryFn: () => api.platformAgents.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => api.platformAgents.delete(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-agents'] });
      toast.success('Agente excluído');
      setDeleteAgent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (agentId: string) => api.platformAgents.toggle(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-agents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <PageHeader
        title="Agentes da plataforma"
        description="Catálogo da Lavperform. Cada empresa usa esses agentes no contexto do usuário logado."
      >
        <Button asChild size="sm" className="gap-2">
          <Link href="/platform-agents/new">
            <Plus className="w-3.5 h-3.5" />
            Novo agente
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Não foi possível carregar os agentes'}</p>
            </div>
          ) : !agents || agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bot className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum agente da plataforma</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/platform-agents/new">Criar o primeiro</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Agente</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Configurações</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Criado em</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow
                    key={agent.id}
                    className="cursor-pointer hover:bg-secondary border-border transition-colors"
                    onClick={() => router.push(`/platform-agents/${agent.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-secondary border border-border flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{agent.name}</p>
                          {agent.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{agent.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <ConfigIndicator label="Persona" configured={!!agent.persona} />
                        <ConfigIndicator label="Modelo" configured={!!agent.modelConfig} />
                        <ConfigIndicator label="Memória" configured={!!agent.memoryConfig} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Switch
                          checked={agent.active}
                          onCheckedChange={() => toggleMutation.mutate(agent.id)}
                          disabled={toggleMutation.isPending}
                        />
                        <StatusBadge active={agent.active} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {format(new Date(agent.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteAgent(agent);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteAgent}
        onOpenChange={(open) => !open && setDeleteAgent(null)}
        title="Excluir agente"
        description={`Excluir ${deleteAgent?.name}? As conversas desse agente também saem.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteAgent && deleteMutation.mutate(deleteAgent.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
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
import {
  Bot,
  Building2,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  Hash,
} from 'lucide-react';
import { AgentData, AgentWithConfigs } from '@/lib/types';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteCompanyOpen, setDeleteCompanyOpen] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<AgentData | null>(null);

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['companies', id],
    queryFn: () => api.companies.get(id),
  });

  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['companies', id, 'agents'],
    queryFn: () => api.companies.agents(id),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: () => api.companies.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa excluída com sucesso');
      router.push('/companies');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => api.agents.delete(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', id, 'agents'] });
      toast.success('Agente excluído com sucesso');
      setDeleteAgent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleAgentMutation = useMutation({
    mutationFn: (agentId: string) => api.agents.toggle(agentId),
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey: ['companies', id, 'agents'] });
      const previous = queryClient.getQueryData<AgentData[]>(['companies', id, 'agents']);
      queryClient.setQueryData<AgentData[]>(['companies', id, 'agents'], (old) =>
        old?.map((a) => (a.id === agentId ? { ...a, active: !a.active } : a))
      );
      return { previous };
    },
    onError: (err: Error, _, context) => {
      queryClient.setQueryData(['companies', id, 'agents'], context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', id, 'agents'] });
    },
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || '...' },
        ]}
      />

      <PageHeader
        title={loadingCompany ? 'Carregando...' : (company?.name || 'Empresa')}
        description="Detalhes da empresa e agentes vinculados"
      >
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={`/companies/${id}/edit`}>
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
          onClick={() => setDeleteCompanyOpen(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Company details card */}
        {loadingCompany ? (
          <CompanyDetailSkeleton />
        ) : company ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-card">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Informações da Empresa</p>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
              <InfoField icon={<Building2 className="w-3.5 h-3.5" />} label="Nome" value={company.name} />
              <InfoField
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Slug"
                value={
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-primary border border-border">
                    {company.slug}
                  </span>
                }
              />
              <InfoField
                icon={<Mail className="w-3.5 h-3.5" />}
                label="E-mail"
                value={company.email || <span className="text-muted-foreground/40">—</span>}
              />
              <InfoField
                icon={<Phone className="w-3.5 h-3.5" />}
                label="Telefone"
                value={company.phone || <span className="text-muted-foreground/40">—</span>}
              />
              <InfoField
                label="Status"
                value={<StatusBadge active={company.active} />}
              />
              <InfoField
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="Criado em"
                value={
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(company.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                }
              />
            </div>
          </div>
        ) : null}

        {/* Agents section */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Agentes
              {agents && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {agents.length}
                </span>
              )}
            </p>
            <Button asChild size="sm" className="gap-2 h-7 text-xs">
              <Link href={`/companies/${id}/agents/new`}>
                <Plus className="w-3 h-3" />
                Novo Agente
              </Link>
            </Button>
          </div>

          {loadingAgents ? (
            <AgentsTableSkeleton />
          ) : !agents || agents.length === 0 ? (
            <AgentsEmptyState companyId={id} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Agente</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Configurações</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Criado em</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => {
                  const agentWithConfigs = agent as unknown as AgentWithConfigs;
                  return (
                    <TableRow
                      key={agent.id}
                      className="cursor-pointer hover:bg-secondary border-border transition-colors"
                      onClick={() => router.push(`/agents/${agent.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-secondary border border-border flex-shrink-0">
                            <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{agent.name}</p>
                            {agent.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{agent.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <ConfigIndicator label="Persona" configured={!!agentWithConfigs.persona} />
                          <ConfigIndicator label="Modelo" configured={!!agentWithConfigs.modelConfig} />
                          <ConfigIndicator label="Memória" configured={!!agentWithConfigs.memoryConfig} />
                          <ConfigIndicator label="Mídia" configured={!!agentWithConfigs.mediaConfig} />
                          <ConfigIndicator label="Filtros" configured={!!agentWithConfigs.filterConfig} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={agent.active}
                            onCheckedChange={() => toggleAgentMutation.mutate(agent.id)}
                            disabled={toggleAgentMutation.isPending}
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteAgent(agent)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-1" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteCompanyOpen}
        onOpenChange={setDeleteCompanyOpen}
        title="Excluir empresa"
        description={`Esta ação é irreversível e removerá a empresa "${company?.name}" junto com todos os agentes e histórico de conversas vinculados.`}
        onConfirm={() => deleteCompanyMutation.mutate()}
        loading={deleteCompanyMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteAgent}
        onOpenChange={(open) => !open && setDeleteAgent(null)}
        title="Excluir agente"
        description={`Esta ação removerá o agente "${deleteAgent?.name}" e todo o seu histórico de conversas. Esta operação é irreversível.`}
        onConfirm={() => deleteAgent && deleteAgentMutation.mutate(deleteAgent.id)}
        loading={deleteAgentMutation.isPending}
      />
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function CompanyDetailSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="p-5 grid grid-cols-4 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentsTableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-16 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );
}

function AgentsEmptyState({ companyId }: { companyId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary border border-border mb-3">
        <Bot className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum agente criado ainda</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">
        Crie seu primeiro agente de IA para começar a configurar personas, modelos e comportamentos.
      </p>
      <Button asChild size="sm" className="gap-2">
        <Link href={`/companies/${companyId}/agents/new`}>
          <Plus className="w-3.5 h-3.5" />
          Novo Agente
        </Link>
      </Button>
    </div>
  );
}

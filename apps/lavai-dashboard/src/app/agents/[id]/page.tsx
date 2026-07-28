'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PersonaTab } from '@/components/agents/persona-tab';
import { ModelTab } from '@/components/agents/model-tab';
import { MemoryTab } from '@/components/agents/memory-tab';
import { MediaTab } from '@/components/agents/media-tab';
import { FiltersTab } from '@/components/agents/filters-tab';
import { JourneyTab } from '@/components/agents/journey-tab';
import { RagTab } from '@/components/agents/rag-tab';
import { McpTab } from '@/components/agents/mcp-tab';

import { Trash2, Bot, Webhook, Copy, Check, Activity } from 'lucide-react';

function WebhookUrlCard({ companyId, agentId }: { companyId: string; agentId: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const webhookUrl = `${baseUrl}/webhooks/${companyId}/${agentId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar a URL');
    }
  };

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Webhook className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Webhook</span>
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border font-mono text-xs">
        <span className="text-muted-foreground/60 flex-shrink-0">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/</span>
        <span className="text-primary flex-shrink-0">{companyId}</span>
        <span className="text-muted-foreground/40 flex-shrink-0">/</span>
        <span className="text-primary flex-shrink-0">{agentId}</span>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground"
        title="Copiar URL do webhook"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400">Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copiar</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agents', id],
    queryFn: () => api.agents.get(id),
  });

  const { data: company } = useQuery({
    queryKey: ['companies', agent?.companyId],
    queryFn: () => api.companies.get(agent!.companyId),
    enabled: !!agent?.companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.agents.delete(id),
    onSuccess: () => {
      toast.success('Agente excluído com sucesso');
      if (agent?.companyId) {
        queryClient.invalidateQueries({ queryKey: ['companies', agent.companyId, 'agents'] });
        router.push(`/companies/${agent.companyId}`);
      } else {
        router.push('/companies');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.agents.toggle(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['agents', id] });
      const previous = queryClient.getQueryData(['agents', id]);
      queryClient.setQueryData(['agents', id], (old: typeof agent) =>
        old ? { ...old, active: !old.active } : old
      );
      return { previous };
    },
    onError: (err: Error, _, context) => {
      queryClient.setQueryData(['agents', id], context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="px-6 py-3 border-b border-border">
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Bot className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Agente não encontrado</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/companies">Voltar para Empresas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || agent.companyId, href: `/companies/${agent.companyId}` },
          { label: 'Agentes' },
          { label: agent.name },
        ]}
      />

      <PageHeader title={agent.name} description={agent.description || 'Agente de IA'}>
        <div className="flex items-center gap-2">
          <Switch
            checked={agent.active}
            onCheckedChange={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          />
          <StatusBadge active={agent.active} />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir
        </Button>
      </PageHeader>

      <WebhookUrlCard companyId={agent.companyId} agentId={agent.id} />

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="persona" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card flex items-center justify-between">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-0">
              {[
                { value: 'persona', label: 'Persona', configured: !!agent.persona },
                { value: 'model', label: 'Modelo LLM', configured: !!agent.modelConfig },
                { value: 'memory', label: 'Memória', configured: !!agent.memoryConfig },
                { value: 'media', label: 'Mídia', configured: !!agent.mediaConfig },
                { value: 'filters', label: 'Filtros', configured: !!agent.filterConfig },
                { value: 'journey', label: 'Jornada', configured: !!agent.journeyConfig?.enabled },
                { value: 'rag', label: 'Base RAG', configured: false },
                { value: 'mcp', label: 'Ferramentas MCP', configured: false },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  {tab.label}
                  {tab.configured && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <Link
              href={`/agents/${id}/runs`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-transparent hover:border-border mb-px"
            >
              <Activity className="w-3.5 h-3.5" />
              Execuções
            </Link>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="persona" className="mt-0 animate-fade-in">
              <PersonaTab agentId={id} persona={agent.persona} />
            </TabsContent>
            <TabsContent value="model" className="mt-0 animate-fade-in">
              <ModelTab agentId={id} modelConfig={agent.modelConfig} />
            </TabsContent>
            <TabsContent value="memory" className="mt-0 animate-fade-in">
              <MemoryTab agentId={id} memoryConfig={agent.memoryConfig} />
            </TabsContent>
            <TabsContent value="media" className="mt-0 animate-fade-in">
              <MediaTab agentId={id} mediaConfig={agent.mediaConfig} />
            </TabsContent>
            <TabsContent value="filters" className="mt-0 animate-fade-in">
              <FiltersTab agentId={id} filterConfig={agent.filterConfig} />
            </TabsContent>
            <TabsContent value="journey" className="mt-0 animate-fade-in">
              <JourneyTab
                agentId={id}
                companyId={agent.companyId}
                journeyConfig={agent.journeyConfig}
              />
            </TabsContent>
            <TabsContent value="rag" className="mt-0 animate-fade-in">
              <RagTab agentId={id} companyId={agent.companyId} />
            </TabsContent>
            <TabsContent value="mcp" className="mt-0 animate-fade-in">
              <McpTab agentId={id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir agente"
        description={`Esta ação removerá o agente "${agent.name}" e todo o seu histórico de conversas. Esta operação é irreversível.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

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
import { McpTab } from '@/components/agents/mcp-tab';

import { Trash2, Bot, Activity } from 'lucide-react';

export default function PlatformAgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: agent, isLoading } = useQuery({
    queryKey: ['platform-agents', id],
    queryFn: () => api.platformAgents.get(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.platformAgents.delete(id),
    onSuccess: () => {
      toast.success('Agente excluído');
      queryClient.invalidateQueries({ queryKey: ['platform-agents'] });
      router.push('/platform-agents');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.platformAgents.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-agents', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-agents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
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
          <Link href="/platform-agents">Voltar</Link>
        </Button>
      </div>
    );
  }

  const tabs = [
    { value: 'persona', label: 'Persona', configured: !!agent.persona },
    { value: 'model', label: 'Modelo LLM', configured: !!agent.modelConfig },
    { value: 'memory', label: 'Memória', configured: !!agent.memoryConfig },
    { value: 'mcp', label: 'Ferramentas MCP', configured: false },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Agentes da plataforma', href: '/platform-agents' },
          { label: agent.name },
        ]}
      />

      <PageHeader title={agent.name} description={agent.description || 'Agente da Lavperform'}>
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

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="persona" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card flex items-center justify-between">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-0">
              {tabs.map((tab) => (
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
              <PersonaTab agentId={id} persona={agent.persona} scope="platform" />
            </TabsContent>
            <TabsContent value="model" className="mt-0 animate-fade-in">
              <ModelTab agentId={id} modelConfig={agent.modelConfig} scope="platform" />
            </TabsContent>
            <TabsContent value="memory" className="mt-0 animate-fade-in">
              <MemoryTab agentId={id} memoryConfig={agent.memoryConfig} scope="platform" />
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
        description={`Esta ação remove "${agent.name}" e as conversas dele.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

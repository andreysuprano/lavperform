'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewAgentModelPicker } from '@/components/agents/new-agent-model-picker';

const agentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),

  // Persona
  personaName: z.string().optional(),
  personaDescription: z.string().optional(),
  systemPrompt: z.string().optional(),
  behaviorGuidelines: z.string().optional(),
  guardrails: z.string().optional(),
  contextPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  voiceTone: z.enum(['FORMAL', 'INFORMAL', 'FRIENDLY', 'PROFESSIONAL', 'EMPATHETIC', 'ASSERTIVE']).optional(),
  communicationStyle: z.enum(['CONCISE', 'DETAILED', 'TECHNICAL', 'SIMPLIFIED', 'BALANCED']).optional(),
  language: z.enum(['PT_BR', 'EN_US', 'ES_ES']).optional(),

  // Model
  modelName: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(16384).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  streaming: z.boolean().optional(),

  // Memory
  memoryType: z.enum(['BUFFER', 'SUMMARY', 'VECTOR', 'NONE']).optional(),
  windowSize: z.number().min(1).max(100).optional(),
  maxSummaryTokens: z.number().min(100).optional(),
  useLongTermMemory: z.boolean().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 bg-card hover:bg-card transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="p-5 border-t border-border space-y-4 bg-card">
          {children}
        </div>
      )}
    </div>
  );
}

export default function NewAgentPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: () => api.companies.get(companyId),
  });

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      temperature: 0.7,
      maxTokens: 1024,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      streaming: true,
      memoryType: 'BUFFER',
      windowSize: 10,
      useLongTermMemory: false,
    },
  });

  const memoryType = form.watch('memoryType');

  const mutation = useMutation({
    mutationFn: (data: AgentFormValues) => {
      const { name, description, ...rest } = data;

      const persona = rest.personaName || rest.systemPrompt
        ? {
            personaName: rest.personaName,
            personaDescription: rest.personaDescription,
            systemPrompt: rest.systemPrompt,
            behaviorGuidelines: rest.behaviorGuidelines,
            guardrails: rest.guardrails,
            contextPrompt: rest.contextPrompt,
            welcomeMessage: rest.welcomeMessage,
            voiceTone: rest.voiceTone,
            communicationStyle: rest.communicationStyle,
            language: rest.language,
          }
        : undefined;

      const modelConfig = rest.modelName
        ? {
            modelName: rest.modelName,
            temperature: rest.temperature,
            maxTokens: rest.maxTokens,
            topP: rest.topP,
            frequencyPenalty: rest.frequencyPenalty,
            presencePenalty: rest.presencePenalty,
            streaming: rest.streaming,
          }
        : undefined;

      const memoryConfig = rest.memoryType
        ? {
            memoryType: rest.memoryType,
            windowSize: rest.windowSize,
            maxSummaryTokens: rest.maxSummaryTokens,
            useLongTermMemory: rest.useLongTermMemory,
          }
        : undefined;

      return api.agents.create(companyId, { name, description, persona, modelConfig, memoryConfig });
    },
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'agents'] });
      toast.success('Agente criado com sucesso!');
      router.push(`/agents/${agent.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || '...', href: `/companies/${companyId}` },
          { label: 'Novo Agente' },
        ]}
      />
      <PageHeader title="Novo Agente" description="Configure o agente de IA para esta empresa">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              {/* Basic info */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Dados Básicos</p>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Assistente de Vendas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o propósito deste agente..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Persona section */}
              <CollapsibleSection title="Persona" description="Configuração de identidade e comportamento do agente (opcional)">
                <FormField
                  control={form.control}
                  name="personaName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da persona</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sofia" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt <span className="text-primary text-xs">(campo crítico)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Você é um assistente especializado em..."
                          className="resize-none font-mono text-xs"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs flex justify-end">
                        {(field.value?.length || 0).toLocaleString()} caracteres
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="voiceTone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tom de voz</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['FORMAL', 'INFORMAL', 'FRIENDLY', 'PROFESSIONAL', 'EMPATHETIC', 'ASSERTIVE'].map((v) => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="communicationStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estilo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['CONCISE', 'DETAILED', 'TECHNICAL', 'SIMPLIFIED', 'BALANCED'].map((v) => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PT_BR">Português (BR)</SelectItem>
                            <SelectItem value="EN_US">English (US)</SelectItem>
                            <SelectItem value="ES_ES">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="behaviorGuidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regras de comportamento</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Diretrizes de conduta..." className="resize-none" rows={3} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardrails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardrails</FormLabel>
                      <FormControl>
                        <Textarea placeholder="O que o agente NÃO deve fazer..." className="resize-none" rows={3} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CollapsibleSection>

              {/* Model section */}
              <CollapsibleSection title="Modelo LLM" description="Selecione o modelo via OpenRouter e configure os parâmetros (opcional)">
                <FormField
                  control={form.control}
                  name="modelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <NewAgentModelPicker value={field.value || ''} onChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Temperature</FormLabel>
                        <span className="text-xs font-mono text-primary">{field.value?.toFixed(1)}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value ?? 0.7]}
                          onValueChange={([v]) => field.onChange(v)}
                          className="mt-2"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">0 = determinístico · 2 = máxima criatividade</FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Tokens</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={16384}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streaming"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Streaming</FormLabel>
                        <div className="flex items-center gap-3 h-9">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <span className="text-xs text-muted-foreground">
                            {field.value ? 'Ativado' : 'Desativado'}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleSection>

              {/* Memory section */}
              <CollapsibleSection title="Memória" description="Tipo de memória e contexto das conversas (opcional)">
                <FormField
                  control={form.control}
                  name="memoryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de memória</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BUFFER">BUFFER — Últimas N mensagens</SelectItem>
                          <SelectItem value="SUMMARY">SUMMARY — Resumo progressivo</SelectItem>
                          <SelectItem value="VECTOR">VECTOR — Busca semântica</SelectItem>
                          <SelectItem value="NONE">NONE — Sem memória</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {memoryType === 'BUFFER' && (
                  <FormField
                    control={form.control}
                    name="windowSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamanho da janela</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Número de mensagens mantidas no contexto</FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                {memoryType === 'SUMMARY' && (
                  <FormField
                    control={form.control}
                    name="maxSummaryTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max tokens do resumo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={100}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="useLongTermMemory"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          <FormLabel className="text-sm cursor-pointer">Memória de longo prazo</FormLabel>
                          <FormDescription className="text-xs">Persistência de informações entre sessões</FormDescription>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </CollapsibleSection>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[140px]">
                  {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Criar Agente
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

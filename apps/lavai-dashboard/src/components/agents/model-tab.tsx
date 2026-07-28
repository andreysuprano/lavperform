'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentModelConfig, LLMModel } from '@/lib/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Pencil, X, Info, Search, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const modelSchema = z.object({
  modelName: z.string().min(1, 'Selecione um modelo'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(16384),
  topP: z.number().min(0).max(1),
  frequencyPenalty: z.number().min(-2).max(2),
  presencePenalty: z.number().min(-2).max(2),
  streaming: z.boolean(),
});

type ModelFormValues = z.infer<typeof modelSchema>;

const MODEL_HINTS: Record<string, string> = {
  temperature: 'Controla a aleatoriedade. 0 = determinístico, 2 = máxima criatividade.',
  topP: 'Nucleus sampling. Valores menores focam em tokens mais prováveis.',
  frequencyPenalty: 'Penaliza tokens que já aparecem frequentemente no texto gerado.',
  presencePenalty: 'Penaliza tokens que aparecem no texto, incentivando novos tópicos.',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  mistralai: 'Mistral AI',
  'meta-llama': 'Meta (Llama)',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  microsoft: 'Microsoft',
};

function getProvider(modelId: string): string {
  return modelId.split('/')[0] ?? 'other';
}

function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n === 0) return 'Grátis';
  if (n < 0.000001) return `$${(n * 1_000_000).toFixed(4)}/Mtok`;
  return `$${(n * 1_000_000).toFixed(2)}/Mtok`;
}

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M ctx`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K ctx`;
  return `${tokens} ctx`;
}

// ─────────────────────────────────────────────
// Model Picker Dropdown (custom, com filtro)
// ─────────────────────────────────────────────
interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  models: LLMModel[];
  isLoading: boolean;
  isError: boolean;
}

function ModelPicker({ value, onChange, models, isLoading, isError }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedModel = models.find((m) => m.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
    );
  }, [models, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LLMModel[]>();
    for (const m of filtered) {
      const p = getProvider(m.id);
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(m);
    }
    return map;
  }, [filtered]);

  // Fallback: input de texto quando a API falhar
  if (isError) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/80">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          Não foi possível carregar a lista de modelos. Digite o ID manualmente.
        </div>
        <Input
          className="font-mono text-xs"
          placeholder="openai/gpt-4o"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full h-9 px-3 rounded-md border text-sm transition-colors',
          'border-input bg-input hover:border-ring/60 focus:outline-none focus:ring-1 focus:ring-ring',
          open && 'border-ring ring-1 ring-ring'
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando modelos...
          </span>
        ) : selectedModel ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-foreground truncate">{selectedModel.name}</span>
            <span className="font-mono text-xs text-muted-foreground flex-shrink-0 truncate hidden sm:block">
              {selectedModel.id}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Selecione um modelo...</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-md border border-border bg-card shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome ou ID..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {grouped.size === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum modelo encontrado para &ldquo;{search}&rdquo;
              </p>
            ) : (
              Array.from(grouped.entries()).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="sticky top-0 px-3 py-1.5 bg-secondary backdrop-blur-sm border-b border-border">
                    <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                      {getProviderLabel(provider)}
                    </span>
                  </div>
                  {providerModels.map((model) => {
                    const isSelected = model.id === value;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onChange(model.id);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-secondary transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                              {model.name}
                            </span>
                            {model.contextLength && (
                              <span className="flex-shrink-0 text-xs font-mono text-muted-foreground/60 bg-secondary px-1 rounded">
                                {formatContext(model.contextLength)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-muted-foreground truncate block">
                            {model.id}
                          </span>
                          {model.pricing && (
                            <span className="text-xs text-muted-foreground/60">
                              Input: {formatPrice(model.pricing.prompt)} · Output: {formatPrice(model.pricing.completion)}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Slider Field
// ─────────────────────────────────────────────
function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
          {value.toFixed(step < 0.1 ? 2 : 1)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between text-xs font-mono text-muted-foreground/50">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Model Metadata Card (readonly, exibe info do modelo selecionado)
// ─────────────────────────────────────────────
function ModelMetaCard({ model }: { model: LLMModel }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md bg-primary/5 border border-primary/15 text-xs">
      {model.description && (
        <span className="text-muted-foreground flex-1 min-w-0 truncate">{model.description}</span>
      )}
      <div className="flex items-center gap-3 flex-shrink-0">
        {model.contextLength && (
          <span className="font-mono text-primary">
            <span className="text-muted-foreground mr-1">ctx</span>
            {formatContext(model.contextLength)}
          </span>
        )}
        {model.pricing && (
          <>
            <span className="text-border">·</span>
            <span className="font-mono text-muted-foreground">
              in <span className="text-foreground">{formatPrice(model.pricing.prompt)}</span>
              {' / '}
              out <span className="text-foreground">{formatPrice(model.pricing.completion)}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
interface ModelTabProps {
  agentId: string;
  modelConfig: AgentModelConfig | null;
}

export function ModelTab({ agentId, modelConfig }: ModelTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: models = [],
    isLoading: modelsLoading,
    isError: modelsError,
  } = useQuery({
    queryKey: ['llm-models'],
    queryFn: api.llm.models,
    staleTime: 5 * 60 * 1000, // cache 5min
    retry: 2,
  });

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      modelName: modelConfig?.modelName || '',
      temperature: modelConfig?.temperature ?? 0.7,
      maxTokens: modelConfig?.maxTokens ?? 1024,
      topP: modelConfig?.topP ?? 1,
      frequencyPenalty: modelConfig?.frequencyPenalty ?? 0,
      presencePenalty: modelConfig?.presencePenalty ?? 0,
      streaming: modelConfig?.streaming ?? true,
    },
  });

  const selectedModelName = form.watch('modelName');
  const selectedModelMeta = models.find((m) => m.id === selectedModelName);

  const mutation = useMutation({
    mutationFn: (data: ModelFormValues) =>
      api.agents.updateModelConfig(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      toast.success('Modelo LLM atualizado com sucesso!');
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Read-only view ──────────────────────────
  if (!editing) {
    const savedMeta = models.find((m) => m.id === modelConfig?.modelName);
    return (
      <div className="max-w-3xl">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Modelo LLM</p>
            <Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" />
              Editar
            </Button>
          </div>

          {modelConfig ? (
            <div className="p-5 space-y-4">
              {/* Model name block */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Modelo</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                    {modelConfig.modelName}
                  </span>
                  {savedMeta?.name && savedMeta.name !== modelConfig.modelName && (
                    <span className="text-sm text-foreground">{savedMeta.name}</span>
                  )}
                </div>
                {savedMeta && <ModelMetaCard model={savedMeta} />}
              </div>

              {/* Params grid */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                {[
                  { label: 'Temperature', value: modelConfig.temperature },
                  { label: 'Max Tokens', value: modelConfig.maxTokens },
                  { label: 'Top P', value: modelConfig.topP },
                  { label: 'Freq. Penalty', value: modelConfig.frequencyPenalty },
                  { label: 'Pres. Penalty', value: modelConfig.presencePenalty },
                  { label: 'Streaming', value: modelConfig.streaming ? 'Ativado' : 'Desativado' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-sm font-mono text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma configuração de modelo definida.</p>
              <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
                Configurar Modelo
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit form ───────────────────────────────
  return (
    <div className="max-w-3xl">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Editar Modelo LLM</p>
          <Button size="sm" variant="ghost" className="gap-2 h-7 text-xs" onClick={() => setEditing(false)}>
            <X className="w-3 h-3" />
            Cancelar
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-6">

            {/* Model picker */}
            <FormField
              control={form.control}
              name="modelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo OpenRouter</FormLabel>
                  <FormControl>
                    <ModelPicker
                      value={field.value}
                      onChange={field.onChange}
                      models={models}
                      isLoading={modelsLoading}
                      isError={modelsError}
                    />
                  </FormControl>
                  {/* Metadata hint below picker */}
                  {selectedModelMeta && (
                    <ModelMetaCard model={selectedModelMeta} />
                  )}
                  {!selectedModelMeta && field.value && !modelsLoading && (
                    <FormDescription className="font-mono text-xs">
                      ID selecionado: {field.value}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            {/* Sliders */}
            <div className="space-y-6 pt-2 border-t border-border">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <SliderField
                      label="Temperature"
                      min={0} max={2} step={0.1}
                      value={field.value}
                      onChange={field.onChange}
                      hint={MODEL_HINTS.temperature}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topP"
                render={({ field }) => (
                  <FormItem>
                    <SliderField
                      label="Top P"
                      min={0} max={1} step={0.05}
                      value={field.value}
                      onChange={field.onChange}
                      hint={MODEL_HINTS.topP}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequencyPenalty"
                render={({ field }) => (
                  <FormItem>
                    <SliderField
                      label="Frequency Penalty"
                      min={-2} max={2} step={0.1}
                      value={field.value}
                      onChange={field.onChange}
                      hint={MODEL_HINTS.frequencyPenalty}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="presencePenalty"
                render={({ field }) => (
                  <FormItem>
                    <SliderField
                      label="Presence Penalty"
                      min={-2} max={2} step={0.1}
                      value={field.value}
                      onChange={field.onChange}
                      hint={MODEL_HINTS.presencePenalty}
                    />
                  </FormItem>
                )}
              />
            </div>

            {/* Max tokens + streaming */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
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
                    <FormDescription className="text-xs">1 – 16.384</FormDescription>
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
                        {field.value ? 'Ativado — tokens em tempo real' : 'Desativado — resposta completa'}
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Modelo
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

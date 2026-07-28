'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LLMModel } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Loader2, Search, AlertTriangle, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function getProvider(id: string) {
  return id.split('/')[0] ?? 'other';
}
function getProviderLabel(p: string) {
  return PROVIDER_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}
function formatContext(tokens: number) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M ctx`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K ctx`;
  return `${tokens} ctx`;
}

interface NewAgentModelPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function NewAgentModelPicker({ value, onChange }: NewAgentModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: models = [], isLoading, isError } = useQuery({
    queryKey: ['llm-models'],
    queryFn: api.llm.models,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const selectedModel = models.find((m: LLMModel) => m.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m: LLMModel) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
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

  if (isError) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/80">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          Falha ao carregar modelos. Digite o ID manualmente.
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full h-9 px-3 rounded-md border text-sm transition-colors',
          'border-input bg-input hover:border-ring/60 focus:outline-none',
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
            <span className="font-mono text-xs text-muted-foreground hidden sm:block truncate">{selectedModel.id}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Selecione um modelo...</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-md border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
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
              <button type="button" onClick={() => setSearch('')}>
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {grouped.size === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-muted-foreground">Nenhum modelo encontrado</p>
            ) : (
              Array.from(grouped.entries()).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="sticky top-0 px-3 py-1.5 bg-secondary backdrop-blur-sm border-b border-border">
                    <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                      {getProviderLabel(provider)}
                    </span>
                  </div>
                  {providerModels.map((model: LLMModel) => {
                    const isSelected = model.id === value;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { onChange(model.id); setOpen(false); setSearch(''); }}
                        className={cn(
                          'w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <span className={cn('text-sm font-medium block truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                            {model.name}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground block truncate">
                            {model.id}
                            {model.contextLength ? ` · ${formatContext(model.contextLength)}` : ''}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />}
    </div>
  );
}

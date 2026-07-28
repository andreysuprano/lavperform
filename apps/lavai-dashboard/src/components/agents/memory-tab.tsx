'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentMemoryConfig } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil, X, AlertTriangle } from 'lucide-react';

const memorySchema = z.object({
  memoryType: z.enum(['BUFFER', 'SUMMARY', 'VECTOR', 'NONE']),
  windowSize: z.number().min(1).max(100).optional(),
  maxSummaryTokens: z.number().min(100).optional(),
  useLongTermMemory: z.boolean(),
});

type MemoryFormValues = z.infer<typeof memorySchema>;

const MEMORY_DESCRIPTIONS: Record<string, { title: string; description: string; color: string }> = {
  BUFFER: {
    title: 'Buffer',
    description: 'Mantém as últimas N mensagens como contexto direto na janela de contexto.',
    color: 'text-blue-400',
  },
  SUMMARY: {
    title: 'Summary',
    description: 'Gera um resumo progressivo das conversas antigas para economizar tokens.',
    color: 'text-violet-400',
  },
  VECTOR: {
    title: 'Vector',
    description: 'Busca semântica no histórico via embeddings. Requer RAG ativo.',
    color: 'text-amber-400',
  },
  NONE: {
    title: 'Nenhuma',
    description: 'Sem memória. Cada mensagem é tratada de forma isolada.',
    color: 'text-zinc-400',
  },
};

interface MemoryTabProps {
  agentId: string;
  memoryConfig: AgentMemoryConfig | null;
}

export function MemoryTab({ agentId, memoryConfig }: MemoryTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      memoryType: memoryConfig?.memoryType || 'BUFFER',
      windowSize: memoryConfig?.windowSize || 10,
      maxSummaryTokens: memoryConfig?.maxSummaryTokens || 500,
      useLongTermMemory: memoryConfig?.useLongTermMemory || false,
    },
  });

  const memoryType = form.watch('memoryType');

  const mutation = useMutation({
    mutationFn: (data: MemoryFormValues) => api.agents.updateMemoryConfig(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      toast.success('Configuração de memória atualizada!');
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Memória & Contexto</p>
            <Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" />
              Editar
            </Button>
          </div>
          {memoryConfig ? (
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Tipo de Memória</p>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-secondary border border-border text-xs font-mono font-semibold">
                    {memoryConfig.memoryType}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {MEMORY_DESCRIPTIONS[memoryConfig.memoryType]?.description}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                {memoryConfig.memoryType === 'BUFFER' && (
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Janela</p>
                    <p className="text-sm font-mono text-foreground">{memoryConfig.windowSize} msgs</p>
                  </div>
                )}
                {memoryConfig.memoryType === 'SUMMARY' && (
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Max Tokens Resumo</p>
                    <p className="text-sm font-mono text-foreground">{memoryConfig.maxSummaryTokens}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Memória Longo Prazo</p>
                  <p className="text-sm font-mono text-foreground">{memoryConfig.useLongTermMemory ? 'Ativada' : 'Desativada'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma configuração de memória definida.</p>
              <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
                Configurar Memória
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Editar Memória</p>
          <Button size="sm" variant="ghost" className="gap-2 h-7 text-xs" onClick={() => setEditing(false)}>
            <X className="w-3 h-3" />
            Cancelar
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-6">
            <FormField
              control={form.control}
              name="memoryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Memória</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MEMORY_DESCRIPTIONS).map(([value, { title, description }]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span className="font-mono">{value} — {title}</span>
                            <span className="text-xs text-muted-foreground">{description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {memoryType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {MEMORY_DESCRIPTIONS[memoryType]?.description}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {memoryType === 'VECTOR' && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  O modo VECTOR requer RAG (Retrieval-Augmented Generation) configurado e ativo. Sem isso, o agente pode não funcionar corretamente.
                </p>
              </div>
            )}

            {memoryType === 'BUFFER' && (
              <FormField
                control={form.control}
                name="windowSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanho da Janela</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Número de mensagens mantidas no contexto ativo (1–100)
                    </FormDescription>
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
                    <FormLabel>Max Tokens do Resumo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Limite de tokens para o resumo progressivo (mínimo 100)
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="useLongTermMemory"
              render={({ field }) => (
                <FormItem className="border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm cursor-pointer">Memória de Longo Prazo</FormLabel>
                      <FormDescription className="text-xs">
                        Persiste informações relevantes entre sessões de conversa distintas
                      </FormDescription>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Memória
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentFilterConfig } from '@/lib/types';
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
import { Switch } from '@/components/ui/switch';
import { TagInput } from '@/components/ui/tag-input';
import { Loader2, Pencil, X, Info, Filter, Zap } from 'lucide-react';

const filterSchema = z.object({
  allowedPhones: z.array(z.string()),
  allowedGroups: z.array(z.string()),
  triggerEnabled: z.boolean(),
  triggerWords: z.array(z.string()),
  triggerCaseSensitive: z.boolean(),
  triggerRemoveFromText: z.boolean(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface FiltersTabProps {
  agentId: string;
  filterConfig: AgentFilterConfig | null;
}

function ReadonlyTags({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/50 italic">Todos permitidos (vazio)</span>
      )}
    </div>
  );
}

export function FiltersTab({ agentId, filterConfig }: FiltersTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      allowedPhones: filterConfig?.allowedPhones || [],
      allowedGroups: filterConfig?.allowedGroups || [],
      triggerEnabled: filterConfig?.triggerEnabled || false,
      triggerWords: filterConfig?.triggerWords || [],
      triggerCaseSensitive: filterConfig?.triggerCaseSensitive || false,
      triggerRemoveFromText: filterConfig?.triggerRemoveFromText || false,
    },
  });

  const triggerEnabled = form.watch('triggerEnabled');

  const mutation = useMutation({
    mutationFn: (data: FilterFormValues) => api.agents.updateFilterConfig(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      toast.success('Configuração de filtros atualizada!');
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" />
            Editar
          </Button>
        </div>

        {filterConfig ? (
          <>
            {/* Access filter */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Filtro de Acesso</p>
              </div>
              <div className="p-5 space-y-4">
                <ReadonlyTags label="Telefones Permitidos" tags={filterConfig.allowedPhones} />
                <ReadonlyTags label="Grupos Permitidos" tags={filterConfig.allowedGroups} />
              </div>
            </div>

            {/* Trigger */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Gatilho Textual</p>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  filterConfig.triggerEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  {filterConfig.triggerEnabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {filterConfig.triggerEnabled && (
                <div className="p-5 space-y-4">
                  <ReadonlyTags label="Palavras de Gatilho" tags={filterConfig.triggerWords} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Case Sensitive</p>
                      <p className="text-sm text-foreground">{filterConfig.triggerCaseSensitive ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Remover do Texto</p>
                      <p className="text-sm text-foreground">{filterConfig.triggerRemoveFromText ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">Nenhuma configuração de filtros definida.</p>
            <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Configurar Filtros
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Access filter */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Filtro de Acesso</p>
            </div>
            <div className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="allowedPhones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefones Permitidos</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="5511999990001 · Enter para adicionar"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Formato E.164 sem &quot;+&quot; (ex: 5511999990001). Deixe vazio para aceitar todos.
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowedGroups"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupos Permitidos</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="120363XXXX@g.us · Enter para adicionar"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      chatId do grupo WhatsApp (ex: 120363XXXX@g.us). Deixe vazio para aceitar todos.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Trigger */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Gatilho Textual</p>
            </div>
            <div className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="triggerEnabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Habilitar Gatilho</FormLabel>
                        <FormDescription className="text-xs">
                          Quando ativo, o agente só responde se encontrar uma trigger word na mensagem
                        </FormDescription>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {triggerEnabled && (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                    <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/80">
                      Quando habilitado, o agente ignora mensagens que não contenham nenhuma das palavras configuradas.
                      Para áudio, a validação ocorre na transcrição Whisper.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="triggerWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palavras de Gatilho</FormLabel>
                        <FormControl>
                          <TagInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="@bot · Enter para adicionar"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Ex: @bot, ajuda, /start
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="triggerCaseSensitive"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-sm">Case Sensitive</FormLabel>
                          </div>
                          <FormDescription className="text-xs pl-11">
                            Diferencia maiúsculas de minúsculas
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="triggerRemoveFromText"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-sm">Remover do Texto</FormLabel>
                          </div>
                          <FormDescription className="text-xs pl-11">
                            Remove o gatilho antes de enviar ao LLM
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar Filtros
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

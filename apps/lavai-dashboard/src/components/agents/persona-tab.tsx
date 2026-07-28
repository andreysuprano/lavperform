'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentPersona } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Pencil, X } from 'lucide-react';

const personaSchema = z.object({
  personaName: z.string().min(1, 'Nome da persona é obrigatório'),
  personaDescription: z.string().optional(),
  systemPrompt: z.string().min(1, 'System prompt é obrigatório'),
  behaviorGuidelines: z.string().optional(),
  guardrails: z.string().optional(),
  contextPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  voiceTone: z.enum(['FORMAL', 'INFORMAL', 'FRIENDLY', 'PROFESSIONAL', 'EMPATHETIC', 'ASSERTIVE']),
  communicationStyle: z.enum(['CONCISE', 'DETAILED', 'TECHNICAL', 'SIMPLIFIED', 'BALANCED']),
  language: z.enum(['PT_BR', 'EN_US', 'ES_ES']),
});

type PersonaFormValues = z.infer<typeof personaSchema>;

interface PersonaTabProps {
  agentId: string;
  persona: AgentPersona | null;
}

function ReadonlyField({ label, value, large = false }: { label: string; value?: string | null; large?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value && value.length > 200;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
      {value ? (
        <div className="relative">
          <p
            className={`text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed ${
              large ? 'text-xs' : ''
            } ${isLong && !expanded ? 'line-clamp-4' : ''}`}
          >
            {value}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-primary hover:text-primary transition-colors"
            >
              {expanded ? 'Ver menos' : 'Ver mais...'}
            </button>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground/40 italic">Não configurado</span>
      )}
    </div>
  );
}

export function PersonaTab({ agentId, persona }: PersonaTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      personaName: persona?.personaName || '',
      personaDescription: persona?.personaDescription || '',
      systemPrompt: persona?.systemPrompt || '',
      behaviorGuidelines: persona?.behaviorGuidelines || '',
      guardrails: persona?.guardrails || '',
      contextPrompt: persona?.contextPrompt || '',
      welcomeMessage: persona?.welcomeMessage || '',
      voiceTone: persona?.voiceTone || 'PROFESSIONAL',
      communicationStyle: persona?.communicationStyle || 'BALANCED',
      language: persona?.language || 'PT_BR',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PersonaFormValues) => api.agents.updatePersona(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      toast.success('Persona atualizada com sucesso!');
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const systemPrompt = form.watch('systemPrompt');

  if (!editing) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Persona & Prompts</p>
            <Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" />
              Editar
            </Button>
          </div>
          {persona ? (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <ReadonlyField label="Nome da Persona" value={persona.personaName} />
                <ReadonlyField label="Idioma" value={persona.language} />
                <ReadonlyField label="Tom de Voz" value={persona.voiceTone} />
                <ReadonlyField label="Estilo de Comunicação" value={persona.communicationStyle} />
              </div>
              <div className="border-t border-border pt-5">
                <ReadonlyField label="System Prompt" value={persona.systemPrompt} large />
              </div>
              <ReadonlyField label="Regras de Comportamento" value={persona.behaviorGuidelines} />
              <ReadonlyField label="Guardrails" value={persona.guardrails} />
              <ReadonlyField label="Contexto do Negócio" value={persona.contextPrompt} />
              <ReadonlyField label="Mensagem de Boas-vindas" value={persona.welcomeMessage} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma persona configurada ainda.</p>
              <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
                Configurar Persona
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Editar Persona</p>
          <Button size="sm" variant="ghost" className="gap-2 h-7 text-xs" onClick={() => setEditing(false)}>
            <X className="w-3 h-3" />
            Cancelar
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="personaName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Persona <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sofia" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="voiceTone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tom de Voz</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="communicationStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilo de Comunicação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                name="personaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Persona</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição interna..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      System Prompt <span className="text-destructive">*</span>
                      <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">CRÍTICO</span>
                    </FormLabel>
                    <span className="text-xs font-mono text-muted-foreground">
                      {systemPrompt?.length?.toLocaleString() || 0} chars
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Você é um assistente especializado em..."
                      className="resize-none font-mono text-xs leading-relaxed"
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Principal instrução enviada ao LLM. Define o comportamento fundamental do agente.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="behaviorGuidelines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regras de Comportamento</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Diretrizes de conduta do agente..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
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
                    <Textarea
                      placeholder="O que o agente NÃO deve fazer..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contextPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contexto do Negócio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações da empresa injetadas no prompt..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem de Boas-vindas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Olá! Como posso ajudar você hoje?"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Persona
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

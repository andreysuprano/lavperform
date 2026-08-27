'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentJourneyConfig, AgentNotificationConfig, FollowUpStep } from '@/lib/types';
import { toast } from 'sonner';
import { getPublicApiUrl } from '@/lib/env';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Pencil, X, Plus, Copy, Check, Route, Clock } from 'lucide-react';

const followUpStepSchema = z.object({
  id: z.string().uuid(),
  delayMinutes: z.number().min(1).max(1440),
  delayFrom: z.enum(['JOURNEY_START', 'PREVIOUS_STEP']),
  message: z.string().min(1).max(1000),
  askForHelp: z.boolean(),
  active: z.boolean(),
});

const DEFAULT_HELP_KEYWORDS = ['problema', 'ajuda', 'atendente', 'humano'];

const journeySchema = z.object({
  enabled: z.boolean(),
  journeyTrigger: z.enum(['FIRST_MESSAGE', 'MENU_LINK_SENT', 'MANUAL']),
  followUpEnabled: z.boolean(),
  cancelOnReply: z.boolean(),
  followUpSteps: z.array(followUpStepSchema).max(10),
  helpKeywords: z.array(z.string().min(1).max(50)).max(20),
  helpAutoEscalate: z.boolean(),
  helpAckMessage: z.string().max(500).optional().nullable(),
  purchaseWebhookEnabled: z.boolean(),
  helpNotificationPhone: z.string(),
  helpNotificationIgnoreReplies: z.boolean(),
});

type JourneyFormValues = z.infer<typeof journeySchema>;

interface JourneyTabProps {
  agentId: string;
  companyId: string;
  journeyConfig: AgentJourneyConfig | null;
  notificationConfig: AgentNotificationConfig | null;
}

function defaultSteps(): FollowUpStep[] {
  return [
    {
      id: crypto.randomUUID(),
      delayMinutes: 15,
      delayFrom: 'JOURNEY_START',
      message: 'Oi {nome}! Conseguiu finalizar o serviço?',
      askForHelp: false,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      delayMinutes: 30,
      delayFrom: 'PREVIOUS_STEP',
      message: 'Precisa de ajuda para finalizar? Responda SIM que te conecto com alguém.',
      askForHelp: true,
      active: true,
    },
  ];
}

function computeTimelineMinutes(steps: FollowUpStep[]): number[] {
  let accumulated = 0;
  return steps
    .filter((s) => s.active)
    .map((s) => {
      if (s.delayFrom === 'JOURNEY_START') {
        accumulated = s.delayMinutes;
      } else {
        accumulated += s.delayMinutes;
      }
      return accumulated;
    });
}

function PurchaseWebhookCard({ companyId, agentId }: { companyId: string; agentId: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = getPublicApiUrl();
  const url = `${baseUrl}/companies/${companyId}/agents/${agentId}/customers/purchase-complete`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar a URL');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Webhook de compra efetuada
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs break-all px-3 py-2 rounded-md bg-secondary border border-border">
          POST {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border hover:border-primary/40"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Body: {'{ "phone": "5511999887766", "orderId": "opcional" }'}
      </p>
    </div>
  );
}

export function JourneyTab({
  agentId,
  companyId,
  journeyConfig,
  notificationConfig,
}: JourneyTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<JourneyFormValues>({
    resolver: zodResolver(journeySchema),
    defaultValues: {
      enabled: journeyConfig?.enabled ?? false,
      journeyTrigger: journeyConfig?.journeyTrigger ?? 'FIRST_MESSAGE',
      followUpEnabled: journeyConfig?.followUpEnabled ?? true,
      cancelOnReply: journeyConfig?.cancelOnReply ?? true,
      followUpSteps: journeyConfig?.followUpSteps?.length
        ? journeyConfig.followUpSteps
        : defaultSteps(),
      helpKeywords: journeyConfig?.helpKeywords?.length
        ? journeyConfig.helpKeywords
        : DEFAULT_HELP_KEYWORDS,
      helpAutoEscalate: journeyConfig?.helpAutoEscalate ?? true,
      helpAckMessage: journeyConfig?.helpAckMessage ?? 'Aguarde, vou chamar alguém para te ajudar!',
      purchaseWebhookEnabled: journeyConfig?.purchaseWebhookEnabled ?? true,
      helpNotificationPhone: notificationConfig?.helpNotificationPhone ?? '',
      helpNotificationIgnoreReplies:
        notificationConfig?.helpNotificationIgnoreReplies ?? true,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'followUpSteps',
  });

  const watchedSteps = form.watch('followUpSteps');
  const enabled = form.watch('enabled');
  const timelineMinutes = computeTimelineMinutes(watchedSteps ?? []);

  const mutation = useMutation({
    mutationFn: async (data: JourneyFormValues) => {
      const digits = data.helpNotificationPhone.replace(/\D/g, '');
      if (data.enabled && !digits) {
        throw new Error('Informe um telefone de notificação para habilitar a jornada.');
      }
      await api.agents.updateNotificationConfig(agentId, {
        helpNotificationEnabled: data.enabled,
        helpNotificationIgnoreReplies: data.helpNotificationIgnoreReplies,
        ...(digits ? { helpNotificationPhone: digits } : {}),
      });
      return api.agents.updateJourneyConfig(agentId, {
        enabled: data.enabled,
        journeyTrigger: data.journeyTrigger,
        followUpEnabled: data.followUpEnabled,
        cancelOnReply: data.cancelOnReply,
        followUpSteps: data.followUpSteps,
        helpKeywords: data.helpKeywords,
        helpAutoEscalate: data.helpAutoEscalate,
        helpAckMessage: data.helpAckMessage,
        purchaseWebhookEnabled: data.purchaseWebhookEnabled,
      });
    },
    onSuccess: () => {
      toast.success('Jornada atualizada');
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = (data: JourneyFormValues) => {
    if (data.enabled && data.followUpEnabled && !data.followUpSteps.some((s) => s.active)) {
      toast.warning('Jornada ativa sem steps de follow-up — considere adicionar pelo menos um.');
    }
    mutation.mutate(data);
  };

  if (!editing) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Jornada do Cliente</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Jornada habilitada</span>
            <span>{journeyConfig?.enabled ? 'Sim' : 'Não'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Telefone de notificação</span>
            <span>{notificationConfig?.helpNotificationPhone ?? '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Ignorar respostas do número</span>
            <span>
              {notificationConfig?.helpNotificationIgnoreReplies !== false ? 'Sim' : 'Não'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Gatilho</span>
            <span>{journeyConfig?.journeyTrigger ?? 'FIRST_MESSAGE'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Steps de follow-up</span>
            <span>{journeyConfig?.followUpSteps?.filter((s) => s.active).length ?? 0}</span>
          </div>
        </div>

        {(journeyConfig?.followUpSteps?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" />
              Timeline preview
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">+0 min — Início da jornada (1ª mensagem)</p>
              {computeTimelineMinutes(journeyConfig?.followUpSteps ?? []).map((min, i) => (
                <p key={i} className="text-muted-foreground">
                  +{min} min — {journeyConfig?.followUpSteps?.[i]?.message.slice(0, 60)}...
                </p>
              ))}
            </div>
          </div>
        )}

        <PurchaseWebhookCard companyId={companyId} agentId={agentId} />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Editar Jornada</h3>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <FormLabel>Habilitar jornada</FormLabel>
                <FormDescription>Ativa follow-ups e escalação humana para este agente</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {enabled && (
          <>
            <FormField
              control={form.control}
              name="helpNotificationPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone para notificação</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="5511999999999"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Obrigatório. Recebe o alerta no WhatsApp quando o cliente pedir atendimento humano.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="helpNotificationIgnoreReplies"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <FormLabel>Ignorar respostas deste número</FormLabel>
                    <FormDescription>
                      Se o responsável responder o alerta, a IA não conversa com ele.
                    </FormDescription>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="journeyTrigger"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gatilho da jornada</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="FIRST_MESSAGE">Primeira mensagem do cliente</SelectItem>
                  <SelectItem value="MENU_LINK_SENT">Link da loja enviado</SelectItem>
                  <SelectItem value="MANUAL">Manual (via API)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="followUpEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <FormLabel className="text-sm">Follow-ups</FormLabel>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancelOnReply"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <FormLabel className="text-sm">Cancelar ao responder</FormLabel>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormLabel>Cadência de follow-ups</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Step {index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`followUpSteps.${index}.delayMinutes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Delay (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={1440} {...field} onChange={(e) => field.onChange(+e.target.value)} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`followUpSteps.${index}.delayFrom`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Referência</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="JOURNEY_START">Início da jornada</SelectItem>
                          <SelectItem value="PREVIOUS_STEP">Step anterior</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name={`followUpSteps.${index}.message`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mensagem</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Variáveis: {'{nome}'}, {'{telefone}'}</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`followUpSteps.${index}.active`}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="text-xs">Ativo</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={fields.length >= 10}
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                delayMinutes: 30,
                delayFrom: 'PREVIOUS_STEP',
                message: '',
                askForHelp: false,
                active: true,
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar step
          </Button>
        </div>

        {timelineMinutes.length > 0 && (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Preview da timeline</p>
            <p>+0 min — Início</p>
            {timelineMinutes.map((min, i) => (
              <p key={i}>+{min} min — Step {i + 1}</p>
            ))}
          </div>
        )}

        <FormField
          control={form.control}
          name="helpKeywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords de escalação</FormLabel>
              <FormControl>
                <TagInput value={field.value} onChange={field.onChange} placeholder="problema, ajuda, atendente..." />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="helpAckMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem ao solicitar ajuda</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="helpAutoEscalate"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
              <FormLabel>Escalação automática por keyword</FormLabel>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchaseWebhookEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
              <FormLabel>Webhook de compra habilitado</FormLabel>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormItem>
          )}
        />

        <PurchaseWebhookCard companyId={companyId} agentId={agentId} />
      </form>
    </Form>
  );
}

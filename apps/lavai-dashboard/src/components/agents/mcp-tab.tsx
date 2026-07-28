'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { McpServerData, McpTransport } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Plug,
  Terminal,
  Globe,
  X,
  AlertTriangle,
} from 'lucide-react';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const kvSchema = z.object({ key: z.string(), value: z.string() });

const mcpFormSchema = z.discriminatedUnion('transport', [
  z.object({
    transport: z.literal('STDIO'),
    name: z.string().min(1, 'Nome é obrigatório'),
    enabled: z.boolean(),
    command: z.string().min(1, 'Comando é obrigatório'),
    args: z.array(z.string()),
    env: z.array(kvSchema),
  }),
  z.object({
    transport: z.literal('SSE'),
    name: z.string().min(1, 'Nome é obrigatório'),
    enabled: z.boolean(),
    url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
    headers: z.array(kvSchema),
  }),
]);

type McpFormValues = z.infer<typeof mcpFormSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kvToRecord(pairs: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(pairs.filter((p) => p.key.trim()).map((p) => [p.key, p.value]));
}

function recordToKv(rec: Record<string, string> | undefined): { key: string; value: string }[] {
  if (!rec) return [];
  return Object.entries(rec).map(([key, value]) => ({ key, value }));
}

function defaultValues(server?: McpServerData): McpFormValues {
  if (!server) {
    return {
      transport: 'STDIO',
      name: '',
      enabled: true,
      command: '',
      args: [],
      env: [],
    };
  }
  if (server.transport === 'STDIO') {
    return {
      transport: 'STDIO',
      name: server.name,
      enabled: server.enabled,
      command: server.command ?? '',
      args: server.args ?? [],
      env: recordToKv(server.env),
    };
  }
  return {
    transport: 'SSE',
    name: server.name,
    enabled: server.enabled,
    url: server.url ?? '',
    headers: recordToKv(server.headers),
  };
}

// ─── Tags Input ───────────────────────────────────────────────────────────────

interface TagsInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

function TagsInput({ value, onChange, placeholder }: TagsInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-text focus-within:ring-1 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-secondary border border-border text-xs font-mono"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (draft.trim()) addTag(draft); }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 bg-transparent outline-none placeholder:text-muted-foreground text-xs font-mono"
      />
    </div>
  );
}

// ─── KV Editor ────────────────────────────────────────────────────────────────

interface KvEditorProps {
  value: { key: string; value: string }[];
  onChange: (v: { key: string; value: string }[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

function KvEditor({ value, onChange, keyPlaceholder = 'Chave', valuePlaceholder = 'Valor' }: KvEditorProps) {
  const addRow = () => onChange([...value, { key: '', value: '' }]);
  const removeRow = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: 'key' | 'value', v: string) => {
    onChange(value.map((row, i) => (i === idx ? { ...row, [field]: v } : row)));
  };

  return (
    <div className="space-y-1.5">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={row.key}
            onChange={(e) => updateRow(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="font-mono text-xs h-8 flex-1"
          />
          <span className="text-muted-foreground/50 text-xs">=</span>
          <Input
            value={row.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="font-mono text-xs h-8 flex-1"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={addRow}
      >
        <Plus className="w-3 h-3" />
        Adicionar par
      </Button>
    </div>
  );
}

// ─── Transport Badge ──────────────────────────────────────────────────────────

function TransportBadge({ transport }: { transport: McpTransport }) {
  if (transport === 'STDIO') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-secondary text-muted-foreground border border-border">
        <Terminal className="w-2.5 h-2.5" />
        STDIO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <Globe className="w-2.5 h-2.5" />
      SSE
    </span>
  );
}

// ─── MCP Form (inside dialog) ─────────────────────────────────────────────────

interface McpFormProps {
  agentId: string;
  server?: McpServerData;
  onSuccess: () => void;
  onCancel: () => void;
}

function McpForm({ agentId, server, onSuccess, onCancel }: McpFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!server;

  const form = useForm<McpFormValues>({
    resolver: zodResolver(mcpFormSchema),
    defaultValues: defaultValues(server),
  });

  const transport = form.watch('transport');

  const mutation = useMutation({
    mutationFn: (data: McpFormValues) => {
      if (data.transport === 'STDIO') {
        const payload = {
          name: data.name,
          transport: 'STDIO' as const,
          enabled: data.enabled,
          command: data.command,
          args: data.args,
          env: kvToRecord(data.env),
        };
        return isEditing
          ? api.mcpServers.update(server!.id, payload)
          : api.mcpServers.create(agentId, payload);
      } else {
        const payload = {
          name: data.name,
          transport: 'SSE' as const,
          enabled: data.enabled,
          url: data.url,
          headers: kvToRecord(data.headers),
        };
        return isEditing
          ? api.mcpServers.update(server!.id, payload)
          : api.mcpServers.create(agentId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers', agentId] });
      toast.success(isEditing ? 'Servidor MCP atualizado!' : 'Servidor MCP criado!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleTransportChange = (newTransport: McpTransport) => {
    const current = form.getValues();
    if (newTransport === 'STDIO') {
      form.reset({
        transport: 'STDIO',
        name: current.name,
        enabled: current.enabled,
        command: '',
        args: [],
        env: [],
      });
    } else {
      form.reset({
        transport: 'SSE',
        name: current.name,
        enabled: current.enabled,
        url: '',
        headers: [],
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        {/* Nome + Enabled */}
        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Filesystem, Slack, Web Search" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="shrink-0 pt-6">
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="cursor-pointer text-muted-foreground text-xs">Habilitado</FormLabel>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Transport selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Tipo de transporte <span className="text-destructive">*</span></p>
          <div className="flex gap-2">
            {(['STDIO', 'SSE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTransportChange(t)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-mono font-medium transition-all',
                  transport === t
                    ? t === 'STDIO'
                      ? 'bg-secondary border-primary/50 text-foreground'
                      : 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary'
                )}
              >
                {t === 'STDIO' ? <Terminal className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* STDIO fields */}
        {transport === 'STDIO' && (
          <>
            <FormField
              control={form.control}
              name="command"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comando <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: npx, python, /usr/bin/node"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="args"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Argumentos</FormLabel>
                  <TagsInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pressione Enter ou vírgula para adicionar cada argumento
                  </p>
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="env"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variáveis de ambiente</FormLabel>
                  <KvEditor
                    value={field.value}
                    onChange={field.onChange}
                    keyPlaceholder="NOME_VAR"
                    valuePlaceholder="valor"
                  />
                </FormItem>
              )}
            />
          </>
        )}

        {/* SSE fields */}
        {transport === 'SSE' && (
          <>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://meu-servidor.com/sse"
                      type="url"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cabeçalhos HTTP</FormLabel>
                  <KvEditor
                    value={field.value}
                    onChange={field.onChange}
                    keyPlaceholder="Authorization"
                    valuePlaceholder="Bearer ..."
                  />
                </FormItem>
              )}
            />
          </>
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/5 border border-destructive/20 text-xs text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {(mutation.error as Error).message}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
            {mutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              'Salvar alterações'
            ) : (
              'Criar servidor'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── MCP Server Card ──────────────────────────────────────────────────────────

interface McpCardProps {
  server: McpServerData;
  agentId: string;
  onEdit: (server: McpServerData) => void;
}

function McpCard({ server, agentId, onEdit }: McpCardProps) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: () => api.mcpServers.toggle(server.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['mcp-servers', agentId] });
      const previous = queryClient.getQueryData<McpServerData[]>(['mcp-servers', agentId]);
      queryClient.setQueryData<McpServerData[]>(['mcp-servers', agentId], (old) =>
        old?.map((s) => (s.id === server.id ? { ...s, enabled: !s.enabled } : s))
      );
      return { previous };
    },
    onError: (err: Error, _, context) => {
      queryClient.setQueryData(['mcp-servers', agentId], context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers', agentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.mcpServers.delete(server.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers', agentId] });
      toast.success('Servidor MCP removido');
      setDeleteOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const subtitle =
    server.transport === 'STDIO'
      ? [server.command, ...(server.args ?? [])].filter(Boolean).join(' ')
      : server.url ?? '';

  const createdAt = formatDistanceToNow(new Date(server.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <>
      <div
        className={cn(
          'rounded-lg border bg-card transition-all',
          server.enabled ? 'border-border' : 'border-border opacity-60'
        )}
      >
        <div className="flex items-start gap-4 p-4">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-md border shrink-0 mt-0.5',
              server.enabled
                ? server.transport === 'SSE'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-secondary border-border'
                : 'bg-secondary border-border'
            )}
          >
            {server.transport === 'SSE' ? (
              <Globe className={cn('w-4 h-4', server.enabled ? 'text-blue-400' : 'text-muted-foreground/50')} />
            ) : (
              <Terminal className={cn('w-4 h-4', server.enabled ? 'text-muted-foreground' : 'text-muted-foreground/50')} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{server.name}</p>
              <TransportBadge transport={server.transport} />
              {!server.enabled && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-secondary text-muted-foreground/60 border border-border">
                  Desabilitado
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}

            <p className="text-xs font-mono text-muted-foreground/40 mt-1">
              Criado {createdAt}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={server.enabled}
              onCheckedChange={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(server)}
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remover servidor MCP?"
        description={`O servidor "${server.name}" será removido permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface McpTabProps {
  agentId: string;
}

export function McpTab({ agentId }: McpTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerData | undefined>(undefined);

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['mcp-servers', agentId],
    queryFn: () => api.mcpServers.list(agentId),
  });

  const openCreate = () => {
    setEditingServer(undefined);
    setDialogOpen(true);
  };

  const openEdit = (server: McpServerData) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingServer(undefined);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Servidores MCP</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ferramentas externas disponibilizadas ao agente via Model Context Protocol
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Adicionar Servidor MCP
          </Button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-md bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
          <Plug className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            Somente servidores <span className="font-mono text-primary px-1 py-0.5 bg-primary/10 rounded">habilitados</span>{' '}
            são conectados durante as execuções. Falhas de conexão não bloqueiam o agente — servidores com erro são ignorados automaticamente.
          </p>
        </div>

        {/* Server list */}
        {servers.length > 0 && (
          <div className="space-y-2">
            {servers.map((server) => (
              <McpCard key={server.id} server={server} agentId={agentId} onEdit={openEdit} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {servers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-border bg-card">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary border border-border mb-4">
              <Plug className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum servidor MCP configurado</h3>
            <p className="text-xs text-muted-foreground mb-5 max-w-xs">
              Adicione servidores MCP para estender as capacidades do agente com ferramentas externas como sistema de arquivos, Slack, buscas na web e muito mais.
            </p>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Adicionar Primeiro Servidor
            </Button>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary" />
              {editingServer ? 'Editar Servidor MCP' : 'Adicionar Servidor MCP'}
            </DialogTitle>
            <DialogDescription>
              {editingServer
                ? `Editando "${editingServer.name}"`
                : 'Configure um novo servidor MCP para este agente.'}
            </DialogDescription>
          </DialogHeader>

          <McpForm
            agentId={agentId}
            server={editingServer}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

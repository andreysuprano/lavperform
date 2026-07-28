'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { KnowledgeBase } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
import {
  Database,
  Plus,
  Upload,
  FileText,
  Loader2,
  Trash2,
  CloudUpload,
  Link2,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createKbSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  linkToAgent: z.boolean(),
});
type CreateKbValues = z.infer<typeof createKbSchema>;

const ingestSchema = z.object({
  content: z.string().min(10, 'Conteúdo muito curto (mínimo 10 caracteres)'),
  source: z.string().optional(),
});
type IngestValues = z.infer<typeof ingestSchema>;

// ─── File Drop Zone ──────────────────────────────────────────────────────────

interface FileDropZoneProps {
  onContent: (text: string, filename: string) => void;
}

function FileDropZone({ onContent }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ['.txt', '.md', '.mdx', '.csv', '.json'];

  const readFile = useCallback(
    (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        toast.error(`Tipo não suportado: ${ext}. Use ${ACCEPTED.join(', ')}`);
        return;
      }
      setReading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onContent(text, file.name);
        setReading(false);
        toast.success(`Arquivo "${file.name}" carregado (${(file.size / 1024).toFixed(1)} KB)`);
      };
      reader.onerror = () => {
        toast.error('Falha ao ler o arquivo');
        setReading(false);
      };
      reader.readAsText(file, 'utf-8');
    },
    [onContent]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) readFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-5 cursor-pointer transition-colors select-none',
        dragging
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border hover:border-primary/50 hover:bg-secondary text-muted-foreground'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
          e.target.value = '';
        }}
      />
      {reading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <CloudUpload className={cn('w-5 h-5', dragging ? 'text-primary' : '')} />
      )}
      <p className="text-xs font-medium">
        {dragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
      </p>
      <p className="text-xs font-mono opacity-60">{ACCEPTED.join(' · ')}</p>
    </div>
  );
}

// ─── Ingest Form (Dialog) ────────────────────────────────────────────────────

interface IngestDialogProps {
  kb: KnowledgeBase;
  companyId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function IngestDialog({ kb, companyId, open, onOpenChange }: IngestDialogProps) {
  const [jobId, setJobId] = useState<string | null>(null);

  const form = useForm<IngestValues>({
    resolver: zodResolver(ingestSchema),
    defaultValues: { content: '', source: '' },
  });

  const content = form.watch('content');

  const mutation = useMutation({
    mutationFn: (data: IngestValues) => {
      const metadata: Record<string, unknown> = {};
      if (data.source) metadata.source = data.source;
      return api.knowledgeBases.ingest(companyId, kb.id, {
        content: data.content,
        ...(Object.keys(metadata).length ? { metadata } : {}),
      });
    },
    onSuccess: (result) => {
      setJobId(result?.jobId ?? 'em_processamento');
      toast.success('Conteúdo enviado para indexação!');
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = () => {
    if (!mutation.isPending) {
      onOpenChange(false);
      form.reset();
      setJobId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Ingerir Conteúdo
          </DialogTitle>
          <DialogDescription>
            Base: <span className="font-mono text-foreground">{kb.name}</span>
            {' · '}O conteúdo é processado de forma assíncrona e dividido em chunks para busca semântica.
          </DialogDescription>
        </DialogHeader>

        {jobId ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Conteúdo enviado com sucesso!</p>
            <p className="text-xs text-muted-foreground">
              O texto está sendo indexado em background.
              {jobId !== 'em_processamento' && (
                <span className="block font-mono mt-1">Job ID: {jobId}</span>
              )}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setJobId(null)}>
                Ingerir mais
              </Button>
              <Button size="sm" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* File drop */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Importar de arquivo</p>
                <FileDropZone
                  onContent={(text, filename) => {
                    form.setValue('content', text, { shouldValidate: true });
                    if (!form.getValues('source')) form.setValue('source', filename);
                  }}
                />
              </div>

              {/* Content textarea */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Conteúdo de texto <span className="text-destructive">*</span></FormLabel>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground/60">
                        <span>{content.split(/\s+/).filter(Boolean).length.toLocaleString()} palavras</span>
                        <span>{content.length.toLocaleString()} chars</span>
                      </div>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="Cole ou arraste texto, artigos, FAQs, manuais, políticas..."
                          className="resize-none font-mono text-xs leading-relaxed h-[220px] overflow-y-auto"
                          {...field}
                        />
                        {content.length > 0 && (
                          <button
                            type="button"
                            onClick={() => form.setValue('content', '')}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source metadata */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: manual-produto-v2.pdf, https://site.com/faq"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Identificador da fonte — salvo como metadado para rastreabilidade dos chunks.
                    </FormDescription>
                  </FormItem>
                )}
              />

              {content.length > 50_000 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/80">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  Texto muito longo ({(content.length / 1000).toFixed(0)}K chars). Considere dividir em partes menores para melhor qualidade de indexação.
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending || content.trim().length < 10} className="gap-2 min-w-[140px]">
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Indexar conteúdo
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create KB Form ──────────────────────────────────────────────────────────

interface CreateKbFormProps {
  companyId: string;
  agentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateKbForm({ companyId, agentId, onSuccess, onCancel }: CreateKbFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateKbValues>({
    resolver: zodResolver(createKbSchema),
    defaultValues: { name: '', description: '', linkToAgent: true },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateKbValues) =>
      api.knowledgeBases.create(companyId, {
        name: data.name,
        description: data.description || undefined,
        agentId: data.linkToAgent ? agentId : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', companyId] });
      toast.success('Base de conhecimento criada!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="text-xs font-mono text-primary uppercase tracking-wider mb-4">Nova Base de Conhecimento</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Ex: FAQ Produtos, Manual do Usuário..." {...field} />
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
                    placeholder="Descreva o conteúdo desta base..."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkToAgent"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3 py-1">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer">Vincular a este agente</FormLabel>
                    <FormDescription className="text-xs">
                      {field.value
                        ? 'Base exclusiva deste agente'
                        : 'Base compartilhada com toda a empresa'}
                    </FormDescription>
                  </div>
                  {field.value ? (
                    <Link2 className="w-3.5 h-3.5 text-primary ml-auto" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  )}
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Criar Base
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── KB Card ─────────────────────────────────────────────────────────────────

interface KbCardProps {
  kb: KnowledgeBase;
  companyId: string;
  agentId: string;
}

function KbCard({ kb, companyId, agentId }: KbCardProps) {
  const [ingestOpen, setIngestOpen] = useState(false);
  const isLinkedToThisAgent = kb.agentId === agentId;
  const isShared = kb.agentId === null;

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-border/80">
        <div className="flex items-start gap-4 p-4">
          <div className={cn(
            'flex items-center justify-center w-9 h-9 rounded-md border flex-shrink-0 mt-0.5',
            isLinkedToThisAgent
              ? 'bg-primary/10 border-primary/30'
              : 'bg-secondary border-border'
          )}>
            <Database className={cn('w-4 h-4', isLinkedToThisAgent ? 'text-primary' : 'text-muted-foreground')} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{kb.name}</p>
              {isLinkedToThisAgent && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  <Link2 className="w-2.5 h-2.5" /> Este agente
                </span>
              )}
              {isShared && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-secondary text-muted-foreground border border-border">
                  <Building2 className="w-2.5 h-2.5" /> Empresa
                </span>
              )}
            </div>
            {kb.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{kb.description}</p>
            )}
            <p className="text-xs font-mono text-muted-foreground/50 mt-1">
              ID: {kb.id}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 flex-shrink-0"
            onClick={() => setIngestOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Ingerir
          </Button>
        </div>
      </div>

      <IngestDialog
        kb={kb}
        companyId={companyId}
        open={ingestOpen}
        onOpenChange={setIngestOpen}
      />
    </>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

interface RagTabProps {
  agentId: string;
  companyId: string;
}

export function RagTab({ agentId, companyId }: RagTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  const { data: kbs = [], isLoading } = useQuery({
    queryKey: ['knowledge-bases', companyId],
    queryFn: () => api.knowledgeBases.list(companyId),
  });

  const agentKbs = kbs.filter((kb) => kb.agentId === agentId);
  const sharedKbs = kbs.filter((kb) => kb.agentId === null);
  const otherKbs = kbs.filter((kb) => kb.agentId !== null && kb.agentId !== agentId);

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Bases de Conhecimento</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documentos indexados para busca semântica (RAG)
          </p>
        </div>
        {!showCreateForm && (
          <Button size="sm" className="gap-2" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nova Base
          </Button>
        )}
      </div>

      {/* RAG + VECTOR notice */}
      <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-md bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
        <Database className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
        <p>
          Para usar a base de conhecimento nas respostas do agente, configure a memória como{' '}
          <span className="font-mono text-primary px-1 py-0.5 bg-primary/10 rounded">VECTOR</span>{' '}
          na aba <span className="text-foreground font-medium">Memória</span>.
        </p>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <CreateKbForm
          companyId={companyId}
          agentId={agentId}
          onSuccess={() => setShowCreateForm(false)}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Bases linked to this agent */}
      {agentKbs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Vinculadas a este agente ({agentKbs.length})
          </p>
          {agentKbs.map((kb) => (
            <KbCard key={kb.id} kb={kb} companyId={companyId} agentId={agentId} />
          ))}
        </div>
      )}

      {/* Shared bases */}
      {sharedKbs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Compartilhadas da empresa ({sharedKbs.length})
          </p>
          {sharedKbs.map((kb) => (
            <KbCard key={kb.id} kb={kb} companyId={companyId} agentId={agentId} />
          ))}
        </div>
      )}

      {/* Other agents' bases (collapsible) */}
      {otherKbs.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowOthers(!showOthers)}
          >
            {showOthers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            De outros agentes ({otherKbs.length})
          </button>
          {showOthers && otherKbs.map((kb) => (
            <KbCard key={kb.id} kb={kb} companyId={companyId} agentId={agentId} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {kbs.length === 0 && !showCreateForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary border border-border mb-4">
            <Database className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma base de conhecimento</h3>
          <p className="text-xs text-muted-foreground mb-5 max-w-xs">
            Crie uma base e ingira documentos, FAQs ou manuais para o agente consultar em suas respostas.
          </p>
          <Button size="sm" className="gap-2" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Criar Primeira Base
          </Button>
        </div>
      )}

      {/* Has bases but none linked to this agent */}
      {kbs.length > 0 && agentKbs.length === 0 && sharedKbs.length === 0 && !showCreateForm && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-secondary border border-border text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            Nenhuma base está vinculada a este agente. Crie uma nova base ou selecione uma compartilhada acima.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AgentMediaConfig } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil, X, Mic, Image, Video, Info } from 'lucide-react';

const mediaSchema = z.object({
  audioEnabled: z.boolean(),
  audioDefaultMessage: z.string().optional(),
  imageEnabled: z.boolean(),
  imageExtractionPrompt: z.string().optional(),
  imageDefaultMessage: z.string().optional(),
  videoEnabled: z.boolean(),
  videoExtractionPrompt: z.string().optional(),
  videoDefaultMessage: z.string().optional(),
});

type MediaFormValues = z.infer<typeof mediaSchema>;

interface MediaSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
  editing: boolean;
  children?: React.ReactNode;
}

function MediaSection({ icon, title, subtitle, enabled, onToggle, editing, children }: MediaSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md border ${
            enabled
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary border-border text-muted-foreground'
          }`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {editing && (
          <Switch checked={enabled} onCheckedChange={onToggle} />
        )}
        {!editing && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            enabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-secondary text-muted-foreground border-border'
          }`}>
            {enabled ? 'Ativo' : 'Inativo'}
          </span>
        )}
      </div>
      {children && (
        <div className="px-5 pb-4 space-y-3 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface MediaTabProps {
  agentId: string;
  mediaConfig: AgentMediaConfig | null;
}

export function MediaTab({ agentId, mediaConfig }: MediaTabProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      audioEnabled: mediaConfig?.audioEnabled ?? false,
      audioDefaultMessage: mediaConfig?.audioDefaultMessage || '',
      imageEnabled: mediaConfig?.imageEnabled ?? false,
      imageExtractionPrompt: mediaConfig?.imageExtractionPrompt || '',
      imageDefaultMessage: mediaConfig?.imageDefaultMessage || '',
      videoEnabled: mediaConfig?.videoEnabled ?? false,
      videoExtractionPrompt: mediaConfig?.videoExtractionPrompt || '',
      videoDefaultMessage: mediaConfig?.videoDefaultMessage || '',
    },
  });

  const audioEnabled = form.watch('audioEnabled');
  const imageEnabled = form.watch('imageEnabled');
  const videoEnabled = form.watch('videoEnabled');

  const mutation = useMutation({
    mutationFn: (data: MediaFormValues) => api.agents.updateMediaConfig(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      toast.success('Configuração de mídia atualizada!');
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const renderReadonly = () => {
    const config = mediaConfig;
    if (!config) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhuma configuração de mídia definida.</p>
          <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Configurar Mídia
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <MediaSection
          icon={<Mic className="w-4 h-4" />}
          title="Áudio (Whisper)"
          subtitle="Transcrição de mensagens de voz"
          enabled={config.audioEnabled}
          onToggle={() => {}}
          editing={false}
        >
          {!config.audioEnabled && config.audioDefaultMessage && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">Mensagem de fallback</p>
              <p className="text-xs text-muted-foreground">{config.audioDefaultMessage}</p>
            </div>
          )}
        </MediaSection>

        <MediaSection
          icon={<Image className="w-4 h-4" />}
          title="Imagem (Vision)"
          subtitle="Análise de imagens via Vision AI"
          enabled={config.imageEnabled}
          onToggle={() => {}}
          editing={false}
        >
          {config.imageEnabled && config.imageExtractionPrompt && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">Prompt de extração</p>
              <p className="text-xs text-muted-foreground">{config.imageExtractionPrompt}</p>
            </div>
          )}
          {!config.imageEnabled && config.imageDefaultMessage && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">Mensagem de fallback</p>
              <p className="text-xs text-muted-foreground">{config.imageDefaultMessage}</p>
            </div>
          )}
        </MediaSection>

        <MediaSection
          icon={<Video className="w-4 h-4" />}
          title="Vídeo (Vision via thumbnail)"
          subtitle="Análise do frame JPEG fornecido pelo WhatsApp"
          enabled={config.videoEnabled}
          onToggle={() => {}}
          editing={false}
        >
          {config.videoEnabled && config.videoExtractionPrompt && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">Prompt de extração</p>
              <p className="text-xs text-muted-foreground">{config.videoExtractionPrompt}</p>
            </div>
          )}
        </MediaSection>
      </div>
    );
  };

  if (!editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" />
            Editar
          </Button>
        </div>
        {renderReadonly()}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Audio */}
          <MediaSection
            icon={<Mic className="w-4 h-4" />}
            title="Áudio (Whisper)"
            subtitle="Transcrição de mensagens de voz via OpenAI Whisper"
            enabled={audioEnabled}
            onToggle={() => form.setValue('audioEnabled', !audioEnabled)}
            editing={true}
          >
            {!audioEnabled && (
              <FormField
                control={form.control}
                name="audioDefaultMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mensagem quando áudio desativado</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Desculpe, não consigo processar mensagens de voz no momento."
                        className="resize-none text-xs"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </MediaSection>

          {/* Image */}
          <MediaSection
            icon={<Image className="w-4 h-4" />}
            title="Imagem (Vision)"
            subtitle="Análise de imagens enviadas na conversa"
            enabled={imageEnabled}
            onToggle={() => form.setValue('imageEnabled', !imageEnabled)}
            editing={true}
          >
            {imageEnabled ? (
              <FormField
                control={form.control}
                name="imageExtractionPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Prompt de extração de imagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Analise a imagem e extraia as informações relevantes..."
                        className="resize-none text-xs"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="imageDefaultMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mensagem quando imagem desativada</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Desculpe, não consigo processar imagens no momento."
                        className="resize-none text-xs"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </MediaSection>

          {/* Video */}
          <MediaSection
            icon={<Video className="w-4 h-4" />}
            title="Vídeo (Vision via thumbnail)"
            subtitle="Análise do frame JPEG fornecido pelo WhatsApp"
            enabled={videoEnabled}
            onToggle={() => form.setValue('videoEnabled', !videoEnabled)}
            editing={true}
          >
            <div className="flex items-start gap-2 p-2 rounded bg-secondary">
              <Info className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                A análise de vídeo utiliza o thumbnail JPEG gerado pelo WhatsApp, não o vídeo completo.
              </p>
            </div>
            {videoEnabled ? (
              <FormField
                control={form.control}
                name="videoExtractionPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Prompt de análise do vídeo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Analise o frame do vídeo e descreva o conteúdo..."
                        className="resize-none text-xs"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="videoDefaultMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mensagem quando vídeo desativado</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Desculpe, não consigo processar vídeos no momento."
                        className="resize-none text-xs"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </MediaSection>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2 min-w-[120px]">
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar Mídia
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

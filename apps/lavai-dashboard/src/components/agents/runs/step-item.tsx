'use client';

import { useState } from 'react';
import { AgentRunStep, AgentRunStepType } from '@/lib/types';
import { StepIcon, stepLabel } from './step-icon';
import { ChevronDown, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StepItemProps {
  step: AgentRunStep;
  index: number;
  isLast?: boolean;
}

function formatStepDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function JsonBlock({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  if (data == null) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <p className="text-xs font-mono text-muted-foreground/40 px-1">—</p>
      </div>
    );
  }

  const json = JSON.stringify(data, null, 2);
  const lines = json.split('\n');
  const LIMIT = 50;
  const isTruncated = lines.length > LIMIT;
  const displayedJson = isTruncated && !showAll ? lines.slice(0, LIMIT).join('\n') + '\n…' : json;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-primary/30"
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5" />
              <span>Copiar JSON</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-xs font-mono bg-secondary border border-border rounded-md p-3 overflow-x-auto overflow-y-auto text-muted-foreground leading-relaxed">
        {displayedJson}
      </pre>
      {isTruncated && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-primary hover:text-primary transition-colors font-mono"
        >
          {showAll ? '▲ Ver menos' : `▼ Ver mais (${lines.length - LIMIT} linhas restantes)`}
        </button>
      )}
    </div>
  );
}

function extractFinishReason(
  stepType: AgentRunStepType,
  output: Record<string, unknown> | null
): string | null {
  if (stepType !== 'LLM_CALL' || output == null) return null;
  const fr = output.finishReason;
  if (typeof fr === 'string') return fr;
  return null;
}

export function StepItem({ step, index, isLast }: StepItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasError = !!step.errorMessage;
  const finishReason = extractFinishReason(step.stepType, step.output);

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border/60" />
      )}

      <StepIcon stepType={step.stepType} hasError={hasError} className="mt-0.5 z-10" />

      <div
        className={cn(
          'flex-1 mb-3 rounded-xl border transition-all duration-200',
          hasError
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-border bg-card hover:border-border hover:bg-card',
          expanded && !hasError && 'border-border bg-card',
          expanded && hasError && 'border-red-500/40'
        )}
      >
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground/40">#{index + 1}</span>
              <span className="text-sm font-medium text-foreground">
                {stepLabel(step.stepType)}
              </span>
              {step.toolName && (
                <span className="text-xs font-mono text-muted-foreground/70 bg-secondary px-1.5 py-0.5 rounded truncate max-w-52">
                  {step.toolName}
                </span>
              )}
              {finishReason && (
                <span className="text-xs font-mono text-sky-400/60 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
                  {finishReason}
                </span>
              )}
              {hasError && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded">
                  <AlertCircle className="w-3 h-3" />
                  ERRO
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-muted-foreground/50">
              {formatStepDuration(step.durationMs)}
            </span>
            <span className="text-xs font-mono text-muted-foreground/40 min-w-12 text-right">
              {step.iteration > 0 ? `iter ${step.iteration}` : '—'}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground/40 transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 animate-fade-in">
            {hasError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-0.5 uppercase tracking-widest">
                    Erro
                  </p>
                  <p className="text-xs text-red-300/80 font-mono leading-relaxed">
                    {step.errorMessage}
                  </p>
                </div>
              </div>
            )}
            <JsonBlock label="Input" data={step.input} />
            <JsonBlock label="Output" data={step.output} />
          </div>
        )}
      </div>
    </div>
  );
}

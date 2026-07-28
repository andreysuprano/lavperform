import { AgentRunStepType } from '@/lib/types';
import { Search, Cpu, Wrench, Plug, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIconProps {
  stepType: AgentRunStepType;
  hasError?: boolean;
  className?: string;
}

const config: Record<
  AgentRunStepType,
  { icon: React.ElementType; color: string; bg: string; border: string; label: string }
> = {
  RAG_SEARCH: {
    icon: Search,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    label: 'Busca RAG',
  },
  LLM_CALL: {
    icon: Cpu,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    label: 'LLM',
  },
  TOOL_CALL: {
    icon: Wrench,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    label: 'Tool Builtin',
  },
  MCP_TOOL_CALL: {
    icon: Plug,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    label: 'MCP Tool',
  },
  ERROR: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Erro',
  },
};

export function StepIcon({ stepType, hasError, className }: StepIconProps) {
  const c = config[stepType];
  const Icon = hasError ? AlertCircle : c.icon;
  const color = hasError ? 'text-red-400' : c.color;
  const bg = hasError ? 'bg-red-500/10' : c.bg;
  const border = hasError ? 'border-red-500/30' : c.border;

  return (
    <div
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg border shrink-0',
        bg,
        border,
        className
      )}
    >
      <Icon className={cn('w-4 h-4', color)} />
    </div>
  );
}

export function stepLabel(stepType: AgentRunStepType): string {
  return config[stepType]?.label ?? stepType;
}

export function stepColor(stepType: AgentRunStepType) {
  return config[stepType];
}

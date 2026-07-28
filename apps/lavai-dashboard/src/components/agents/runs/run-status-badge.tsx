import { AgentRunStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RunStatusBadgeProps {
  status: AgentRunStatus;
  className?: string;
}

const config: Record<AgentRunStatus, { label: string; className: string; dot: string }> = {
  RUNNING: {
    label: 'Em andamento',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400 animate-pulse',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
};

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        c.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      {c.label}
    </span>
  );
}

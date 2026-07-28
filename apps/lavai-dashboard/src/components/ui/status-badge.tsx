import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  active: boolean;
  className?: string;
}

export function StatusBadge({ active, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium font-mono',
        active
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
        )}
      />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

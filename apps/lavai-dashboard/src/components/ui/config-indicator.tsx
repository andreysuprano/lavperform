import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfigIndicatorProps {
  label: string;
  configured: boolean;
}

export function ConfigIndicator({ label, configured }: ConfigIndicatorProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium cursor-default',
            configured
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-secondary text-muted-foreground border border-border'
          )}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}: {configured ? 'Configurado' : 'Não configurado'}
      </TooltipContent>
    </Tooltip>
  );
}

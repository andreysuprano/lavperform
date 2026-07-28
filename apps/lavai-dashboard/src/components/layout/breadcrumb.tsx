import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1.5 px-6 py-3 border-b border-border bg-background', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-xs font-mono text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

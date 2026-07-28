'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Building2, Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Empresas',
    href: '/companies',
    icon: Building2,
    description: 'Tenants e agentes',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col border-r border-border bg-background" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="flex items-center px-5 py-5 border-b border-border">
        <Image
          src="/seld/logo_dark.png"
          alt="LavAI"
          width={160}
          height={40}
          className="h-8 w-auto object-contain"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 mb-2 text-sm font-mono text-muted-foreground tracking-widest uppercase">Navegação</p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-base transition-all duration-150 group',
                isActive
                  ? 'sidebar-item-active'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate', isActive ? 'text-primary' : '')}>{item.label}</p>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              </div>
              {isActive && <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/30">
          <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-mono text-primary truncate">API: localhost:3001</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 ml-auto animate-pulse" />
        </div>
      </div> */}
    </aside>
  );
}

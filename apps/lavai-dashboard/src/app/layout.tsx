import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata: Metadata = {
  title: 'LavAI — LavPerform',
  description: 'Painel administrativo LavPerform para gerenciamento de agentes de IA',
  icons: {
    icon: '/seld/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <QueryProvider>
          <TooltipProvider delayDuration={300}>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
            <Toaster position="bottom-right" theme="dark" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

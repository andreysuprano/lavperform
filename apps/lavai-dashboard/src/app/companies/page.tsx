'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Company } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CompaniesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: api.companies.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.companies.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa excluída com sucesso');
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <PageHeader
        title="Empresas"
        description="Gerencie os tenants e seus agentes de IA"
      >
        <Button asChild size="sm" className="gap-2">
          <Link href="/companies/new">
            <Plus className="w-3.5 h-3.5" />
            Nova Empresa
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 p-6">
        {isLoading ? (
          <CompaniesTableSkeleton />
        ) : !companies || companies.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Empresa</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Slug</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Contato</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Criado em</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-secondary border-border transition-colors"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        {company.slug}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
                        {company.phone && <p className="text-xs font-mono text-muted-foreground/70">{company.phone}</p>}
                        {!company.email && !company.phone && <span className="text-muted-foreground/40 text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={company.active} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {format(new Date(company.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <Link href={`/companies/${company.id}/edit`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(company)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir empresa"
        description={`Esta ação é irreversível e removerá a empresa "${deleteTarget?.name}" junto com todos os agentes vinculados a ela.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function CompaniesTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-background">
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 p-4 border-b border-border last:border-0">
          <Skeleton className="w-7 h-7 rounded-md flex-shrink-0" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Building2 className="w-7 h-7 text-primary/70" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma empresa cadastrada</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Crie sua primeira empresa para começar a gerenciar agentes de IA.
      </p>
      <Button asChild size="sm" className="gap-2">
        <Link href="/companies/new">
          <Plus className="w-3.5 h-3.5" />
          Nova Empresa
        </Link>
      </Button>
    </div>
  );
}

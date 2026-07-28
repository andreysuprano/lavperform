'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { CompanyForm, CompanyFormValues } from '@/components/companies/company-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', id],
    queryFn: () => api.companies.get(id),
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyFormValues) => api.companies.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa atualizada com sucesso!');
      router.push(`/companies/${id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || '...', href: `/companies/${id}` },
          { label: 'Editar' },
        ]}
      />
      <PageHeader
        title={isLoading ? 'Carregando...' : `Editar: ${company?.name}`}
        description="Atualize os dados da empresa"
      >
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={`/companies/${id}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 p-6">
        <div className="max-w-xl">
          {isLoading ? (
            <div className="rounded-lg border border-border bg-card p-6 space-y-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : company ? (
            <div className="rounded-lg border border-border bg-card p-6">
              <CompanyForm
                defaultValues={company}
                onSubmit={(data) => mutation.mutate(data)}
                isLoading={mutation.isPending}
                submitLabel="Salvar Alterações"
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Empresa não encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

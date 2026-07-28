'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { CompanyForm, CompanyFormValues } from '@/components/companies/company-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CompanyFormValues) => api.companies.create(data),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa criada com sucesso!');
      router.push(`/companies/${company.id}`);
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
          { label: 'Nova Empresa' },
        ]}
      />
      <PageHeader title="Nova Empresa" description="Cadastre uma nova empresa no painel">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/companies">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 p-6">
        <div className="max-w-xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <CompanyForm
              onSubmit={(data) => mutation.mutate(data)}
              isLoading={mutation.isPending}
              submitLabel="Criar Empresa"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

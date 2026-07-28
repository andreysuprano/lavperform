'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyFormProps {
  defaultValues?: Partial<Company>;
  onSubmit: (data: CompanyFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function CompanyForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Salvar' }: CompanyFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: defaultValues?.name || '',
      slug: defaultValues?.slug || '',
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
    },
  });

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Acme Corporation"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!defaultValues?.slug) {
                      form.setValue('slug', autoSlug(e.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <span className="flex items-center h-9 px-3 rounded-l-md border border-r-0 border-border bg-secondary text-muted-foreground text-sm font-mono">
                    /
                  </span>
                  <Input
                    className="rounded-l-none font-mono"
                    placeholder="acme-corporation"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Identificador único. Somente letras minúsculas, números e hífens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contato@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="+55 11 99999-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="gap-2 min-w-[120px]">
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

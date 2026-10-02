import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Smtp } from 'src/common/smtp/smtp';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesImportPartnerSlug } from './sales-import-schedule';

export const DEFAULT_SALES_IMPORT_ALERT_EMAILS = [
  'andrey@overgroup.com.br',
  'bruno.saibert@overgroup.com.br',
];

export type SalesImportFailureAlert = {
  partner: SalesImportPartnerSlug;
  companyId: string;
  kind: 'catchup' | 'backfill90';
  date?: string;
  jobId?: string;
  attempts: number;
  failedAt: Date;
  error: unknown;
};

export function isSalesImportLastAttempt(job: {
  attemptsMade: number;
  opts: { attempts?: number };
}): boolean {
  const attempts = job.opts.attempts ?? 1;
  return job.attemptsMade + 1 >= attempts;
}

function resolveSalesImportAlertRecipients(): string[] {
  const raw = process.env.SALES_IMPORT_ALERT_EMAIL;
  if (raw == null || raw.trim() === '') {
    return [...DEFAULT_SALES_IMPORT_ALERT_EMAILS];
  }

  const emails = raw
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  return emails.length > 0 ? emails : [...DEFAULT_SALES_IMPORT_ALERT_EMAILS];
}

function salesImportAlertThrottleKey(alert: SalesImportFailureAlert): string {
  return `${alert.partner}:${alert.companyId}:${alert.date ?? 'none'}:${alert.failedAt.toISOString().slice(0, 13)}`;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function kindLabel(kind: SalesImportFailureAlert['kind']): string {
  return kind === 'backfill90' ? 'backfill de 90 dias' : 'catch-up do dia';
}

function renderSalesImportAlertHtml(
  alert: SalesImportFailureAlert,
  companyName: string,
): string {
  const lines = [
    `Parceiro: ${alert.partner}`,
    `Empresa: ${companyName} (${alert.companyId})`,
    kindLabel(alert.kind),
    `Data importada: ${alert.date ?? ''}`,
    `Horário UTC: ${alert.failedAt.toISOString()}`,
    `jobId: ${alert.jobId ?? ''}`,
    `Tentativa: ${alert.attempts}`,
    `Erro: ${errorText(alert.error)}`,
  ];

  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

@Injectable()
export class SalesImportAlertService {
  private readonly sentKeys = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async notify(alert: SalesImportFailureAlert): Promise<void> {
    const sentryFields = {
      partner: alert.partner,
      companyId: alert.companyId,
      date: alert.date,
      jobId: alert.jobId,
      kind: alert.kind,
    };
    Sentry.captureException(alert.error, {
      extra: sentryFields,
      tags: {
        partner: alert.partner,
        companyId: alert.companyId,
        date: alert.date ?? '',
        jobId: alert.jobId ?? '',
        kind: alert.kind,
      },
    });

    const key = salesImportAlertThrottleKey(alert);
    if (this.sentKeys.has(key)) {
      return;
    }

    this.sentKeys.add(key);

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: alert.companyId },
        select: { id: true, name: true },
      });
      const html = renderSalesImportAlertHtml(
        alert,
        company?.name ?? alert.companyId,
      );
      await new Smtp().sendMail(
        resolveSalesImportAlertRecipients().join(','),
        `Falha na importação de vendas (${alert.partner})`,
        html,
      );
    } catch {
      this.sentKeys.delete(key);
    }
  }
}

/**
 * Script para reverter recargas (CreditTopup) criadas indevidamente pelo bug
 * em `recoverOrphanPayment`/webhook do Asaas. Esses topups foram gerados a
 * partir de cobranças que NÃO eram recargas   tipicamente mensalidades do
 * plano (subscription) ou parcelas (installment)   mas o saldo de créditos
 * da empresa foi creditado mesmo assim.
 *
 * Critério de identificação (CreditTopup PAID + uma das condições abaixo no
 * rawPaymentPayload):
 *   - `rawPaymentPayload->'payment'->>'subscription'` IS NOT NULL  (webhook completo)
 *   - `rawPaymentPayload->'payment'->>'installment'`  IS NOT NULL
 *   - `rawPaymentPayload->>'subscription'`            IS NOT NULL  (payment direto)
 *   - `rawPaymentPayload->>'installment'`             IS NOT NULL
 *
 * Para cada topup identificado, o script:
 *   1. Marca o CreditTopup como CANCELED (mantém o registro p/ auditoria)
 *   2. Cria um CreditLedgerEntry do tipo CONSUMPTION com `amountCents` negativo
 *      e metadata indicando o motivo do estorno
 *   3. Decrementa o `balanceCents` do CompanyCreditWallet
 *
 * Uso:
 *   # Dry-run (padrão): apenas lista o que será revertido
 *   npx ts-node scripts/revert-orphan-credit-topups.ts
 *
 *   # Aplica as reversões
 *   npx ts-node scripts/revert-orphan-credit-topups.ts --apply
 *
 *   # Filtros opcionais
 *   npx ts-node scripts/revert-orphan-credit-topups.ts --company <companyId>
 *   npx ts-node scripts/revert-orphan-credit-topups.ts --topup <topupId>
 *   npx ts-node scripts/revert-orphan-credit-topups.ts --asaas-charge <asaasChargeId>
 *
 *   # Permite que o saldo da carteira fique negativo após o estorno.
 *   # Por padrão o script bloqueia ("clamp") para não baixar de 0 quando
 *   # parte dos créditos indevidos já foi consumida.
 *   npx ts-node scripts/revert-orphan-credit-topups.ts --apply --allow-negative
 */

import 'dotenv/config';
import {
  PrismaClient,
  CreditLedgerEntryType,
  CreditTopupStatus,
  Prisma,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não está configurado; configure no seu arquivo .env.',
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CliOptions {
  apply: boolean;
  allowNegative: boolean;
  companyId?: string;
  topupId?: string;
  asaasChargeId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { apply: false, allowNegative: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--allow-negative') opts.allowNegative = true;
    else if (arg === '--company') opts.companyId = argv[++i];
    else if (arg === '--topup') opts.topupId = argv[++i];
    else if (arg === '--asaas-charge') opts.asaasChargeId = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Uso: ts-node scripts/revert-orphan-credit-topups.ts [--apply] [--allow-negative] [--company <id>] [--topup <id>] [--asaas-charge <id>]',
      );
      process.exit(0);
    }
  }
  return opts;
}

interface OrphanTopupRow {
  id: string;
  companyId: string;
  asaasChargeId: string | null;
  amountCents: number;
  paidAt: Date | null;
  createdAt: Date;
  subscriptionId: string | null;
  installmentId: string | null;
}

async function findOrphanTopups(opts: CliOptions): Promise<OrphanTopupRow[]> {
  // Identifica os IDs em SQL puro para aproveitar operadores JSONB do Postgres.
  const filters: Prisma.Sql[] = [
    Prisma.sql`t.status = 'PAID'::"CreditTopupStatus"`,
    Prisma.sql`(
      (t."rawPaymentPayload" -> 'payment' ->> 'subscription') IS NOT NULL
      OR (t."rawPaymentPayload" -> 'payment' ->> 'installment')  IS NOT NULL
      OR (t."rawPaymentPayload" ->> 'subscription') IS NOT NULL
      OR (t."rawPaymentPayload" ->> 'installment')  IS NOT NULL
    )`,
  ];
  if (opts.topupId) {
    filters.push(Prisma.sql`t."id" = ${opts.topupId}`);
  }
  if (opts.companyId) {
    filters.push(Prisma.sql`t."companyId" = ${opts.companyId}`);
  }
  if (opts.asaasChargeId) {
    filters.push(Prisma.sql`t."asaasChargeId" = ${opts.asaasChargeId}`);
  }

  const whereSql = Prisma.join(filters, ' AND ');

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      companyId: string;
      asaasChargeId: string | null;
      amountCents: number;
      paidAt: Date | null;
      createdAt: Date;
      subscription_id: string | null;
      installment_id: string | null;
    }>
  >(Prisma.sql`
    SELECT
      t."id"             AS "id",
      t."companyId"      AS "companyId",
      t."asaasChargeId"  AS "asaasChargeId",
      t."amountCents"    AS "amountCents",
      t."paidAt"         AS "paidAt",
      t."createdAt"      AS "createdAt",
      COALESCE(
        t."rawPaymentPayload" -> 'payment' ->> 'subscription',
        t."rawPaymentPayload" ->> 'subscription'
      ) AS "subscription_id",
      COALESCE(
        t."rawPaymentPayload" -> 'payment' ->> 'installment',
        t."rawPaymentPayload" ->> 'installment'
      ) AS "installment_id"
    FROM "credit_topups" t
    WHERE ${whereSql}
    ORDER BY t."companyId" ASC, t."paidAt" ASC NULLS LAST
  `);

  return rows.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    asaasChargeId: r.asaasChargeId,
    amountCents: r.amountCents,
    paidAt: r.paidAt,
    createdAt: r.createdAt,
    subscriptionId: r.subscription_id,
    installmentId: r.installment_id,
  }));
}

function formatBRL(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function printDryRunReport(
  topups: OrphanTopupRow[],
): Promise<void> {
  console.log('=================================================');
  console.log(' Relatório de recargas indevidas (CreditTopup)   ');
  console.log('=================================================\n');

  if (topups.length === 0) {
    console.log('Nenhum topup indevido encontrado.');
    return;
  }

  const byCompany = new Map<string, OrphanTopupRow[]>();
  for (const t of topups) {
    const list = byCompany.get(t.companyId) ?? [];
    list.push(t);
    byCompany.set(t.companyId, list);
  }

  for (const [companyId, items] of byCompany.entries()) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, cnpj: true, asaasCustomerId: true },
    });
    const wallet = await prisma.companyCreditWallet.findUnique({
      where: { companyId },
      select: { balanceCents: true },
    });
    const totalCents = items.reduce((acc, it) => acc + it.amountCents, 0);
    const currentBalance = wallet?.balanceCents ?? 0;
    const projected = currentBalance - totalCents;

    console.log(`Empresa: ${company?.name ?? '(?)'} [${companyId}]`);
    console.log(
      `  CNPJ: ${company?.cnpj ?? '-'} | asaasCustomerId: ${company?.asaasCustomerId ?? '-'}`,
    );
    console.log(`  Topups indevidos: ${items.length}`);
    console.log(`  Total a estornar: ${formatBRL(totalCents)}`);
    console.log(`  Saldo atual:      ${formatBRL(currentBalance)}`);
    console.log(
      `  Saldo após estorno: ${formatBRL(projected)}${projected < 0 ? '  (NEGATIVO)' : ''}`,
    );
    for (const t of items) {
      console.log(
        `    - topup=${t.id} charge=${t.asaasChargeId ?? '-'} valor=${formatBRL(t.amountCents)} paidAt=${t.paidAt?.toISOString() ?? '-'} subscription=${t.subscriptionId ?? '-'} installment=${t.installmentId ?? '-'}`,
      );
    }
    console.log('');
  }

  const grandTotal = topups.reduce((acc, t) => acc + t.amountCents, 0);
  console.log(
    `TOTAL geral: ${topups.length} topup(s)   ${formatBRL(grandTotal)} em ${byCompany.size} empresa(s)`,
  );
}

async function revertTopup(
  topup: OrphanTopupRow,
  allowNegative: boolean,
): Promise<{ status: 'reverted' | 'skipped'; reason?: string }> {
  return prisma.$transaction(async (tx) => {
    // Recarrega o topup com lock lógico (where com status) para evitar dupla reversão.
    const fresh = await tx.creditTopup.findUnique({
      where: { id: topup.id },
    });
    if (!fresh) {
      return { status: 'skipped' as const, reason: 'topup não encontrado' };
    }
    if (fresh.status !== CreditTopupStatus.PAID) {
      return {
        status: 'skipped' as const,
        reason: `status atual=${fresh.status} (esperado PAID)`,
      };
    }

    const wallet = await tx.companyCreditWallet.findUnique({
      where: { companyId: topup.companyId },
    });
    const currentBalance = wallet?.balanceCents ?? 0;
    const projected = currentBalance - topup.amountCents;
    if (projected < 0 && !allowNegative) {
      return {
        status: 'skipped' as const,
        reason: `estorno deixaria saldo negativo (atual=${formatBRL(currentBalance)}, estorno=${formatBRL(topup.amountCents)}); use --allow-negative para forçar`,
      };
    }

    const updatedWallet = await tx.companyCreditWallet.upsert({
      where: { companyId: topup.companyId },
      create: {
        companyId: topup.companyId,
        balanceCents: -topup.amountCents,
      },
      update: {
        balanceCents: { decrement: topup.amountCents },
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        companyId: topup.companyId,
        topupId: topup.id,
        type: CreditLedgerEntryType.CONSUMPTION,
        amountCents: -topup.amountCents,
        balanceAfterCents: updatedWallet.balanceCents,
        metadata: {
          source: 'reversal:orphan-subscription-topup',
          reason:
            'Recarga criada indevidamente a partir de cobrança Asaas vinculada a assinatura/parcelamento',
          asaasChargeId: topup.asaasChargeId,
          subscriptionId: topup.subscriptionId,
          installmentId: topup.installmentId,
          revertedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    await tx.creditTopup.update({
      where: { id: topup.id },
      data: { status: CreditTopupStatus.CANCELED },
    });

    return { status: 'reverted' as const };
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log(
    `Modo: ${opts.apply ? 'APPLY (mudanças serão persistidas)' : 'DRY-RUN (somente leitura)'}`,
  );
  if (opts.allowNegative) {
    console.log('Flag: --allow-negative (carteira pode ficar com saldo negativo)');
  }
  if (opts.companyId) console.log(`Filtro: companyId=${opts.companyId}`);
  if (opts.topupId) console.log(`Filtro: topupId=${opts.topupId}`);
  if (opts.asaasChargeId)
    console.log(`Filtro: asaasChargeId=${opts.asaasChargeId}`);
  console.log('');

  const topups = await findOrphanTopups(opts);
  await printDryRunReport(topups);

  if (!opts.apply) {
    console.log('\nDry-run concluído. Execute novamente com --apply para reverter.');
    return;
  }

  if (topups.length === 0) return;

  console.log('\nAplicando reversões...');
  let reverted = 0;
  let skipped = 0;
  for (const t of topups) {
    try {
      const result = await revertTopup(t, opts.allowNegative);
      if (result.status === 'reverted') {
        reverted++;
        console.log(
          `  [OK] topup=${t.id} estornado (${formatBRL(t.amountCents)})`,
        );
      } else {
        skipped++;
        console.log(`  [SKIP] topup=${t.id}: ${result.reason}`);
      }
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [ERRO] topup=${t.id}: ${message}`);
    }
  }
  console.log(
    `\nFinalizado: ${reverted} revertido(s), ${skipped} ignorado(s).`,
  );
}

main()
  .catch((err) => {
    console.error('Falha:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { AppModule } from '../app.module';
import { OrderDeduplicationService } from '../deduplication/application/order-deduplication.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  itemFingerprint,
  laundryKitStoredOrderGroupKey,
  pickKeptLaundryKitOrder,
} from './laundrykit/laundrykit-stored-order-group';

/**
 * Consolida pedidos LaundryKit já importados 1 OP_ID = 1 venda
 * em 1 pagamento com N máquinas (mesmo prefixo T{timestamp}).
 *
 * - Mergeia OrderItem dos irmãos no pedido mantido
 * - Ajusta total/pagamento/desconto para o FINAL uma vez (mínimo do grupo)
 * - Reaponta MessageOrder e decrementa métricas só das conversões extras
 * - Apaga irmãos (cascade)
 * - Grava externalOrderId = prefixo T para a ingestão nova bater
 *
 * Uso:
 *   DRY_RUN=1 npm run script:consolidate-laundrykit-order-groups
 *   COMPANY_ID=<uuid> DRY_RUN=1 npm run script:consolidate-laundrykit-order-groups
 *   COMPANY_ID=<uuid> npm run script:consolidate-laundrykit-order-groups
 */

const isDryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const companyIdFilter = process.env.COMPANY_ID?.trim() || null;

type StoredOrder = Prisma.OrderGetPayload<{
  include: { items: true; payments: true; discounts: true };
}>;

function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

function collectMachines(observation?: string | null): string[] {
  if (!observation) return [];
  const machines = observation.match(/Máquinas?:\s*([^|]+)/i)?.[1];
  if (!machines) return [];
  return machines
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function collectEquipments(observation?: string | null): string[] {
  if (!observation) return [];
  const equipments =
    observation.match(/Equipamentos?:\s*([^|]+)/i)?.[1] ??
    observation.match(/IoT:\s*([^|]+)/i)?.[1];
  if (!equipments) return [];
  return equipments
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function collectAuth(observation?: string | null): string | undefined {
  return observation?.match(/Auth:\s*([^|]+)/)?.[1]?.trim();
}

function collectOrigin(observation?: string | null): string | undefined {
  return observation?.match(/Origem:\s*([^|]+)/)?.[1]?.trim();
}

function mergeObservation(orders: StoredOrder[]): string | undefined {
  const machines = [
    ...new Set(orders.flatMap((order) => collectMachines(order.observation))),
  ];
  const equipments = [
    ...new Set(orders.flatMap((order) => collectEquipments(order.observation))),
  ];
  const auth = orders.map((order) => collectAuth(order.observation)).find(Boolean);
  const origin = orders
    .map((order) => collectOrigin(order.observation))
    .find(Boolean);

  const parts = [
    machines.length > 0 ? `Máquinas: ${machines.join(', ')}` : undefined,
    equipments.length > 0 ? `Equipamentos: ${equipments.join(', ')}` : undefined,
    origin ? `Origem: ${origin}` : undefined,
    auth ? `Auth: ${auth}` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : orders[0]?.observation ?? undefined;
}

async function loadLaundryKitOrders(prisma: PrismaService): Promise<StoredOrder[]> {
  return prisma.order.findMany({
    where: {
      ...(companyIdFilter ? { companyId: companyIdFilter } : {}),
      OR: [
        { customerOrigin: 'laundrykit' },
        { salesChannel: { startsWith: 'laundrykit' } },
      ],
    },
    include: {
      items: true,
      payments: true,
      discounts: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}

function buildGroups(orders: StoredOrder[]): Map<string, StoredOrder[]> {
  const groups = new Map<string, StoredOrder[]>();
  for (const order of orders) {
    const key = laundryKitStoredOrderGroupKey(order);
    if (!key) continue;
    const mapKey = `${order.companyId}:${key}`;
    const bucket = groups.get(mapKey);
    if (bucket) bucket.push(order);
    else groups.set(mapKey, [order]);
  }
  return groups;
}

async function retargetMessageOrders(
  prisma: PrismaService,
  keptId: string,
  siblingIds: string[],
  deduplication: OrderDeduplicationService,
): Promise<void> {
  const keptLinks = await prisma.messageOrder.findMany({
    where: { orderId: keptId },
    select: { messageId: true },
  });
  const keptMessageIds = new Set(keptLinks.map((link) => link.messageId));

  const siblingLinks = await prisma.messageOrder.findMany({
    where: { orderId: { in: siblingIds } },
    select: { id: true, messageId: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const link of siblingLinks) {
    if (keptMessageIds.has(link.messageId)) continue;
    await prisma.messageOrder.update({
      where: { id: link.id },
      data: { orderId: keptId },
    });
    keptMessageIds.add(link.messageId);
  }

  await deduplication.adjustCampaignMetricsAfterOrderDeletion(siblingIds);
}

async function consolidateGroup(
  prisma: PrismaService,
  deduplication: OrderDeduplicationService,
  groupKey: string,
  orders: StoredOrder[],
): Promise<{ keptId: string; deleted: number; itemsMoved: number }> {
  const kept = pickKeptLaundryKitOrder(orders, groupKey);
  const siblings = orders.filter((order) => order.id !== kept.id);
  const siblingIds = siblings.map((order) => order.id);
  const minTotal = orders
    .map((order) => toDecimal(order.total))
    .reduce((acc, value) => Prisma.Decimal.min(acc, value));
  const maxDiscount = orders
    .flatMap((order) => order.discounts)
    .map((discount) => toDecimal(discount.value))
    .reduce((acc, value) => Prisma.Decimal.max(acc, value), new Prisma.Decimal(0));

  const existingFingerprints = new Set(
    kept.items.map((item) => itemFingerprint(item)),
  );
  const itemsToMove = siblings.flatMap((order) =>
    order.items.filter((item) => {
      const fingerprint = itemFingerprint(item);
      if (existingFingerprints.has(fingerprint)) return false;
      existingFingerprints.add(fingerprint);
      return true;
    }),
  );

  if (isDryRun) {
    return {
      keptId: kept.id,
      deleted: siblings.length,
      itemsMoved: itemsToMove.length,
    };
  }

  await prisma.$transaction(async (tx) => {
    if (itemsToMove.length > 0) {
      await tx.orderItem.updateMany({
        where: { id: { in: itemsToMove.map((item) => item.id) } },
        data: { orderId: kept.id },
      });
    }

    await tx.orderItem.updateMany({
      where: { orderId: kept.id },
      data: { unitPrice: 0, totalPrice: 0 },
    });

    const keptPayments = kept.payments;
    if (keptPayments.length > 0) {
      await tx.orderPayment.update({
        where: { id: keptPayments[0].id },
        data: { total: minTotal },
      });
      if (keptPayments.length > 1) {
        await tx.orderPayment.deleteMany({
          where: {
            id: { in: keptPayments.slice(1).map((payment) => payment.id) },
          },
        });
      }
    }

    if (maxDiscount.gt(0)) {
      if (kept.discounts.length > 0) {
        await tx.orderDiscount.update({
          where: { id: kept.discounts[0].id },
          data: { value: maxDiscount },
        });
        if (kept.discounts.length > 1) {
          await tx.orderDiscount.deleteMany({
            where: {
              id: { in: kept.discounts.slice(1).map((discount) => discount.id) },
            },
          });
        }
      } else {
        const source = siblings
          .flatMap((order) => order.discounts)
          .sort((a, b) => toDecimal(b.value).comparedTo(toDecimal(a.value)))[0];
        if (source) {
          await tx.orderDiscount.update({
            where: { id: source.id },
            data: { orderId: kept.id, value: maxDiscount },
          });
        }
      }
    }

    await tx.order.update({
      where: { id: kept.id },
      data: {
        total: minTotal,
        observation: mergeObservation(orders),
        externalOrderId: groupKey,
      },
    });
  });

  await retargetMessageOrders(prisma, kept.id, siblingIds, deduplication);

  await prisma.order.deleteMany({
    where: { id: { in: siblingIds } },
  });

  return {
    keptId: kept.id,
    deleted: siblings.length,
    itemsMoved: itemsToMove.length,
  };
}

async function bootstrap() {
  console.log('🚀 Consolidação de grupos LaundryKit\n');
  if (isDryRun) {
    console.log('ℹ️  DRY_RUN ativo: nenhum pedido será alterado.\n');
  }
  if (companyIdFilter) {
    console.log(`ℹ️  Filtro de empresa: COMPANY_ID=${companyIdFilter}\n`);
  } else {
    console.log(
      'ℹ️  Sem COMPANY_ID: apenas empresas com origem/canal laundrykit.\n',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const deduplication = app.get(OrderDeduplicationService);

  try {
    if (companyIdFilter) {
      const company = await prisma.company.findUnique({
        where: { id: companyIdFilter },
        select: { id: true, name: true },
      });
      if (!company) {
        console.error(
          `❌ Empresa não encontrada para COMPANY_ID=${companyIdFilter}.\n`,
        );
        process.exit(1);
      }
      console.log(`🏢 Empresa alvo: ${company.name} (${company.id})\n`);
    }

    const orders = await loadLaundryKitOrders(prisma);
    const groups = [...buildGroups(orders).entries()].filter(
      ([, bucket]) => bucket.length > 1,
    );

    console.log(`Pedidos LaundryKit lidos: ${orders.length}`);
    console.log(`Grupos com 2+ pedidos: ${groups.length}\n`);

    if (groups.length === 0) {
      console.log('✨ Nada para consolidar.\n');
      return;
    }

    const extras = groups.reduce((sum, [, bucket]) => sum + bucket.length - 1, 0);
    console.log(`Pedidos irmãos a remover: ${extras}`);
    console.log('');

    if (!isDryRun) {
      console.log(
        '⚠️  APPLY: merge de itens + exclusão de irmãos. Ctrl+C para cancelar; segue em 10s.\n',
      );
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }

    let kept = 0;
    let deleted = 0;
    let itemsMoved = 0;
    const byCompany = new Map<string, number>();

    let failed = 0;
    for (const [mapKey, bucket] of groups) {
      const groupKey = mapKey.slice(mapKey.indexOf(':') + 1);
      const companyId = bucket[0].companyId;
      const totals = bucket.map((order) => Number(order.total)).join(' + ');
      const minTotal = bucket
        .map((order) => toDecimal(order.total))
        .reduce((acc, value) => Prisma.Decimal.min(acc, value));

      try {
        const result = await consolidateGroup(
          prisma,
          deduplication,
          groupKey,
          bucket,
        );
        kept += 1;
        deleted += result.deleted;
        itemsMoved += result.itemsMoved;
        byCompany.set(companyId, (byCompany.get(companyId) ?? 0) + 1);
        console.log(
          `${isDryRun ? '[DRY_RUN]' : '[APPLY]'} ${groupKey} | ${bucket.length} pedidos (${totals}) → 1 venda ${minTotal} | mantém ${result.keptId} | move ${result.itemsMoved} itens | apaga ${result.deleted}`,
        );
      } catch (error) {
        failed += 1;
        console.error(
          `[ERRO] ${groupKey}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('RESUMO');
    console.log('='.repeat(70));
    console.log(`Modo: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Empresas: ${byCompany.size}`);
    console.log(`Grupos consolidados: ${kept}`);
    console.log(`Itens movidos: ${itemsMoved}`);
    console.log(`Pedidos irmãos: ${deleted}`);
    console.log(`Falhas: ${failed}`);
    console.log('='.repeat(70));
    console.log('\n🎉 Script concluído!\n');
  } catch (error) {
    console.error('\n❌ Erro ao executar script:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao inicializar script:', error);
  process.exit(1);
});

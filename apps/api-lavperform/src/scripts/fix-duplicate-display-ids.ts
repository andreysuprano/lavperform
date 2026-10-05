import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createDatabasePool } from '../prisma/database-pool';

/**
 * Remove pedidos duplicados por (companyId, displayId, integratorOrderId).
 *
 * Não sobe o AppModule do Nest (evita iniciar processors/cron contra o banco real);
 * usa apenas um PrismaClient próprio.
 *
 * Integrações como Cicclo usam displayId e integratorOrderId alinhados ao ID da venda
 * externa; reprocessamentos podem gerar mais de um registro com a mesma chave lógica.
 *
 * Estratégia:
 * - Agrupa por empresa + displayId + integratorOrderId (NULL conta como valor de agrupamento)
 * - Mantém o pedido mais antigo (createdAt, depois id)
 * - Exclui os demais (cascade em itens, pagamentos, endereço, etc.)
 *
 * Uso:
 *   npm run script:fix-duplicate-display-ids
 *   DRY_RUN=1 npm run script:fix-duplicate-display-ids                    # só lista, não apaga
 *   COMPANY_ID=<uuid> npm run script:fix-duplicate-display-ids            # restringe a uma empresa
 *   COMPANY_ID=<uuid> DRY_RUN=1 npm run script:fix-duplicate-display-ids  # dry run de uma empresa
 *   SALES_CHANNEL=CICCLO DRY_RUN=1 npm run script:fix-duplicate-display-ids  # só um canal
 *
 * Com SALES_CHANNEL definido:
 * - lista apenas pedidos desse canal;
 * - agrupa só por (companyId, displayId), sem integratorOrderId (depois que o processSale
 *   grava o id na cópia mais antiga, o agrupamento por integratorOrderId separaria o grupo);
 * - mantém, nesta ordem: pedido que já tem integratorOrderId; senão o que tem o
 *   MessageOrder mais antigo; senão o primeiro (mais antigo por createdAt, id);
 * - move os MessageOrder das cópias para o pedido mantido antes de apagá-las;
 * - se SALES_CHANNEL=CICCLO e o mantido tem integratorOrderId nulo, grava displayId nele.
 */

interface DuplicateGroup {
  companyId: string;
  displayId: number;
  integratorOrderId: number | null;
  orderIds: string[];
  count: number;
}

const isDryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const companyIdFilter = process.env.COMPANY_ID?.trim() || null;
const salesChannelFilter = process.env.SALES_CHANNEL?.trim() || null;

/**
 * Ordem de preferência: pedido com integratorOrderId já gravado; senão o com
 * MessageOrder mais antigo; senão o primeiro do grupo.
 * `orderIds` vem de ARRAY_AGG(id ORDER BY "createdAt", id).
 */
async function chooseSurvivor(prisma: PrismaClient, orderIds: string[]): Promise<string> {
  const stamped = await prisma.order.findMany({
    where: { id: { in: orderIds }, integratorOrderId: { not: null } },
    select: { id: true },
  });
  if (stamped.length > 0) {
    const stampedIds = new Set(stamped.map((o) => o.id));
    // preserva a ordem (createdAt, id) do grupo
    const first = orderIds.find((id) => stampedIds.has(id));
    if (first) {
      return first;
    }
  }

  const linked = await prisma.messageOrder.findFirst({
    where: { orderId: { in: orderIds } },
    select: { orderId: true },
    orderBy: { createdAt: 'asc' },
  });
  return linked?.orderId ?? orderIds[0];
}

async function findDuplicates(
  prisma: PrismaClient,
  companyId: string | null,
): Promise<DuplicateGroup[]> {
  const keys = salesChannelFilter
    ? 'companyId + displayId'
    : 'companyId + displayId + integratorOrderId';
  if (companyId) {
    console.log(`🔍 Buscando pedidos duplicados (${keys}) para a empresa ${companyId}...\n`);
  } else {
    console.log(`🔍 Buscando pedidos duplicados (${keys}) em TODAS as empresas...\n`);
  }

  const conditions: Prisma.Sql[] = [];
  if (companyId) {
    conditions.push(Prisma.sql`"companyId" = ${companyId}`);
  }
  if (salesChannelFilter) {
    conditions.push(Prisma.sql`"salesChannel"::text = ${salesChannelFilter}`);
  }
  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

  type Row = {
    companyId: string;
    displayId: number;
    integratorOrderId: number | null;
    count: bigint;
    orderIds: string[];
  };

  // Com SALES_CHANNEL: só (companyId, displayId). Depois que o processSale grava o id
  // na cópia mais antiga, incluir integratorOrderId separaria o grupo e perderia as cópias.
  const duplicates = salesChannelFilter
    ? await prisma.$queryRaw<Row[]>`
        SELECT
          "companyId",
          "displayId",
          NULL::int AS "integratorOrderId",
          COUNT(*)::bigint AS count,
          ARRAY_AGG(id ORDER BY "createdAt", id) AS "orderIds"
        FROM "Order"
        ${whereClause}
        GROUP BY "companyId", "displayId"
        HAVING COUNT(*) > 1
        ORDER BY count DESC, "companyId", "displayId"
      `
    : await prisma.$queryRaw<Row[]>`
        SELECT
          "companyId",
          "displayId",
          "integratorOrderId",
          COUNT(*)::bigint AS count,
          ARRAY_AGG(id ORDER BY "createdAt", id) AS "orderIds"
        FROM "Order"
        ${whereClause}
        GROUP BY "companyId", "displayId", "integratorOrderId"
        HAVING COUNT(*) > 1
        ORDER BY count DESC, "companyId", "displayId", "integratorOrderId"
      `;

  return duplicates.map((d) => ({
    companyId: d.companyId,
    displayId: d.displayId,
    integratorOrderId: d.integratorOrderId,
    orderIds: d.orderIds,
    count: Number(d.count),
  }));
}

async function getCompanyName(prisma: PrismaClient, companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  return company?.name || 'Desconhecida';
}

async function getOrderDetails(prisma: PrismaClient, orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      displayId: true,
      integratorOrderId: true,
      total: true,
      createdAt: true,
      customerId: true,
    },
  });
}

async function fixDuplicates(prisma: PrismaClient, duplicates: DuplicateGroup[]): Promise<void> {
  console.log(`\n📊 Encontrados ${duplicates.length} grupos duplicados\n`);

  if (duplicates.length === 0) {
    console.log('✨ Não há duplicados para remover!\n');
    return;
  }

  let totalDeleted = 0;
  let totalKept = 0;
  let totalMessageOrdersMoved = 0;
  const companiesProcessed = new Set<string>();

  for (const duplicate of duplicates) {
    const companyName = await getCompanyName(prisma, duplicate.companyId);
    companiesProcessed.add(duplicate.companyId);

    const integ = salesChannelFilter
      ? '(fora do agrupamento)'
      : duplicate.integratorOrderId === null
        ? 'NULL'
        : String(duplicate.integratorOrderId);

    console.log(`\n🏢 Empresa: ${companyName}`);
    console.log(`   📦 displayId: ${duplicate.displayId} | integratorOrderId: ${integ}`);
    console.log(`   📈 Pedidos no grupo: ${duplicate.count}`);

    let keptOrderId: string;
    let duplicatedOrderIds: string[];

    if (salesChannelFilter) {
      keptOrderId = await chooseSurvivor(prisma, duplicate.orderIds);
    } else {
      keptOrderId = duplicate.orderIds[0];
    }
    duplicatedOrderIds = duplicate.orderIds.filter((id) => id !== keptOrderId);

    let keptOrder = await getOrderDetails(prisma, keptOrderId);

    if (
      salesChannelFilter === 'CICCLO' &&
      keptOrder &&
      keptOrder.integratorOrderId === null
    ) {
      if (isDryRun) {
        console.log(
          `   [DRY_RUN] Gravaria integratorOrderId = ${duplicate.displayId} no pedido ${keptOrderId}`,
        );
      } else {
        try {
          await prisma.order.update({
            where: { id: keptOrderId },
            data: { integratorOrderId: duplicate.displayId },
          });
          console.log(
            `   🔧 integratorOrderId = ${duplicate.displayId} gravado no pedido ${keptOrderId}`,
          );
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            // Outro pedido do grupo já recebeu esse integratorOrderId: ele passa a ser o mantido.
            const holder = await prisma.order.findFirst({
              where: {
                companyId: duplicate.companyId,
                integratorOrderId: duplicate.displayId,
              },
              select: { id: true },
            });
            if (holder && duplicate.orderIds.includes(holder.id)) {
              console.warn(
                `   ⚠️  P2002 em ${keptOrderId}: mantendo ${holder.id}, que já tem integratorOrderId ${duplicate.displayId}`,
              );
              keptOrderId = holder.id;
              duplicatedOrderIds = duplicate.orderIds.filter((id) => id !== keptOrderId);
              keptOrder = await getOrderDetails(prisma, keptOrderId);
            } else {
              console.warn(
                `   ⚠️  P2002 em ${keptOrderId}: integratorOrderId ${duplicate.displayId} já pertence a pedido fora do grupo (${holder?.id ?? 'desconhecido'}); mantendo ${keptOrderId} sem alterar o id`,
              );
            }
          } else {
            throw error;
          }
        }
      }
    }

    console.log(`   ✅ Mantendo pedido: ${keptOrderId}`);
    console.log(`      - Criado em: ${keptOrder?.createdAt.toLocaleString('pt-BR')}`);
    console.log(`      - Total: R$ ${keptOrder?.total ?? 0}`);
    totalKept++;

    for (const orderId of duplicatedOrderIds) {
      try {
        const orderToDelete = await getOrderDetails(prisma, orderId);

        if (isDryRun) {
          console.log(`   [DRY_RUN] Removeria pedido ${orderId}`);
          console.log(
            `      - Criado em: ${orderToDelete?.createdAt.toLocaleString('pt-BR')}`,
          );
          console.log(`      - Total: R$ ${orderToDelete?.total ?? 0}`);
          if (salesChannelFilter) {
            const toMove = await prisma.messageOrder.count({ where: { orderId } });
            if (toMove > 0) {
              console.log(
                `      - [DRY_RUN] Moveria ${toMove} MessageOrder para o pedido ${keptOrderId}`,
              );
            }
            totalMessageOrdersMoved += toMove;
          }
          totalDeleted++;
          continue;
        }

        if (salesChannelFilter) {
          const moved = await prisma.$transaction(async (tx) => {
            const result = await tx.messageOrder.updateMany({
              where: { orderId },
              data: { orderId: keptOrderId },
            });
            await tx.order.delete({ where: { id: orderId } });
            return result.count;
          });
          if (moved > 0) {
            console.log(
              `      - ${moved} MessageOrder movido(s) para o pedido ${keptOrderId}`,
            );
          }
          totalMessageOrdersMoved += moved;
        } else {
          await prisma.order.delete({
            where: { id: orderId },
          });
        }

        console.log(`   🗑️  Pedido ${orderId} EXCLUÍDO`);
        console.log(
          `      - Criado em: ${orderToDelete?.createdAt.toLocaleString('pt-BR')}`,
        );
        console.log(`      - Total: R$ ${orderToDelete?.total ?? 0}`);
        totalDeleted++;
      } catch (error) {
        console.error(
          `   ❌ Erro ao excluir pedido ${orderId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📈 RESUMO DA EXECUÇÃO');
  console.log('='.repeat(70));
  console.log(`Modo: ${isDryRun ? 'DRY RUN (nenhuma exclusão)' : 'EXCLUSÃO REAL'}`);
  console.log(`Total de empresas processadas: ${companiesProcessed.size}`);
  console.log(`Total de grupos duplicados processados: ${duplicates.length}`);
  console.log(`✅ Pedidos mantidos (um por grupo): ${totalKept}`);
  console.log(
    `${isDryRun ? '🔎 Pedidos que seriam excluídos' : '🗑️  Pedidos excluídos'}: ${totalDeleted}`,
  );
  if (salesChannelFilter) {
    console.log(
      `${isDryRun ? '🔎 MessageOrder que seriam movidos' : '🔀 MessageOrder movidos'}: ${totalMessageOrdersMoved}`,
    );
  }
  console.log('='.repeat(70));
}

async function validateFix(
  prisma: PrismaClient,
  companyId: string | null,
): Promise<void> {
  console.log('\n🔍 Validando correção...\n');

  const remainingDuplicates = await findDuplicates(prisma, companyId);

  if (remainingDuplicates.length === 0) {
    console.log(
      `✅ Validação: não há mais duplicados por (${
        salesChannelFilter
          ? 'companyId, displayId'
          : 'companyId, displayId, integratorOrderId'
      })!\n`,
    );
  } else {
    console.log(`⚠️  Ainda existem ${remainingDuplicates.length} grupos duplicados:`);
    for (const dup of remainingDuplicates) {
      const companyName = await getCompanyName(prisma, dup.companyId);
      const integ = salesChannelFilter
        ? ''
        : `, integratorOrderId ${dup.integratorOrderId === null ? 'NULL' : String(dup.integratorOrderId)}`;
      console.log(
        `   - ${companyName}: displayId ${dup.displayId}${integ} (${dup.count} ocorrências)`,
      );
    }
    console.log('\n');
  }
}

async function bootstrap() {
  console.log('🚀 Script de exclusão de pedidos duplicados\n');
  if (isDryRun) {
    console.log('ℹ️  DRY_RUN ativo: nenhum pedido será apagado.\n');
  }
  if (salesChannelFilter) {
    console.log(`ℹ️  Filtro de canal ativo: SALES_CHANNEL=${salesChannelFilter}\n`);
  }
  if (companyIdFilter) {
    console.log(`ℹ️  Filtro de empresa ativo: COMPANY_ID=${companyIdFilter}\n`);
  } else {
    console.log('ℹ️  Nenhum COMPANY_ID informado: rodando em TODAS as empresas.\n');
  }

  // PrismaClient próprio (mesmo pool/adapter do PrismaService), sem AppModule:
  // não inicia CiccloSalesProcessor nem cron.
  const pool = createDatabasePool();
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    if (companyIdFilter) {
      const company = await prisma.company.findUnique({
        where: { id: companyIdFilter },
        select: { id: true, name: true },
      });

      if (!company) {
        console.error(
          `❌ Empresa não encontrada para COMPANY_ID=${companyIdFilter}. Abortando.\n`,
        );
        process.exitCode = 1;
        return;
      }

      console.log(`🏢 Empresa alvo: ${company.name} (${company.id})\n`);
    }

    const duplicates = await findDuplicates(prisma, companyIdFilter);

    if (duplicates.length === 0) {
      console.log(
        companyIdFilter
          ? '✨ Não há duplicados para esta empresa!\n'
          : '✨ Não há duplicados no sistema!\n',
      );
      return;
    }

    const companiesAffected = new Set(duplicates.map((d) => d.companyId)).size;
    const totalOrdersAffected = duplicates.reduce((sum, d) => sum + d.count, 0);

    console.log('📋 RESUMO PRÉ-EXECUÇÃO:');
    console.log(`   Empresas afetadas: ${companiesAffected}`);
    console.log(`   Grupos duplicados: ${duplicates.length}`);
    console.log(`   Total de pedidos nesses grupos: ${totalOrdersAffected}`);
    console.log('');

    if (!isDryRun) {
      console.log('⚠️  ATENÇÃO: pedidos duplicados serão EXCLUÍDOS permanentemente.');
      console.log('   Mantém-se apenas o mais antigo de cada grupo.');
      console.log('   Ação IRREVERSÍVEL. Ctrl+C para cancelar; em 10 segundos segue...\n');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    await fixDuplicates(prisma, duplicates);

    if (!isDryRun) {
      await validateFix(prisma, companyIdFilter);
    }

    console.log('🎉 Script concluído!\n');
  } catch (error) {
    console.error('\n❌ Erro ao executar script:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao inicializar script:', error);
  process.exit(1);
});

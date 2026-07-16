import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Remove pedidos duplicados por (companyId, displayId, integratorOrderId).
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

async function findDuplicates(
  prisma: PrismaService,
  companyId: string | null,
): Promise<DuplicateGroup[]> {
  if (companyId) {
    console.log(
      `🔍 Buscando pedidos duplicados (displayId + integratorOrderId) para a empresa ${companyId}...\n`,
    );
  } else {
    console.log(
      '🔍 Buscando pedidos duplicados (companyId + displayId + integratorOrderId) em TODAS as empresas...\n',
    );
  }

  const whereClause = companyId
    ? Prisma.sql`WHERE "companyId" = ${companyId}`
    : Prisma.empty;

  const duplicates = await prisma.$queryRaw<
    Array<{
      companyId: string;
      displayId: number;
      integratorOrderId: number | null;
      count: bigint;
      orderIds: string[];
    }>
  >`
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

async function getCompanyName(prisma: PrismaService, companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  return company?.name || 'Desconhecida';
}

async function getOrderDetails(prisma: PrismaService, orderId: string) {
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

async function fixDuplicates(prisma: PrismaService, duplicates: DuplicateGroup[]): Promise<void> {
  console.log(`\n📊 Encontrados ${duplicates.length} grupos duplicados\n`);

  if (duplicates.length === 0) {
    console.log('✨ Não há duplicados para remover!\n');
    return;
  }

  let totalDeleted = 0;
  let totalKept = 0;
  const companiesProcessed = new Set<string>();

  for (const duplicate of duplicates) {
    const companyName = await getCompanyName(prisma, duplicate.companyId);
    companiesProcessed.add(duplicate.companyId);

    const integ =
      duplicate.integratorOrderId === null
        ? 'NULL'
        : String(duplicate.integratorOrderId);

    console.log(`\n🏢 Empresa: ${companyName}`);
    console.log(`   📦 displayId: ${duplicate.displayId} | integratorOrderId: ${integ}`);
    console.log(`   📈 Pedidos no grupo: ${duplicate.count}`);

    const [keptOrderId, ...duplicatedOrderIds] = duplicate.orderIds;

    const keptOrder = await getOrderDetails(prisma, keptOrderId);
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
          totalDeleted++;
          continue;
        }

        await prisma.order.delete({
          where: { id: orderId },
        });

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
  console.log('='.repeat(70));
}

async function validateFix(
  prisma: PrismaService,
  companyId: string | null,
): Promise<void> {
  console.log('\n🔍 Validando correção...\n');

  const remainingDuplicates = await findDuplicates(prisma, companyId);

  if (remainingDuplicates.length === 0) {
    console.log(
      '✅ Validação: não há mais duplicados por (companyId, displayId, integratorOrderId)!\n',
    );
  } else {
    console.log(`⚠️  Ainda existem ${remainingDuplicates.length} grupos duplicados:`);
    for (const dup of remainingDuplicates) {
      const companyName = await getCompanyName(prisma, dup.companyId);
      const integ = dup.integratorOrderId === null ? 'NULL' : String(dup.integratorOrderId);
      console.log(
        `   - ${companyName}: displayId ${dup.displayId}, integratorOrderId ${integ} (${dup.count} ocorrências)`,
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
  if (companyIdFilter) {
    console.log(`ℹ️  Filtro de empresa ativo: COMPANY_ID=${companyIdFilter}\n`);
  } else {
    console.log('ℹ️  Nenhum COMPANY_ID informado: rodando em TODAS as empresas.\n');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);

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
        process.exit(1);
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
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao inicializar script:', error);
  process.exit(1);
});

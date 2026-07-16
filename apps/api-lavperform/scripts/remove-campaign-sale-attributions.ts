import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está configurado; configure no seu arquivo .env.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Lê o id da campanha automática dos argumentos da linha de comando.
 * Aceita os formatos: --id=<uuid>, --id <uuid> e <uuid> posicional.
 */
function parseArgs(): { campaignId: string; isDryRun: boolean } {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  let campaignId: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--id=')) {
      campaignId = arg.slice('--id='.length);
      break;
    }
    if (arg === '--id') {
      campaignId = args[i + 1];
      break;
    }
    if (!arg.startsWith('--')) {
      campaignId = arg;
      break;
    }
  }

  if (!campaignId) {
    throw new Error(
      'Informe o id da automatic campaign. Uso: ts-node scripts/remove-campaign-sale-attributions.ts <automaticCampaignId> [--dry-run]',
    );
  }

  return { campaignId, isDryRun };
}

async function removeCampaignSaleAttributions() {
  const { campaignId, isDryRun } = parseArgs();

  console.log('='.repeat(70));
  console.log('  Remoção de atribuições de venda de campanha automática');
  if (isDryRun) {
    console.log('  MODO DRY-RUN: nenhuma alteração será salva no banco');
  }
  console.log('='.repeat(70));
  console.log(`Campanha alvo: ${campaignId}`);
  console.log('');

  const campaign = await prisma.automaticCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, companyId: true, deletedAt: true },
  });

  if (!campaign) {
    throw new Error(`AutomaticCampaign ${campaignId} não encontrada.`);
  }

  console.log(`Nome:    ${campaign.name}`);
  console.log(`Empresa: ${campaign.companyId}`);
  if (campaign.deletedAt) {
    console.log(`Atenção: campanha possui deletedAt = ${campaign.deletedAt.toISOString()}`);
  }
  console.log('');

  // Busca todas as mensagens da campanha que possuem MessageOrder vinculado.
  // Trazemos também o total do pedido para podermos descontar do CampaignMetric.
  const messageOrders = await prisma.messageOrder.findMany({
    where: {
      message: { automaticCampaignId: campaignId },
    },
    select: {
      id: true,
      messageId: true,
      orderId: true,
      order: { select: { id: true, total: true } },
    },
  });

  console.log(`MessageOrders vinculados: ${messageOrders.length}`);

  if (messageOrders.length === 0) {
    console.log('Nenhuma atribuição de venda encontrada para esta campanha.');
    console.log('Métricas continuarão inalteradas.');
    return;
  }

  const totalQuantity = messageOrders.length;
  const totalAmount = messageOrders.reduce(
    (acc, mo) => acc.plus(new Prisma.Decimal(mo.order.total as unknown as string)),
    new Prisma.Decimal(0),
  );

  console.log(`Quantidade total de vendas a remover: ${totalQuantity}`);
  console.log(`Valor total a descontar:              ${totalAmount.toString()}`);
  console.log('');

  const metrics = await prisma.campaignMetric.findMany({
    where: { automaticCampaignId: campaignId },
    orderBy: { createdAt: 'desc' },
  });

  if (metrics.length === 0) {
    console.log(
      'Nenhum registro em CampaignMetric foi encontrado para esta campanha. Apenas as atribuições serão removidas.',
    );
  } else {
    console.log(`CampaignMetric encontrados: ${metrics.length}`);
    metrics.forEach((m, idx) => {
      console.log(
        `  [${idx}] id=${m.id} createdAt=${m.createdAt.toISOString()} sent=${m.messagesSent} salesQty=${m.salesTotalQuantity} salesAmount=${m.salesTotalAmount.toString()} conversionRate=${m.conversionRate.toString()}`,
      );
    });
  }
  console.log('');

  // Concentra o estorno no metric mais recente, espelhando a lógica usada em
  // sale-campaign-attribution.processor.ts (findFirst orderBy createdAt desc).
  const targetMetric = metrics[0];
  let projectedSalesQuantity = 0;
  let projectedSalesAmount = new Prisma.Decimal(0);
  let projectedConversionRate = new Prisma.Decimal(0);

  if (targetMetric) {
    projectedSalesQuantity = Math.max(
      targetMetric.salesTotalQuantity - totalQuantity,
      0,
    );
    projectedSalesAmount = Prisma.Decimal.max(
      new Prisma.Decimal(targetMetric.salesTotalAmount).minus(totalAmount),
      new Prisma.Decimal(0),
    );
    projectedConversionRate =
      targetMetric.messagesSent > 0
        ? new Prisma.Decimal(projectedSalesQuantity)
            .div(targetMetric.messagesSent)
            .times(100)
            .toDecimalPlaces(2)
        : new Prisma.Decimal(0);

    console.log('Métricas projetadas após o estorno (no metric mais recente):');
    console.log(`  salesTotalQuantity: ${targetMetric.salesTotalQuantity} -> ${projectedSalesQuantity}`);
    console.log(
      `  salesTotalAmount:   ${targetMetric.salesTotalAmount.toString()} -> ${projectedSalesAmount.toString()}`,
    );
    console.log(
      `  conversionRate:     ${targetMetric.conversionRate.toString()} -> ${projectedConversionRate.toString()}`,
    );
    console.log('');
  }

  if (isDryRun) {
    console.log('Dry-run ativo   nada foi salvo no banco. Para aplicar, execute novamente sem --dry-run.');
    return;
  }

  const messageOrderIds = messageOrders.map((mo) => mo.id);

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.messageOrder.deleteMany({
      where: { id: { in: messageOrderIds } },
    });

    let updatedMetricId: string | null = null;
    if (targetMetric) {
      const updated = await tx.campaignMetric.update({
        where: { id: targetMetric.id },
        data: {
          salesTotalQuantity: projectedSalesQuantity,
          salesTotalAmount: projectedSalesAmount,
          conversionRate: projectedConversionRate,
        },
      });
      updatedMetricId = updated.id;
    }

    return { deletedCount: deleted.count, updatedMetricId };
  });

  console.log('='.repeat(70));
  console.log('Resumo:');
  console.log(`  MessageOrders removidos: ${result.deletedCount}`);
  if (result.updatedMetricId) {
    console.log(`  CampaignMetric ajustado: ${result.updatedMetricId}`);
  } else {
    console.log('  Nenhum CampaignMetric foi ajustado (não havia registro).');
  }
  console.log('='.repeat(70));
}

removeCampaignSaleAttributions()
  .then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript finalizado com erro:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

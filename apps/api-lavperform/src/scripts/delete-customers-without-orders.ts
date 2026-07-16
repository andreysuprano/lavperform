import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Remove clientes de uma empresa que não possuem nenhum pedido (Order).
 *
 * Ordem de exclusão: MessageInteraction → MessageOrder → Message → Customer.
 * (Pedidos e histórico RFV do cliente fazem CASCADE no banco; mensagens não.)
 *
 * Uso:
 *   COMPANY_ID=<uuid> DRY_RUN=1 npm run script:delete-customers-without-orders
 *   COMPANY_ID=<uuid> npm run script:delete-customers-without-orders
 *
 * Variáveis:
 *   COMPANY_ID   obrigatório (UUID da empresa)
 *   DRY_RUN=1 | true   só lista quantidade e uma amostra, não apaga
 *   BATCH_SIZE   opcional, padrão 500 (IDs por lote na exclusão)
 */

const companyIdArg = process.env.COMPANY_ID?.trim() || '';
const isDryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const batchSize = Math.max(1, Math.min(Number(process.env.BATCH_SIZE) || 500, 5000));

const SAMPLE_LIMIT = 20;

async function bootstrap() {
  console.log('🚀 Exclusão de clientes sem vendas (sem Order)\n');

  if (!companyIdArg) {
    console.error('❌ Defina COMPANY_ID=<uuid> da empresa. Abortando.\n');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('ℹ️  DRY_RUN ativo: nenhum registro será apagado.\n');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyIdArg },
      select: { id: true, name: true },
    });

    if (!company) {
      console.error(`❌ Empresa não encontrada: COMPANY_ID=${companyIdArg}\n`);
      process.exit(1);
    }

    console.log(`🏢 Empresa: ${company.name} (${company.id})\n`);

    const whereNoOrders = {
      companyId: company.id,
      orders: { none: {} },
    } as const;

    const totalWithoutOrders = await prisma.customer.count({ where: whereNoOrders });

    if (totalWithoutOrders === 0) {
      console.log('✨ Nenhum cliente sem pedido nesta empresa.\n');
      return;
    }

    const sample = await prisma.customer.findMany({
      where: whereNoOrders,
      take: SAMPLE_LIMIT,
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 Clientes sem pedido: ${totalWithoutOrders}`);
    console.log(`\n📋 Amostra (até ${SAMPLE_LIMIT}):`);
    for (const c of sample) {
      console.log(`   - ${c.name} | ${c.phone} | ${c.id}`);
    }
    if (totalWithoutOrders > sample.length) {
      console.log(`   ... e mais ${totalWithoutOrders - sample.length}\n`);
    } else {
      console.log('');
    }

    if (isDryRun) {
      console.log('ℹ️  Remova DRY_RUN para executar a exclusão.\n');
      return;
    }

    console.log('⚠️  ATENÇÃO: clientes listados serão removidos com suas mensagens (campanhas).');
    console.log('   Pedidos: apenas clientes sem nenhum Order são alvo.');
    console.log('   Ação irreversível. Aguardando 10s (Ctrl+C para cancelar)...\n');
    await new Promise((r) => setTimeout(r, 10_000));

    let deletedCustomers = 0;
    let deletedMessages = 0;

    for (;;) {
      const batch = await prisma.customer.findMany({
        where: whereNoOrders,
        take: batchSize,
        select: { id: true },
      });

      if (batch.length === 0) {
        break;
      }

      const ids = batch.map((b) => b.id);

      const result = await prisma.$transaction(async (tx) => {
        const ia = await tx.messageInteraction.deleteMany({
          where: { message: { customerId: { in: ids } } },
        });
        const mo = await tx.messageOrder.deleteMany({
          where: { message: { customerId: { in: ids } } },
        });
        const msg = await tx.message.deleteMany({
          where: { customerId: { in: ids } },
        });
        const cust = await tx.customer.deleteMany({
          where: { id: { in: ids } },
        });
        return { ia: ia.count, mo: mo.count, msg: msg.count, cust: cust.count };
      });

      deletedCustomers += result.cust;
      deletedMessages += result.msg;
      console.log(
        `   Lote: +${result.cust} clientes, +${result.msg} mensagens, ` +
          `+${result.ia} interações, +${result.mo} message-order`,
      );
    }

    console.log('\n✅ Concluído.');
    console.log(`   Clientes removidos: ${deletedCustomers}`);
    console.log(`   Mensagens removidas: ${deletedMessages}\n`);
  } catch (err) {
    console.error('\n❌ Erro:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

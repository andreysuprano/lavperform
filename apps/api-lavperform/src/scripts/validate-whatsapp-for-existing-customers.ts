import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../common/queue/queue.constants';

async function bootstrap() {
  console.log('🚀 Iniciando script de validação de WhatsApp para clientes existentes...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const whatsappValidationQueue = app.get<Queue>(getQueueToken(QUEUE_NAMES.WHATSAPP_VALIDATION));

    const batchSize = 500;
    let skip = 0;
    let totalProcessed = 0;

    while (true) {
      console.log(`📊 Buscando clientes (skip=${skip}, take=${batchSize})...`);

      const customers = await prisma.customer.findMany({
        where: {
          whatsappVerified: false,
          whatsappVerifiedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: batchSize,
        select: {
          id: true,
          phone: true,
          companyId: true,
        },
      });

      if (!customers.length) {
        break;
      }

      console.log(`✅ Encontrados ${customers.length} clientes para enfileirar validação.`);

      const jobs = customers.map((customer) => ({
        name: 'validate',
        data: {
          customerId: customer.id,
          companyId: customer.companyId,
          phone: customer.phone,
        },
      }));

      await whatsappValidationQueue.addBulk(jobs);

      totalProcessed += customers.length;
      skip += batchSize;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMO DA EXECUÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de clientes enfileirados para validação: ${totalProcessed}`);
    console.log('='.repeat(60));

    console.log('\n🎉 Script concluído com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro fatal ao executar script de validação de WhatsApp:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Erro ao inicializar script:', error);
  process.exit(1);
});


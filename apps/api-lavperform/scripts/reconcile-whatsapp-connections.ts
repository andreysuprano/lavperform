import 'dotenv/config';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { PrismaService } from '../src/prisma/prisma.service';
import { UazapiClient } from '../src/whatsapp/uazapi/uazapi.client';
import { WhatsappCompanyConnectionSnapshotService } from '../src/whatsapp/application/whatsapp-company-connection-snapshot.service';
import { WhatsappConnectionReconcileTasks } from '../src/whatsapp/crons/whatsapp-connection-reconcile-tasks';

/**
 * Executa sob demanda a mesma reconciliação do cron de 30 minutos
 * (`WhatsappConnectionReconcileTasks`), útil logo após um deploy para
 * popular o snapshot de conexões sem esperar o próximo ciclo.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurado; configure no seu arquivo .env.');
  }
  if (!process.env.UAZAPI_API_URL || !process.env.UAZAPI_ADMIN_API_KEY) {
    throw new Error('UAZAPI_API_URL e UAZAPI_ADMIN_API_KEY são obrigatórios.');
  }

  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    const uazapiClient = new UazapiClient(new HttpService(axios.create()));
    const snapshotService = new WhatsappCompanyConnectionSnapshotService(prisma);
    const tasks = new WhatsappConnectionReconcileTasks(
      uazapiClient,
      prisma,
      snapshotService,
    );

    await tasks.reconcileConnections();

    const summary = await prisma.whatsappCompanyConnection.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    console.log('Snapshot após reconciliação:');
    for (const row of summary) {
      console.log(`  ${row.status}: ${row._count._all}`);
    }
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error('Falha na reconciliação:', error);
  process.exit(1);
});

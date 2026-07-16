import 'dotenv/config';
import { PrismaClient, MessageStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está configurado; configure no seu arquivo .env.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes('--dry-run');

/**
 * Gera um horário aleatório entre dois instantes (em ms),
 * preservando a mesma data UTC do baseDate.
 */
function randomTimeBetween(from: Date, to: Date): Date {
  const fromMs = from.getTime();
  const toMs = to.getTime();

  if (fromMs >= toMs) {
    throw new Error(
      `Janela de horários inválida: "from" (${from.toISOString()}) deve ser anterior a "to" (${to.toISOString()})`,
    );
  }

  const randomMs = Math.floor(Math.random() * (toMs - fromMs) + fromMs);
  return new Date(randomMs);
}

async function rescheduleOverdueMessages() {
  console.log('='.repeat(60));
  console.log('  Reagendador de mensagens com horário passado');
  if (isDryRun) {
    console.log('  MODO DRY-RUN: nenhuma alteração será salva no banco');
  }
  console.log('='.repeat(60));
  console.log('');

  try {
    const now = new Date();

    // Início do dia UTC (00:00:00.000)
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Fim do dia UTC (23:59:59.999)
    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // Buffer mínimo de 2 minutos a partir de agora para cair na janela do cron
    const minFrom = new Date(now.getTime() + 2 * 60 * 1000);

    console.log(`Horário atual (UTC):     ${now.toISOString()}`);
    console.log(`Início do dia (UTC):     ${startOfToday.toISOString()}`);
    console.log(`Fim do dia (UTC):        ${endOfToday.toISOString()}`);
    console.log(`Janela de redistribuição: ${minFrom.toISOString()} → ${endOfToday.toISOString()}`);
    console.log('');

    if (minFrom >= endOfToday) {
      console.log('Já passou das 23:57 UTC   não há janela disponível para reagendar hoje.');
      return;
    }

    // Busca mensagens PENDING agendadas para hoje com horário já passado
    const overdueMessages = await prisma.message.findMany({
      where: {
        scheduledDate: {
          gte: startOfToday,
          lt: now,
        },
        status: MessageStatus.PENDING,
      },
      select: {
        id: true,
        scheduledDate: true,
        customerName: true,
        phone: true,
        companyId: true,
        automaticCampaignId: true,
        campaignId: true,
      },
    });

    console.log(`Mensagens com horário passado encontradas: ${overdueMessages.length}`);
    console.log('');

    if (overdueMessages.length === 0) {
      console.log('Nenhuma mensagem para reagendar.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const message of overdueMessages) {
      try {
        const newScheduledDate = randomTimeBetween(minFrom, endOfToday);

        console.log(`[${message.id}]`);
        console.log(`  Cliente:        ${message.customerName} (${message.phone})`);
        console.log(`  Empresa:        ${message.companyId}`);
        console.log(`  Horário antigo: ${message.scheduledDate?.toISOString()}`);
        console.log(`  Horário novo:   ${newScheduledDate.toISOString()}`);

        if (!isDryRun) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              scheduledDate: newScheduledDate,
              status: MessageStatus.PENDING,
            },
          });
          console.log(`  Status: REAGENDADO`);
        } else {
          console.log(`  Status: [DRY-RUN] SERIA REAGENDADO`);
        }

        console.log('');
        successCount++;
      } catch (err: any) {
        console.error(`  ERRO ao reagendar mensagem ${message.id}: ${err.message}`);
        console.log('');
        errorCount++;
      }
    }

    console.log('='.repeat(60));
    console.log('Resumo:');
    console.log(`  Reagendadas com sucesso: ${successCount}`);
    console.log(`  Erros:                   ${errorCount}`);
    console.log(`  Total processadas:       ${overdueMessages.length}`);
    if (isDryRun) {
      console.log('');
      console.log('  (Dry-run ativo   nada foi salvo no banco)');
      console.log('  Para aplicar as alterações, execute sem --dry-run');
    }
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Erro fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

rescheduleOverdueMessages()
  .then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript finalizado com erro:', error);
    process.exit(1);
  });

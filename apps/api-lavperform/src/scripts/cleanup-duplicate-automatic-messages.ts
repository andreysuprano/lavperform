import 'dotenv/config';
import { MessageStatus, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { endOfDayInTz, startOfDayInTz } from '../common/utils/date.utils';
import {
  DAILY_AUTOMATIC_DUPLICATE_ERROR,
} from '../automatic-campaign/application/automatic-message-daily-guard.service';
import { selectDuplicateAutomaticMessageIds } from '../automatic-campaign/application/daily-message-cleanup';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const ACTIVE_STATUSES = [
  MessageStatus.PENDING,
  MessageStatus.PROCESSING,
  MessageStatus.SENT,
];
const ABORTABLE_STATUSES = [MessageStatus.PENDING, MessageStatus.PROCESSING];

export type CleanupScriptArgs = {
  apply: boolean;
  companyId?: string;
};

export function parseCleanupScriptArgs(argv: string[]): CleanupScriptArgs {
  const apply = argv.includes('--apply') && !argv.includes('--dry-run');
  const companyIdIndex = argv.indexOf('--company-id');
  const companyId =
    companyIdIndex >= 0 ? argv[companyIdIndex + 1]?.trim() || undefined : undefined;

  return { apply, companyId };
}

async function main() {
  const { apply, companyId } = parseCleanupScriptArgs(process.argv.slice(2));
  const mode = apply ? 'APPLY' : 'DRY-RUN';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurado.');
  }

  console.log(`Limpeza de duplicatas automáticas (${mode})\n`);
  if (!apply) {
    console.log('Nenhuma alteração será gravada. Use --apply para abortar duplicatas.\n');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const now = new Date();

  try {
    const messages = await prisma.message.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        automaticCampaignId: { not: null },
        status: { in: ACTIVE_STATUSES },
        createdAt: {
          gte: startOfDayInTz(now, SAO_PAULO_TIME_ZONE),
          lte: endOfDayInTz(now, SAO_PAULO_TIME_ZONE),
        },
      },
      select: {
        id: true,
        companyId: true,
        customerId: true,
        phone: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const duplicateIds = selectDuplicateAutomaticMessageIds(messages);

    console.log(`Mensagens ativas hoje: ${messages.length}`);
    console.log(`Duplicatas a abortar: ${duplicateIds.length}`);
    if (duplicateIds.length > 0) {
      console.log('IDs:', duplicateIds.join(', '));
    }

    if (!apply || duplicateIds.length === 0) {
      return;
    }

    const result = await prisma.message.updateMany({
      where: {
        id: { in: duplicateIds },
        status: { in: ABORTABLE_STATUSES },
      },
      data: {
        status: MessageStatus.ABORTED,
        error: DAILY_AUTOMATIC_DUPLICATE_ERROR,
        updatedAt: new Date(),
      },
    });

    console.log(`\nMensagens abortadas: ${result.count}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerDuplicateService } from '../deduplication/application/customer-duplicate.service';
import {
  normalizeCpfDigits,
  normalizeStoredPhone,
} from '../customers/application/customer-identifier';
import { VMLAV_PARTNER_SLUG } from '../integrations/vmlav/vmlav.constants';

/**
 * Normaliza telefone/CPF de clientes em empresas com integração VM Lav ativa.
 *
 * Dry-run por padrão (apenas relata). Mutação só com --apply.
 *
 * Uso:
 *   npm run script:normalize-vmlav-customers
 *   npm run script:normalize-vmlav-customers -- --dry-run
 *   npm run script:normalize-vmlav-customers -- --apply
 */

function shouldApply(argv: string[]): boolean {
  return argv.includes('--apply') && !argv.includes('--dry-run');
}

async function countPendingNormalizations(
  prisma: PrismaService,
  companyId: string,
): Promise<number> {
  const customers = await prisma.customer.findMany({
    where: { companyId },
    select: { phone: true, cpf: true },
  });

  return customers.filter((customer) => {
    const phone = normalizeStoredPhone(customer.phone);
    const cpf = normalizeCpfDigits(customer.cpf);
    return phone !== customer.phone || cpf !== customer.cpf;
  }).length;
}

async function bootstrap() {
  const apply = shouldApply(process.argv.slice(2));
  const mode = apply ? 'APPLY' : 'DRY-RUN';

  console.log(`Normalização de identificadores VMLAV (${mode})\n`);
  if (!apply) {
    console.log('Nenhuma alteração será gravada. Use --apply para normalizar.\n');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const duplicateService = app.get(CustomerDuplicateService);

    const companies = await prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            partner: {
              partnerSlug: VMLAV_PARTNER_SLUG,
            },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    console.log(`Empresas com integração ${VMLAV_PARTNER_SLUG} ativa: ${companies.length}\n`);

    let totalUpdated = 0;

    for (const company of companies) {
      const updated = apply
        ? (await duplicateService.normalizeIdentifiers(company.id)).updated
        : await countPendingNormalizations(prisma, company.id);

      totalUpdated += updated;
      console.log(
        `${company.name} (${company.id}) atualizados=${updated}${apply ? '' : ' (pendentes)'}`,
      );
    }

    console.log(`\nTotal: ${totalUpdated}${apply ? ' atualizados' : ' pendentes'}`);
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

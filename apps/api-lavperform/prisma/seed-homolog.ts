import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import {
  FAKE_HOMOLOG_CUSTOMERS,
  HOMOLOG_ACCESS_MODULES,
  HOMOLOG_ADDRESS,
  HOMOLOG_BRAND,
  HOMOLOG_COMPANY,
  HOMOLOG_DRAFT,
  HOMOLOG_PLAN,
  QA_USER_NAME,
  QA_USER_PHONE,
  REAL_CONTACT_EMAIL,
} from './homolog-seed-data';
import {
  HomologSeedRefusedError,
  assertHomologSeedAllowed,
  readHomologSeedSecrets,
  type HomologSeedSecrets,
} from './homolog-seed-guard';

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 4)}…${digits.slice(-2)}`;
}

async function upsertCustomer(
  prisma: PrismaClient,
  companyId: string,
  data: {
    name: string;
    email: string;
    phone: string;
    whatsappOptin: boolean;
    observations: string;
  },
) {
  const existing = await prisma.customer.findFirst({
    where: { companyId, email: data.email },
    select: { id: true },
  });
  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data,
    });
    return;
  }
  await prisma.customer.create({
    data: {
      ...data,
      companyId,
      rfvClassification: 'novo',
    },
  });
}

export async function seedHomolog(
  prisma: PrismaClient,
  secrets: HomologSeedSecrets,
): Promise<{ companyId: string; fakeCustomers: number; realContact: boolean }> {
  const passwordHash = await bcrypt.hash(secrets.password, 10);

  const existingCompany = await prisma.company.findUnique({
    where: { cnpj: HOMOLOG_COMPANY.cnpj },
    select: { addressId: true },
  });

  let addressId = existingCompany?.addressId ?? null;
  if (addressId) {
    await prisma.address.update({
      where: { id: addressId },
      data: HOMOLOG_ADDRESS,
    });
  } else {
    const address = await prisma.address.create({ data: HOMOLOG_ADDRESS });
    addressId = address.id;
  }

  const company = await prisma.company.upsert({
    where: { cnpj: HOMOLOG_COMPANY.cnpj },
    create: {
      name: HOMOLOG_COMPANY.name,
      cnpj: HOMOLOG_COMPANY.cnpj,
      email: HOMOLOG_COMPANY.email,
      phone: HOMOLOG_COMPANY.phone,
      slug: HOMOLOG_COMPANY.slug,
      state: HOMOLOG_COMPANY.state,
      serviceModel: HOMOLOG_COMPANY.serviceModel,
      addressId,
      asaasCustomerId: null,
    },
    update: {
      name: HOMOLOG_COMPANY.name,
      email: HOMOLOG_COMPANY.email,
      phone: HOMOLOG_COMPANY.phone,
      slug: HOMOLOG_COMPANY.slug,
      state: HOMOLOG_COMPANY.state,
      serviceModel: HOMOLOG_COMPANY.serviceModel,
      addressId,
      deletedAt: null,
      asaasCustomerId: null,
    },
  });

  await prisma.plan.upsert({
    where: { id: HOMOLOG_PLAN.id },
    create: {
      id: HOMOLOG_PLAN.id,
      name: HOMOLOG_PLAN.name,
      description: HOMOLOG_PLAN.description,
      price: HOMOLOG_PLAN.price,
      cycle: HOMOLOG_PLAN.cycle,
    },
    update: {
      name: HOMOLOG_PLAN.name,
      description: HOMOLOG_PLAN.description,
      price: HOMOLOG_PLAN.price,
      cycle: HOMOLOG_PLAN.cycle,
    },
  });

  await prisma.companySubscription.upsert({
    where: {
      companyId_planId: { companyId: company.id, planId: HOMOLOG_PLAN.id },
    },
    create: {
      companyId: company.id,
      planId: HOMOLOG_PLAN.id,
      subscriptionId: null,
    },
    update: {
      subscriptionId: null,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: secrets.email },
    create: {
      email: secrets.email,
      name: QA_USER_NAME,
      phone: QA_USER_PHONE,
      password: passwordHash,
    },
    update: {
      name: QA_USER_NAME,
      phone: QA_USER_PHONE,
      password: passwordHash,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: { userId: user.id, companyId: company.id },
    },
    create: { userId: user.id, companyId: company.id },
    update: {},
  });

  for (const module of HOMOLOG_ACCESS_MODULES) {
    await prisma.accessRule.upsert({
      where: {
        userId_companyId_module_action: {
          userId: user.id,
          companyId: company.id,
          module,
          action: 'manage',
        },
      },
      create: {
        userId: user.id,
        companyId: company.id,
        module,
        action: 'manage',
      },
      update: {},
    });
  }

  for (const customer of FAKE_HOMOLOG_CUSTOMERS) {
    await upsertCustomer(prisma, company.id, customer);
  }

  if (secrets.testPhone) {
    await upsertCustomer(prisma, company.id, {
      name: 'Contato de teste',
      email: REAL_CONTACT_EMAIL,
      phone: secrets.testPhone,
      whatsappOptin: true,
      observations:
        'Seed de homologação. Contato real informado em SEED_TEST_PHONE.',
    });
  }

  await prisma.brandIdentity.upsert({
    where: { companyId: company.id },
    create: { companyId: company.id, ...HOMOLOG_BRAND },
    update: HOMOLOG_BRAND,
  });

  const existingDraft = await prisma.socialPostDraft.findFirst({
    where: { companyId: company.id, theme: HOMOLOG_DRAFT.theme },
    select: { id: true },
  });
  if (!existingDraft) {
    await prisma.socialPostDraft.create({
      data: {
        companyId: company.id,
        objective: HOMOLOG_DRAFT.objective,
        theme: HOMOLOG_DRAFT.theme,
        format: HOMOLOG_DRAFT.format,
        slideCount: HOMOLOG_DRAFT.slideCount,
        artStyle: HOMOLOG_DRAFT.artStyle,
        includeCaption: HOMOLOG_DRAFT.includeCaption,
      },
    });
  }

  return {
    companyId: company.id,
    fakeCustomers: FAKE_HOMOLOG_CUSTOMERS.length,
    realContact: Boolean(secrets.testPhone),
  };
}

async function main() {
  assertHomologSeedAllowed(process.env);
  const secrets = readHomologSeedSecrets(process.env);
  const databaseUrl = process.env.DATABASE_URL as string;
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const result = await seedHomolog(prisma, secrets);
    console.log(
      `Seed de homologação concluído. empresa=${result.companyId} clientesFalsos=${result.fakeCustomers} contatoReal=${result.realContact ? maskPhone(secrets.testPhone ?? '') : 'não'}`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof HomologSeedRefusedError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const email = 'marina.e2e@lavperform.local';
  const passwordHash = await bcrypt.hash('Lavperform123!', 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { userCompanies: true },
  });
  if (existing) {
    const companyId = existing.userCompanies[0]?.companyId;
    if (companyId) {
      const brand = await prisma.brandIdentity.findUnique({ where: { companyId } });
      if (!brand) {
        await prisma.brandIdentity.create({
          data: {
            companyId,
            logoLightUrl: '/samples/bolha-azul-logo.svg',
          },
        });
      } else if (!brand.logoLightUrl) {
        await prisma.brandIdentity.update({
          where: { companyId },
          data: { logoLightUrl: '/samples/bolha-azul-logo.svg' },
        });
      }
    }
    console.log(`seed já existe: ${email}`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: 'Lavanderia Bolha Azul — Batel',
      cnpj: '45.678.901/0001-55',
      email: 'bolha@lavperform.local',
      phone: '41999990000',
      state: 'ACTIVE',
      slug: 'bolha-azul-e2e',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Marina',
      email,
      phone: '41988887777',
      password: passwordHash,
      userCompanies: { create: { companyId: company.id } },
    },
  });

  await prisma.brandIdentity.create({
    data: {
      companyId: company.id,
      logoLightUrl: '/samples/bolha-azul-logo.svg',
    },
  });

  console.log(`seed criado company=${company.id} email=${email}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

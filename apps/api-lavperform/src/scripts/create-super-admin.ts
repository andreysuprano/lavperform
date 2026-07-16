import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { AdminModule } from '../admin/admin.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Script para criar ou atualizar um AdminUser com role SUPER_ADMIN.
 * Idempotente: se o e-mail já existir, atualiza nome e senha.
 *
 * Uso interativo:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts
 *
 * Uso via variáveis de ambiente (CI / deploy):
 *   ADMIN_NAME="Andrey" ADMIN_EMAIL="andrey@foodcrm.com" ADMIN_PASSWORD="senha123" \
 *     npx ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts
 */

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function collectParams(): Promise<{ name: string; email: string; password: string }> {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (ADMIN_NAME && ADMIN_EMAIL && ADMIN_PASSWORD) {
    return { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const name = await ask(rl, 'Nome do Super Admin: ');
  const email = await ask(rl, 'E-mail: ');
  const password = await ask(rl, 'Senha: ');

  rl.close();

  if (!name || !email || !password) {
    console.error('\n❌ Nome, e-mail e senha são obrigatórios.');
    process.exit(1);
  }

  return { name, email, password };
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AdminModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);

  try {
    const { name, email, password } = await collectParams();

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await prisma.adminUser.upsert({
      where: { email },
      create: {
        name,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      update: {
        name,
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log('\n✅ Super Admin criado/atualizado com sucesso!');
    console.log(`   ID:    ${adminUser.id}`);
    console.log(`   Nome:  ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role:  ${adminUser.role}`);
  } catch (err) {
    console.error('\n❌ Erro ao criar Super Admin:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

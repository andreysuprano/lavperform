import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para importar uma lista de clientes (JSON) e criar suas vendas
 * simuladas alternando entre "Lavagem" e "Secagem" a R$14,50 cada.
 *
 * O número de vendas (Order) por cliente é igual ao campo
 * `Quantidade Compras` do JSON. Cada venda contém 1 item:
 *   - índice par  -> Lavagem  (R$ 14,50)
 *   - índice ímpar -> Secagem (R$ 14,50)
 *
 * Uso:
 *   npm run script:seed-laundry-from-json -- \
 *      --company-id=<uuid> \
 *      --input=./customers.json
 *
 * Args:
 *   --company-id=<uuid>   (obrigatório) Empresa-alvo
 *   --input=<path>        (obrigatório) Caminho para o arquivo JSON
 *   --dry-run             (opcional)    Não persiste no banco, apenas mostra o resumo
 *   --merchant-id=<num>   (opcional)    merchantId usado nos pedidos (default: 1)
 *   --spread-days=<num>   (opcional)    Janela em dias para espalhar as vendas (default: 180)
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não configurada. Defina antes de executar o script.',
  );
}

const SALE_UNIT_PRICE = 14.5;
const SERVICE_LAVAGEM = 'Lavagem';
const SERVICE_SECAGEM = 'Secagem';

interface RawCustomer {
  nome: string;
  data_nascimento: string;
  cpf: string;
  telefone: string;
  email: string;
  genero: string;
  'Quantidade Compras': number;
  'Valor Total das Compras': string;
}

interface CliArgs {
  companyId: string;
  inputPath: string;
  dryRun: boolean;
  merchantId: number;
  spreadDays: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const map: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [rawKey, ...rest] = arg.slice(2).split('=');
      const value = rest.length > 0 ? rest.join('=') : true;
      map[rawKey] = value;
    }
  }

  const companyId = map['company-id'] as string;
  const inputPath = map['input'] as string;
  const dryRun = Boolean(map['dry-run']);
  const merchantId = Number(map['merchant-id'] ?? 1);
  const spreadDays = Number(map['spread-days'] ?? 180);

  if (!companyId) {
    throw new Error('Argumento obrigatório ausente: --company-id=<uuid>');
  }
  if (!inputPath) {
    throw new Error('Argumento obrigatório ausente: --input=<path-do-json>');
  }
  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    throw new Error('--merchant-id deve ser um número positivo.');
  }
  if (!Number.isFinite(spreadDays) || spreadDays <= 0) {
    throw new Error('--spread-days deve ser um número positivo.');
  }

  return { companyId, inputPath, dryRun, merchantId, spreadDays };
}

function loadCustomers(inputPath: string): RawCustomer[] {
  const fullPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo de input não encontrado: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('O JSON de input deve ser um array de clientes.');
  }
  return parsed as RawCustomer[];
}

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

function normalizeCpf(cpf: string): string | null {
  const digits = (cpf || '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function normalizeEmail(email: string): string | null {
  const trimmed = (email || '').trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBirthDate(value: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  ) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function mapGender(genero: string): string | null {
  const g = (genero || '').trim().toLowerCase();
  if (g === 'masculino') return 'male';
  if (g === 'feminino') return 'female';
  return null;
}

function dec(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function buildOrderDates(count: number, spreadDays: number): Date[] {
  if (count <= 0) return [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const dates: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const offsetDays = Math.floor((spreadDays * i) / Math.max(1, count));
    const jitterMs = Math.floor(Math.random() * dayMs);
    const ts = now - offsetDays * dayMs - jitterMs;
    dates.push(new Date(ts));
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

interface ImportSummary {
  customersCreated: number;
  customersUpdated: number;
  ordersCreated: number;
  totalRevenue: number;
  skipped: Array<{ nome: string; reason: string }>;
}

async function nextDisplayId(
  prisma: PrismaClient,
  companyId: string,
): Promise<number> {
  const lastOrder = await prisma.order.findFirst({
    where: { companyId },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });
  return (lastOrder?.displayId ?? 0) + 1;
}

async function upsertCustomer(
  prisma: PrismaClient,
  companyId: string,
  raw: RawCustomer,
): Promise<{ id: string; created: boolean } | null> {
  const phone = normalizePhone(raw.telefone);
  if (!phone) return null;

  const existing = await prisma.customer.findFirst({
    where: { phone, companyId },
    select: { id: true },
  });

  const data = {
    name: raw.nome,
    phone,
    email: normalizeEmail(raw.email),
    cpf: normalizeCpf(raw.cpf),
    birthDate: parseBirthDate(raw.data_nascimento),
    gender: mapGender(raw.genero),
    companyId,
    whatsappOptin: true,
  } as const;

  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        birthDate: data.birthDate,
        gender: data.gender,
      },
    });
    return { id: existing.id, created: false };
  }

  const created = await prisma.customer.create({
    data: { ...data, id: randomUUID() },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

async function createOrdersForCustomer(
  prisma: PrismaClient,
  companyId: string,
  customerId: string,
  purchaseCount: number,
  merchantId: number,
  spreadDays: number,
  displayIdRef: { value: number },
): Promise<{ ordersCreated: number; revenue: number }> {
  if (purchaseCount <= 0) {
    return { ordersCreated: 0, revenue: 0 };
  }

  const dates = buildOrderDates(purchaseCount, spreadDays);
  let revenue = 0;

  // Usa SQL raw para evitar desalinhamento de colunas entre o schema do Prisma
  // e o banco de dados (ex.: colunas adicionadas em migrations ainda não aplicadas).
  for (let i = 0; i < purchaseCount; i += 1) {
    const isLavagem = i % 2 === 0;
    const serviceName = isLavagem ? SERVICE_LAVAGEM : SERVICE_SECAGEM;
    const orderDate = dates[i];
    const total = SALE_UNIT_PRICE;
    const displayId = displayIdRef.value;
    displayIdRef.value += 1;

    const orderId = randomUUID();
    const itemId = randomUUID();
    const paymentId = randomUUID();
    const totalStr = total.toFixed(2);
    const itemNumericId = isLavagem ? 1 : 2;
    const externalCode = isLavagem ? 'LAVAGEM' : 'SECAGEM';

    await prisma.$executeRaw`
      INSERT INTO "Order" (
        "id", "displayId", "merchantId", "status",
        "orderType", "orderTiming", "salesChannel", "customerOrigin",
        "observation",
        "deliveryFee", "serviceFee", "additionalFee", "total",
        "createdAt", "updatedAt", "companyId", "customerId"
      ) VALUES (
        ${orderId}, ${displayId}, ${merchantId}, 'closed',
        'pickup', 'immediate', 'STORE', 'JSON_IMPORT',
        ${`Importação JSON - ${serviceName}`},
        0, 0, 0, ${totalStr}::numeric,
        ${orderDate}, ${orderDate}, ${companyId}, ${customerId}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO "OrderItem" (
        "id", "orderId", "itemId", "externalCode", "name", "quantity",
        "unitPrice", "totalPrice", "kind", "status", "observation"
      ) VALUES (
        ${itemId}, ${orderId}, ${itemNumericId}, ${externalCode}, ${serviceName}, 1,
        ${totalStr}::numeric, ${totalStr}::numeric, 'product', 'closed', ${serviceName}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO "OrderPayment" (
        "id", "orderId", "total", "paymentType", "paymentMethod", "status", "paymentFee"
      ) VALUES (
        ${paymentId}, ${orderId}, ${totalStr}::numeric, 'card', 'credit', 'paid', 0
      )
    `;

    revenue += total;
  }

  return { ordersCreated: purchaseCount, revenue };
}

async function syncCustomerAggregates(
  prisma: PrismaClient,
  customerId: string,
): Promise<void> {
  const aggregate = await prisma.order.aggregate({
    where: { customerId },
    _count: { _all: true },
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const count = aggregate._count._all;
  if (count === 0) return;

  const totalSum = Number(aggregate._sum.total ?? 0);
  const averageTicket = count > 0 ? totalSum / count : 0;

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstOrderDate: aggregate._min.createdAt ?? undefined,
      lastOrderDate: aggregate._max.createdAt ?? undefined,
      averageTicket: Number(averageTicket.toFixed(2)),
    },
  });
}

async function run(): Promise<ImportSummary> {
  const args = parseArgs();
  const customers = loadCustomers(args.inputPath);

  console.log('🚀 Iniciando importação de clientes + vendas simuladas');
  console.log(`   Empresa     : ${args.companyId}`);
  console.log(`   Input       : ${args.inputPath}`);
  console.log(`   Total JSON  : ${customers.length} clientes`);
  console.log(`   Merchant ID : ${args.merchantId}`);
  console.log(`   Spread days : ${args.spreadDays}`);
  console.log(`   Dry-run     : ${args.dryRun ? 'sim' : 'não'}\n`);

  const summary: ImportSummary = {
    customersCreated: 0,
    customersUpdated: 0,
    ordersCreated: 0,
    totalRevenue: 0,
    skipped: [],
  };

  if (args.dryRun) {
    for (const c of customers) {
      const phone = normalizePhone(c.telefone);
      if (!phone) {
        summary.skipped.push({ nome: c.nome, reason: 'telefone inválido' });
        continue;
      }
      const purchases = Math.max(0, Number(c['Quantidade Compras'] ?? 0));
      summary.customersCreated += 1;
      summary.ordersCreated += purchases;
      summary.totalRevenue += purchases * SALE_UNIT_PRICE;
    }
    return summary;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const company = await prisma.company.findUnique({
      where: { id: args.companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      throw new Error(`Empresa ${args.companyId} não encontrada.`);
    }
    console.log(`✅ Empresa: ${company.name}\n`);

    const displayIdRef = {
      value: await nextDisplayId(prisma, args.companyId),
    };

    const startedAt = Date.now();

    for (let i = 0; i < customers.length; i += 1) {
      const raw = customers[i];
      try {
        const customer = await upsertCustomer(prisma, args.companyId, raw);
        if (!customer) {
          summary.skipped.push({
            nome: raw.nome,
            reason: 'telefone inválido ou ausente',
          });
          continue;
        }

        if (customer.created) summary.customersCreated += 1;
        else summary.customersUpdated += 1;

        const purchases = Math.max(0, Number(raw['Quantidade Compras'] ?? 0));
        const { ordersCreated, revenue } = await createOrdersForCustomer(
          prisma,
          args.companyId,
          customer.id,
          purchases,
          args.merchantId,
          args.spreadDays,
          displayIdRef,
        );

        summary.ordersCreated += ordersCreated;
        summary.totalRevenue += revenue;

        if (ordersCreated > 0) {
          await syncCustomerAggregates(prisma, customer.id);
        }

        if ((i + 1) % 25 === 0) {
          const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
          console.log(
            `   ⏱️  ${i + 1}/${customers.length} clientes | ${summary.ordersCreated} pedidos | ${elapsed}s`,
          );
        }
      } catch (error) {
        summary.skipped.push({
          nome: raw.nome,
          reason: (error as Error).message,
        });
        console.error(
          `   ❌ Falha em "${raw.nome}":`,
          (error as Error).message,
        );
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  return summary;
}

run()
  .then((summary) => {
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMO DA IMPORTAÇÃO');
    console.log('='.repeat(60));
    console.log(`Clientes criados    : ${summary.customersCreated}`);
    console.log(`Clientes atualizados: ${summary.customersUpdated}`);
    console.log(`Pedidos criados     : ${summary.ordersCreated}`);
    console.log(
      `Receita total (sim.): R$ ${summary.totalRevenue.toFixed(2).replace('.', ',')}`,
    );
    console.log(`Ignorados           : ${summary.skipped.length}`);
    if (summary.skipped.length > 0) {
      console.log('\nIgnorados:');
      for (const s of summary.skipped) {
        console.log(`   - ${s.nome}: ${s.reason}`);
      }
    }
    console.log('='.repeat(60));
    console.log('🎉 Concluído.');
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal ao executar script:');
    console.error(error);
    process.exit(1);
  });

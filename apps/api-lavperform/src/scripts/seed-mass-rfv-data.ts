import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
    ClientTypes,
    ALL_RFV_CLASSIFICATIONS,
} from '../common/utils/rfvClassification';
import { RFV_SEGMENTATION_MATRIX } from '../rfv-engine/infrastructure/strategies/segmentation-matrix';

/**
 * Script para gerar massa de dados de clientes com pedidos reais distribuídos
 * em todas as classificações RFV de uma empresa específica.
 *
 * Uso:
 *   npm run script:seed-mass-rfv -- --company-id=<uuid> --type=FOOD
 *   npm run script:seed-mass-rfv -- --company-id=<uuid> --type=LAUNDRY --count=1000 --clear
 *
 * Args:
 *   --company-id=<uuid>   (obrigatório) Empresa-alvo
 *   --type=FOOD|LAUNDRY   (obrigatório) Tipo do negócio
 *   --count=1000          (opcional)    Total de clientes a gerar (default 1000)
 *   --clear               (opcional)    Apaga clientes/pedidos anteriores da empresa
 */

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Defina antes de executar o script.');
}

type BusinessType = 'FOOD' | 'LAUNDRY';

interface CliArgs {
    companyId: string;
    type: BusinessType;
    count: number;
    clear: boolean;
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
    const type = String(map['type'] || '').toUpperCase() as BusinessType;
    const count = Number(map['count'] ?? 1000);
    const clear = Boolean(map['clear']);

    if (!companyId) {
        throw new Error('Argumento obrigatório ausente: --company-id=<uuid>');
    }
    if (type !== 'FOOD' && type !== 'LAUNDRY') {
        throw new Error('Argumento obrigatório inválido: --type=FOOD|LAUNDRY');
    }
    if (!Number.isFinite(count) || count <= 0) {
        throw new Error('Argumento --count deve ser um número positivo.');
    }

    return { companyId, type, count, clear };
}

const RECENCY_THRESHOLDS = [14, 30, 60, 90];
const FREQUENCY_THRESHOLDS = [4, 8, 15, 25];
const MONETARY_THRESHOLDS = [100, 300, 600, 1200];
const ANALYSIS_PERIOD_DAYS = 180;
const LAUNDRY_TICKET = 19.9;

const RECENCY_BANDS: Record<number, [number, number]> = {
    5: [0, RECENCY_THRESHOLDS[0]],
    4: [RECENCY_THRESHOLDS[0] + 1, RECENCY_THRESHOLDS[1]],
    3: [RECENCY_THRESHOLDS[1] + 1, RECENCY_THRESHOLDS[2]],
    2: [RECENCY_THRESHOLDS[2] + 1, RECENCY_THRESHOLDS[3]],
    1: [RECENCY_THRESHOLDS[3] + 1, ANALYSIS_PERIOD_DAYS - 1],
};

const FREQUENCY_BANDS: Record<number, [number, number]> = {
    1: [1, FREQUENCY_THRESHOLDS[0] - 1],
    2: [FREQUENCY_THRESHOLDS[0], FREQUENCY_THRESHOLDS[1] - 1],
    3: [FREQUENCY_THRESHOLDS[1], FREQUENCY_THRESHOLDS[2] - 1],
    4: [FREQUENCY_THRESHOLDS[2], FREQUENCY_THRESHOLDS[3] - 1],
    5: [FREQUENCY_THRESHOLDS[3], 100],
};

const MONETARY_BANDS: Record<number, [number, number]> = {
    1: [1, MONETARY_THRESHOLDS[0] - 0.01],
    2: [MONETARY_THRESHOLDS[0], MONETARY_THRESHOLDS[1] - 0.01],
    3: [MONETARY_THRESHOLDS[1], MONETARY_THRESHOLDS[2] - 0.01],
    4: [MONETARY_THRESHOLDS[2], MONETARY_THRESHOLDS[3] - 0.01],
    5: [MONETARY_THRESHOLDS[3], MONETARY_THRESHOLDS[3] * 4],
};

const SEGMENT_DISTRIBUTION: Record<ClientTypes, number> = {
    [ClientTypes.Campeao]: 0.06,
    [ClientTypes.Fiel]: 0.1,
    [ClientTypes.EmPotencial]: 0.11,
    [ClientTypes.Novo]: 0.13,
    [ClientTypes.Promissor]: 0.07,
    [ClientTypes.PrecisaDeAtencao]: 0.1,
    [ClientTypes.QuaseDormente]: 0.09,
    [ClientTypes.NaoPossoPerder]: 0.05,
    [ClientTypes.EmRisco]: 0.11,
    [ClientTypes.Hibernando]: 0.1,
    [ClientTypes.Perdido]: 0.08,
};

const FOOD_PRODUCTS = [
    { itemId: 1001, name: 'X-Burger Clássico' },
    { itemId: 1002, name: 'X-Salada Especial' },
    { itemId: 1003, name: 'X-Bacon Premium' },
    { itemId: 1004, name: 'X-Tudo da Casa' },
    { itemId: 1005, name: 'Burger Artesanal Cheddar' },
    { itemId: 1006, name: 'Smash Burger Duplo' },
];

const LAUNDRY_PRODUCTS = [
    { itemId: 2001, name: 'Lavagem Simples' },
    { itemId: 2002, name: 'Secagem Padrão' },
    { itemId: 2003, name: 'Lavagem Expressa' },
    { itemId: 2004, name: 'Secagem Premium' },
];

const FIRST_NAMES = [
    'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Fernando', 'Gabriela', 'Heitor',
    'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olívia', 'Pedro',
    'Quésia', 'Rafaela', 'Sofia', 'Thiago', 'Ursula', 'Vinicius', 'Wagner', 'Yasmin',
    'Zeca', 'Beatriz', 'Camila', 'Diego', 'Elaine', 'Felipe', 'Giovana', 'Hugo',
    'Iris', 'Júlia', 'Kaique', 'Letícia', 'Mateus', 'Natália', 'Otávio', 'Paula',
];

const LAST_NAMES = [
    'Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima', 'Costa', 'Ferreira',
    'Almeida', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Carvalho', 'Ribeiro',
    'Barbosa', 'Cardoso', 'Castro', 'Dias', 'Duarte', 'Fonseca', 'Freitas', 'Lopes',
    'Mendes', 'Moreira', 'Nascimento', 'Pinto', 'Ramos', 'Rocha', 'Sales', 'Teixeira',
    'Vieira',
];

const PAYMENT_METHODS = ['credit', 'debit', 'pix', 'cash'];
const PAYMENT_TYPES_BY_METHOD: Record<string, string> = {
    credit: 'card',
    debit: 'card',
    pix: 'online',
    cash: 'offline',
};

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function isLaundryFeasible(f: number, m: number): boolean {
    const fRange = FREQUENCY_BANDS[f];
    const mRange = MONETARY_BANDS[m];
    const minTotal = fRange[0] * LAUNDRY_TICKET;
    const maxTotal = fRange[1] * LAUNDRY_TICKET;
    return maxTotal >= mRange[0] && minTotal <= mRange[1];
}

function getValidCombosForSegment(
    segment: ClientTypes,
    type: BusinessType,
): Array<{ r: number; f: number; m: number }> {
    const all = Object.entries(RFV_SEGMENTATION_MATRIX)
        .filter(([, seg]) => seg === segment)
        .map(([key]) => ({
            r: Number(key[0]),
            f: Number(key[1]),
            m: Number(key[2]),
        }));

    if (type === 'LAUNDRY') {
        return all.filter((c) => isLaundryFeasible(c.f, c.m));
    }
    return all;
}

function buildSegmentPlan(totalCount: number): Array<{ segment: ClientTypes; count: number }> {
    const planned = ALL_RFV_CLASSIFICATIONS.map((segment) => ({
        segment,
        count: Math.round(totalCount * SEGMENT_DISTRIBUTION[segment]),
    }));

    let diff = totalCount - planned.reduce((acc, p) => acc + p.count, 0);
    let i = 0;
    while (diff !== 0) {
        const target = planned[i % planned.length];
        if (diff > 0) {
            target.count += 1;
            diff -= 1;
        } else if (target.count > 0) {
            target.count -= 1;
            diff += 1;
        }
        i += 1;
    }

    return planned.filter((p) => p.count > 0);
}

interface OrderPlan {
    orderCount: number;
    perOrderTickets: number[];
    totalSpent: number;
    daysAgoForEachOrder: number[];
}

function planOrdersForCombo(
    combo: { r: number; f: number; m: number },
    type: BusinessType,
): OrderPlan {
    const [fMin, fMax] = FREQUENCY_BANDS[combo.f];
    const [mMin, mMax] = MONETARY_BANDS[combo.m];

    let orderCount: number;
    let perOrderTickets: number[];

    if (type === 'LAUNDRY') {
        const cMinByM = Math.max(1, Math.ceil(mMin / LAUNDRY_TICKET));
        const cMaxByM = Math.floor(mMax / LAUNDRY_TICKET);
        const cMin = Math.max(fMin, cMinByM);
        const cMax = Math.min(fMax, cMaxByM);
        const safeMax = Math.max(cMin, cMax);
        orderCount = randomInt(cMin, safeMax);
        perOrderTickets = Array.from({ length: orderCount }, () => LAUNDRY_TICKET);
    } else {
        const tries: number[] = [];
        for (let cnt = fMin; cnt <= fMax; cnt += 1) {
            const minTotal = cnt * 45;
            const maxTotal = cnt * 70;
            if (maxTotal >= mMin && minTotal <= mMax) {
                tries.push(cnt);
            }
        }
        orderCount = tries.length > 0 ? pick(tries) : randomInt(fMin, fMax);

        const targetTotalMin = Math.max(mMin, orderCount * 45);
        const targetTotalMax = Math.min(mMax, orderCount * 70);
        const targetTotal =
            targetTotalMin <= targetTotalMax
                ? randomFloat(targetTotalMin, targetTotalMax)
                : randomFloat(orderCount * 45, orderCount * 70);

        const avgTicket = targetTotal / orderCount;
        perOrderTickets = Array.from({ length: orderCount }, () => {
            const jitter = randomFloat(-3, 3);
            const value = Math.min(85, Math.max(35, avgTicket + jitter));
            return Math.round(value * 100) / 100;
        });

        const sumNow = perOrderTickets.reduce((a, b) => a + b, 0);
        const adjust = (targetTotal - sumNow) / orderCount;
        perOrderTickets = perOrderTickets.map((t) =>
            Math.round(Math.min(85, Math.max(35, t + adjust)) * 100) / 100,
        );
    }

    const totalSpent = perOrderTickets.reduce((a, b) => a + b, 0);

    const [rMin, rMax] = RECENCY_BANDS[combo.r];
    const recencyDays = randomInt(rMin, rMax);

    const daysAgoForEachOrder: number[] = [recencyDays];
    for (let i = 1; i < orderCount; i += 1) {
        daysAgoForEachOrder.push(randomInt(recencyDays + 1, ANALYSIS_PERIOD_DAYS - 1));
    }
    daysAgoForEachOrder.sort((a, b) => a - b);

    return {
        orderCount,
        perOrderTickets,
        totalSpent: Math.round(totalSpent * 100) / 100,
        daysAgoForEachOrder,
    };
}

function calculateRecencyScore(daysSinceLastOrder: number): number {
    if (daysSinceLastOrder == null || daysSinceLastOrder < 0) return 1;
    const t = [...RECENCY_THRESHOLDS].sort((a, b) => a - b);
    if (daysSinceLastOrder <= t[0]) return 5;
    if (daysSinceLastOrder <= t[1]) return 4;
    if (daysSinceLastOrder <= t[2]) return 3;
    if (daysSinceLastOrder <= t[3]) return 2;
    return 1;
}

function calculateFrequencyScore(totalOrders: number): number {
    if (!totalOrders || totalOrders < 0) return 1;
    const t = [...FREQUENCY_THRESHOLDS].sort((a, b) => a - b);
    if (totalOrders >= t[3]) return 5;
    if (totalOrders >= t[2]) return 4;
    if (totalOrders >= t[1]) return 3;
    if (totalOrders >= t[0]) return 2;
    return 1;
}

function calculateMonetaryScore(totalSpent: number): number {
    if (!totalSpent || totalSpent < 0) return 1;
    const t = [...MONETARY_THRESHOLDS].sort((a, b) => a - b);
    if (totalSpent >= t[3]) return 5;
    if (totalSpent >= t[2]) return 4;
    if (totalSpent >= t[1]) return 3;
    if (totalSpent >= t[0]) return 2;
    return 1;
}

function generatePhone(seed: number): string {
    const block1 = String(9000 + (seed % 1000)).padStart(4, '0');
    const block2 = String(1000 + Math.floor(Math.random() * 9000));
    return `+55119${block1}${block2}`;
}

function generateName(): string {
    return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function generateBirthDate(): Date {
    const year = randomInt(1960, 2003);
    const month = randomInt(0, 11);
    const day = randomInt(1, 27);
    return new Date(Date.UTC(year, month, day));
}

function dec(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value.toFixed(2));
}

async function ensureRfvConfiguration(prisma: PrismaClient, companyId: string): Promise<void> {
    const existing = await prisma.rfvConfiguration.findUnique({ where: { companyId } });
    if (existing) return;

    await prisma.rfvConfiguration.create({
        data: {
            companyId,
            recencyPeriodDays: ANALYSIS_PERIOD_DAYS,
            frequencyPeriodDays: ANALYSIS_PERIOD_DAYS,
            monetaryPeriodDays: ANALYSIS_PERIOD_DAYS,
            recencyThresholds: RECENCY_THRESHOLDS,
            frequencyThresholds: FREQUENCY_THRESHOLDS,
            monetaryThresholds: MONETARY_THRESHOLDS,
            autoRecalculate: true,
            recalculateFrequency: 'daily',
        },
    });
}

async function clearCompanyData(prisma: PrismaClient, companyId: string): Promise<void> {
    console.log(`🧹 Limpando dados anteriores da empresa ${companyId}...`);

    const customers = await prisma.customer.findMany({
        where: { companyId },
        select: { id: true },
    });
    const customerIds = customers.map((c) => c.id);

    if (customerIds.length === 0) {
        console.log('   Nenhum cliente para remover.');
        return;
    }

    const orders = await prisma.order.findMany({
        where: { companyId, customerId: { in: customerIds } },
        select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    await prisma.messageOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerRfvHistory.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.message.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });

    console.log(`   Removidos: ${customerIds.length} clientes e ${orderIds.length} pedidos.`);
}

async function seedCustomerWithOrders(
    prisma: PrismaClient,
    companyId: string,
    type: BusinessType,
    targetSegment: ClientTypes,
    customerIndex: number,
    displayIdRef: { value: number },
): Promise<{ persistedSegment: string; ordersCreated: number }> {
    const candidates = getValidCombosForSegment(targetSegment, type);
    if (candidates.length === 0) {
        throw new Error(
            `Não há combinação RFV factível para o segmento "${targetSegment}" no tipo ${type}.`,
        );
    }
    const combo = pick(candidates);
    const plan = planOrdersForCombo(combo, type);

    const now = new Date();
    const orderDates = plan.daysAgoForEachOrder.map((daysAgo) => {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - daysAgo);
        date.setUTCHours(randomInt(8, 21), randomInt(0, 59), 0, 0);
        return date;
    });

    const sortedDates = [...orderDates].sort((a, b) => a.getTime() - b.getTime());
    const firstOrderDate = sortedDates[0];
    const lastOrderDate = sortedDates[sortedDates.length - 1];

    const totalOrders = plan.orderCount;
    const totalSpent = Math.round(plan.totalSpent * 100) / 100;
    const averageTicket = Math.round((totalSpent / totalOrders) * 100) / 100;

    const daysSinceLastOrder = Math.floor(
        (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const recencyScore = calculateRecencyScore(daysSinceLastOrder);
    const frequencyScore = calculateFrequencyScore(totalOrders);
    const monetaryScore = calculateMonetaryScore(totalSpent);
    const persistedSegment =
        RFV_SEGMENTATION_MATRIX[`${recencyScore}${frequencyScore}${monetaryScore}`] ||
        ClientTypes.Novo;

    const customerId = randomUUID();
    const phone = generatePhone(customerIndex);

    await prisma.customer.create({
        data: {
            id: customerId,
            name: generateName(),
            phone,
            email: `cliente.${customerIndex}.${Date.now()}@massa.test`,
            birthDate: generateBirthDate(),
            companyId,
            rfvClassification: persistedSegment,
            whatsappOptin: true,
            averageTicket,
            firstOrderDate,
            lastOrderDate,
        },
    });

    const productPool = type === 'FOOD' ? FOOD_PRODUCTS : LAUNDRY_PRODUCTS;
    const orderType = type === 'FOOD' ? 'DELIVERY' : 'PICKUP';
    const salesChannel = type === 'FOOD' ? 'WHATSAPP' : 'STORE';

    for (let i = 0; i < plan.orderCount; i += 1) {
        const ticket = plan.perOrderTickets[i];
        const orderDate = sortedDates[i];
        const product = pick(productPool);
        const paymentMethod = pick(PAYMENT_METHODS);
        const paymentType = PAYMENT_TYPES_BY_METHOD[paymentMethod];
        displayIdRef.value += 1;

        const orderId = randomUUID();
        const itemId = randomUUID();
        const paymentId = randomUUID();
        const ticketStr = ticket.toFixed(2);

        await prisma.$executeRaw`
            INSERT INTO "Order" (
                "id", "integratorOrderId", "displayId", "merchantId", "status",
                "orderType", "orderTiming", "salesChannel", "customerOrigin",
                "deliveryFee", "serviceFee", "additionalFee", "total",
                "createdAt", "updatedAt", "companyId", "customerId"
            ) VALUES (
                ${orderId}, ${displayIdRef.value}, ${displayIdRef.value}, 1, 'CONCLUDED',
                ${orderType}, 'IMMEDIATE', ${salesChannel}, 'MASS_SEED',
                0, 0, 0, ${ticketStr}::numeric,
                ${orderDate}, ${orderDate}, ${companyId}, ${customerId}
            )
        `;

        await prisma.$executeRaw`
            INSERT INTO "OrderItem" (
                "id", "orderId", "itemId", "externalCode", "name", "quantity",
                "unitPrice", "totalPrice", "kind", "status"
            ) VALUES (
                ${itemId}, ${orderId}, ${product.itemId}, ${`EXT-${product.itemId}`}, ${product.name}, 1,
                ${ticketStr}::numeric, ${ticketStr}::numeric, 'PRODUCT', 'CONCLUDED'
            )
        `;

        await prisma.$executeRaw`
            INSERT INTO "OrderPayment" (
                "id", "orderId", "total", "paymentType", "paymentMethod", "status", "paymentFee"
            ) VALUES (
                ${paymentId}, ${orderId}, ${ticketStr}::numeric, ${paymentType}, ${paymentMethod}, 'paid', 0
            )
        `;
    }

    await prisma.customerRfvHistory.create({
        data: {
            customerId,
            recencyScore,
            frequencyScore,
            monetaryScore,
            rfvSegment: persistedSegment,
            daysSinceLastOrder,
            totalOrders,
            totalSpent: dec(totalSpent),
            averageTicket: dec(averageTicket),
            analysisStartDate: new Date(now.getTime() - ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000),
            analysisEndDate: now,
        },
    });

    return { persistedSegment, ordersCreated: totalOrders };
}

async function main() {
    const args = parseArgs();

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('🚀 Iniciando geração de massa de dados RFV');
        console.log(`   Empresa : ${args.companyId}`);
        console.log(`   Tipo    : ${args.type}`);
        console.log(`   Volume  : ${args.count} clientes`);
        console.log(`   Limpar  : ${args.clear ? 'sim' : 'não'}\n`);

        const company = await prisma.company.findUnique({ where: { id: args.companyId } });
        if (!company) {
            throw new Error(`Empresa ${args.companyId} não encontrada.`);
        }
        console.log(`✅ Empresa encontrada: ${company.name}\n`);

        if (args.clear) {
            await clearCompanyData(prisma, args.companyId);
        }

        await ensureRfvConfiguration(prisma, args.companyId);

        const lastOrder = await prisma.order.findFirst({
            where: { companyId: args.companyId },
            orderBy: { displayId: 'desc' },
            select: { displayId: true },
        });
        const displayIdRef = { value: lastOrder?.displayId ?? 0 };

        const plan = buildSegmentPlan(args.count);

        console.log('📊 Distribuição planejada:');
        for (const item of plan) {
            console.log(`   ${item.segment.padEnd(22)} ${item.count}`);
        }
        console.log('');

        const segmentTallies: Record<string, number> = {};
        let totalOrdersCreated = 0;
        let customerIndex = 0;
        const startedAt = Date.now();

        for (const { segment, count } of plan) {
            console.log(`\n📦 Gerando ${count} clientes do segmento "${segment}"...`);
            for (let i = 0; i < count; i += 1) {
                customerIndex += 1;
                try {
                    const result = await seedCustomerWithOrders(
                        prisma,
                        args.companyId,
                        args.type,
                        segment,
                        customerIndex,
                        displayIdRef,
                    );
                    segmentTallies[result.persistedSegment] =
                        (segmentTallies[result.persistedSegment] ?? 0) + 1;
                    totalOrdersCreated += result.ordersCreated;

                    if (customerIndex % 50 === 0) {
                        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
                        console.log(
                            `   ⏱️  ${customerIndex}/${args.count} clientes | ${totalOrdersCreated} pedidos | ${elapsed}s`,
                        );
                    }
                } catch (error) {
                    console.error(
                        `   ❌ Falha ao gerar cliente #${customerIndex} (${segment}):`,
                        (error as Error).message,
                    );
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 RESUMO DA EXECUÇÃO');
        console.log('='.repeat(60));
        console.log(`Empresa             : ${company.name} (${args.companyId})`);
        console.log(`Tipo                : ${args.type}`);
        console.log(`Clientes criados    : ${customerIndex}`);
        console.log(`Pedidos criados     : ${totalOrdersCreated}`);
        console.log(`Tempo total         : ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
        console.log('\nClassificações finais (após cálculo RFV):');
        for (const segment of ALL_RFV_CLASSIFICATIONS) {
            const total = segmentTallies[segment] ?? 0;
            console.log(`   ${segment.padEnd(22)} ${total}`);
        }
        console.log('='.repeat(60));
        console.log('\n🎉 Geração concluída com sucesso!');
    } catch (error) {
        console.error('\n❌ Erro fatal ao executar script:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();

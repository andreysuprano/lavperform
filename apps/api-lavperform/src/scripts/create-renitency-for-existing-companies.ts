import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RenitencyService } from '../renitency/application/renitency.service';

/**
 * Script para criar configuração de renitência padrão (minDaysBetween = 4)
 * para todas as empresas existentes que ainda não possuem uma.
 *
 * Uso: npx ts-node -r tsconfig-paths/register src/scripts/create-renitency-for-existing-companies.ts
 */
async function bootstrap() {
    console.log('Iniciando script de configuração de renitência...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const prismaService = app.get(PrismaService);
    const renitencyService = app.get(RenitencyService);

    try {
        console.log('Buscando empresas no banco de dados...');
        const companies = await prismaService.company.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
        });

        console.log(`Encontradas ${companies.length} empresas\n`);

        if (companies.length === 0) {
            console.log('Nenhuma empresa encontrada no banco de dados');
            await app.close();
            return;
        }

        const MIN_DAYS_BETWEEN = 4;

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const company of companies) {
            try {
                const existing = await prismaService.renitencyConfiguration.findUnique({
                    where: { companyId: company.id },
                });

                if (existing) {
                    console.log(`[skip] ${company.name} - já possui configuração (minDaysBetween=${existing.minDaysBetween})`);
                    skipped++;
                    continue;
                }

                await prismaService.renitencyConfiguration.create({
                    data: {
                        companyId: company.id,
                        minDaysBetween: MIN_DAYS_BETWEEN,
                    },
                });

                console.log(`[ok]   ${company.name} - configuração criada (minDaysBetween=${MIN_DAYS_BETWEEN})`);
                created++;
            } catch (error) {
                console.error(`[erro] ${company.name}: ${(error as Error)?.message || error}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RESUMO DA EXECUÇÃO');
        console.log('='.repeat(60));
        console.log(`Total de empresas: ${companies.length}`);
        console.log(`Configurações criadas: ${created}`);
        console.log(`Já possuíam configuração: ${skipped}`);
        console.log(`Erros: ${errors}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\nErro fatal ao executar script:');
        console.error(error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap().catch((error) => {
    console.error('Erro ao inicializar script:', error);
    process.exit(1);
});

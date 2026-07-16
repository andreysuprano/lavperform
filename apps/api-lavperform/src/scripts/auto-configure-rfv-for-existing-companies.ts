import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RfvEngineService } from '../rfv-engine/application/rfv-engine.service';

/**
 * Script de backfill: enfileira a configuração automática da matriz RFV para
 * todas as empresas existentes.
 *
 * Necessário rodar uma vez após o deploy, pois a dimensão Monetária passou a
 * usar TICKET MÉDIO (antes usava o valor total gasto) e os thresholds antigos
 * ficam inválidos até serem recalibrados a partir dos dados reais.
 *
 * Cada job de auto-configuração recalibra os thresholds e, ao final, reenfileira
 * todos os customers da empresa para reclassificação.
 *
 * Uso: npm run script:auto-configure-rfv
 * Ou: npx ts-node -r tsconfig-paths/register src/scripts/auto-configure-rfv-for-existing-companies.ts
 */
async function bootstrap() {
    console.log('🚀 Iniciando backfill de configuração automática RFV...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const prismaService = app.get(PrismaService);
    const rfvEngineService = app.get(RfvEngineService);

    try {
        console.log('📊 Buscando empresas no banco de dados...');
        const companies = await prismaService.company.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });

        console.log(`✅ Encontradas ${companies.length} empresas\n`);

        if (companies.length === 0) {
            console.log('⚠️  Nenhuma empresa encontrada no banco de dados');
            await app.close();
            return;
        }

        let queued = 0;
        let errors = 0;

        for (const company of companies) {
            try {
                console.log(`📦 Enfileirando auto-config: ${company.name} (${company.id})`);
                await rfvEngineService.queueAutomaticConfiguration(company.id);
                queued++;
            } catch (error) {
                console.error(`   ❌ Erro ao enfileirar para ${company.name}:`);
                console.error(`      ${(error as Error)?.message || error}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 RESUMO DA EXECUÇÃO');
        console.log('='.repeat(60));
        console.log(`Total de empresas: ${companies.length}`);
        console.log(`✅ Auto-configurações enfileiradas: ${queued}`);
        console.log(`❌ Erros: ${errors}`);
        console.log('='.repeat(60));
        console.log('\n🎉 Backfill enfileirado. Acompanhe o processamento no Bull Board (/queues).');
    } catch (error) {
        console.error('\n❌ Erro fatal ao executar script:');
        console.error(error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap().catch((error) => {
    console.error('❌ Erro ao inicializar script:', error);
    process.exit(1);
});

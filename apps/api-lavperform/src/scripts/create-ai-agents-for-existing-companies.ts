import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AiAgentService } from '../ai-agent/application/ai-agent.service';

/**
 * Script para provisionar todas as empresas existentes no over-agent-api.
 * Empresas que já possuem overAgentCompanyId são ignoradas (idempotente).
 *
 * Uso: npx ts-node -r tsconfig-paths/register src/scripts/create-ai-agents-for-existing-companies.ts
 */
async function bootstrap() {
    console.log('Iniciando provisionamento de empresas no over-agent-api...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const prismaService = app.get(PrismaService);
    const aiAgentService = app.get(AiAgentService);

    try {
        console.log('Buscando empresas no banco de dados...');
        const companies = await prismaService.company.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, overAgentCompanyId: true },
        });

        console.log(`Encontradas ${companies.length} empresa(s)\n`);

        if (companies.length === 0) {
            console.log('Nenhuma empresa encontrada no banco de dados');
            await app.close();
            return;
        }

        let provisioned = 0;
        let skipped = 0;
        let errors = 0;

        for (const company of companies) {
            try {
                console.log(`Processando: ${company.name} (${company.id})`);

                if (company.overAgentCompanyId) {
                    console.log(`   Ja provisionada (overAgentCompanyId: ${company.overAgentCompanyId})`);
                    skipped++;
                    continue;
                }

                await aiAgentService.provisionCompany(company.id);
                console.log(`   Provisionada com sucesso!`);
                provisioned++;
            } catch (error) {
                console.error(`   Erro ao provisionar ${company.name}: ${error?.message || error}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RESUMO DA EXECUCAO');
        console.log('='.repeat(60));
        console.log(`Total de empresas:        ${companies.length}`);
        console.log(`Provisionadas com sucesso: ${provisioned}`);
        console.log(`Ja provisionadas (skip):   ${skipped}`);
        console.log(`Erros:                     ${errors}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('Erro fatal ao executar script:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap().catch((error) => {
    console.error('Erro ao inicializar script:', error);
    process.exit(1);
});

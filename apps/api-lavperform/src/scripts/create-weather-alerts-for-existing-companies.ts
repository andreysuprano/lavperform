import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherAlertService } from '../weather-alert/application/weather-alert.service';
import { WeatherCondition } from '../weather-alert/domain/weather-alert.entity';
import { IWeatherAlertRepository } from '../weather-alert/domain/weather-alert.repository.interface';

/**
 * Script para criar configuração de clima e tempo (WeatherAlert) para todas
 * as empresas existentes que ainda não possuem uma.
 *
 * Valores padrão: condição RAINING, todos os dias da semana, 1 alerta/dia, inativo.
 *
 * Uso: npm run script:create-weather-alerts
 * Ou: npx ts-node -r tsconfig-paths/register src/scripts/create-weather-alerts-for-existing-companies.ts
 */
async function bootstrap() {
    console.log('🚀 Iniciando script de configuração de clima e tempo...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const prismaService = app.get(PrismaService);
    const weatherAlertRepository = app.get<IWeatherAlertRepository>('IWeatherAlertRepository');
    const weatherAlertService = app.get(WeatherAlertService);

    try {
        console.log('📊 Buscando empresas no banco de dados...');
        const companies = await prismaService.company.findMany({
            orderBy: { name: 'asc' },
        });

        console.log(`✅ Encontradas ${companies.length} empresas\n`);

        if (companies.length === 0) {
            console.log('⚠️  Nenhuma empresa encontrada no banco de dados');
            await app.close();
            return;
        }

        const defaultConfig = {
            condition: WeatherCondition.RAINING,
            daysOfWeek: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
            dailyAlerts: 1,
            active: false,
        };

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const company of companies) {
            try {
                console.log(`\n📦 Processando: ${company.name} (${company.id})`);

                const existing = await weatherAlertRepository.findByCompanyId(company.id);

                if (existing) {
                    console.log(`   ⏭️  Já possui configuração de clima`);
                    skipped++;
                    continue;
                }

                console.log(`   🔨 Criando configuração padrão de clima...`);
                await weatherAlertService.createOrUpdate(company.id, defaultConfig);

                console.log(`   ✅ Configuração criada com sucesso!`);
                created++;
            } catch (error) {
                console.error(`   ❌ Erro ao processar ${company.name}:`);
                console.error(`      ${(error as Error)?.message || error}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 RESUMO DA EXECUÇÃO');
        console.log('='.repeat(60));
        console.log(`Total de empresas: ${companies.length}`);
        console.log(`✅ Configurações criadas: ${created}`);
        console.log(`⏭️  Já possuíam configuração: ${skipped}`);
        console.log(`❌ Erros: ${errors}`);
        console.log('='.repeat(60));

        if (created > 0) {
            console.log('\n🎉 Script concluído com sucesso!');
        } else if (skipped === companies.length) {
            console.log('\n✨ Todas as empresas já possuem configuração de clima!');
        } else {
            console.log('\n⚠️  Script concluído com avisos. Verifique os erros acima.');
        }
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

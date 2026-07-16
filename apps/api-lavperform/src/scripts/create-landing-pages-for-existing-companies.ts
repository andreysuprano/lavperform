import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { LandingPageService } from '../landing-page/application/landing-page.service';

/**
 * Script para criar landing pages para todas as empresas existentes
 * que ainda não possuem uma landing page
 * 
 * Uso: npx ts-node src/scripts/create-landing-pages-for-existing-companies.ts
 */
async function bootstrap() {
    console.log('🚀 Iniciando script de criação de landing pages...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const prismaService = app.get(PrismaService);
    const landingPageService = app.get(LandingPageService);

    try {
        // Buscar todas as empresas
        console.log('📊 Buscando empresas no banco de dados...');
        const companies = await prismaService.company.findMany({
            include: {
                address: true,
            },
        });

        console.log(`✅ Encontradas ${companies.length} empresas\n`);

        if (companies.length === 0) {
            console.log('⚠️  Nenhuma empresa encontrada no banco de dados');
            await app.close();
            return;
        }

        let created = 0;
        let skipped = 0;
        let errors = 0;

        // Processar cada empresa
        for (const company of companies) {
            try {
                console.log(`\n📦 Processando: ${company.name} (${company.id})`);

                // Verificar se já existe uma landing page para esta empresa
                const existingLandingPages = await prismaService.landingPage.findMany({
                    where: { companyId: company.id },
                });

                if (existingLandingPages.length > 0) {
                    console.log(`   ⏭️  Já possui landing page (${existingLandingPages.length})`);
                    skipped++;
                    continue;
                }

                // Verificar se a empresa tem slug
                if (!company.slug) {
                    console.log(`   ⚠️  Empresa sem slug, gerando slug a partir do nome...`);
                    const slug = company.name
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                        .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
                        .replace(/\s+/g, '-') // Substitui espaços por hífens
                        .replace(/-+/g, '-') // Remove hífens duplicados
                        .replace(/^-|-$/g, ''); // Remove hífens do início e fim

                    // Atualizar empresa com slug
                    await prismaService.company.update({
                        where: { id: company.id },
                        data: { slug },
                    });

                    console.log(`   ✏️  Slug gerado: ${slug}`);
                    company.slug = slug;
                }

                // Preparar dados da empresa
                const companyAddress = company.address?.street || company.address?.city || undefined;
                const companyPhone = company.phone || undefined;

                // Criar landing page
                console.log(`   🔨 Criando landing page...`);
                await landingPageService.createDefaultLandingPage(
                    company.id,
                    company.name,
                    company.slug,
                    companyAddress,
                    companyPhone
                );

                console.log(`   ✅ Landing page criada com sucesso!`);
                created++;

            } catch (error) {
                console.error(`   ❌ Erro ao processar ${company.name}:`);
                console.error(`      ${error.message}`);
                errors++;
            }
        }

        // Resumo
        console.log('\n' + '='.repeat(60));
        console.log('📈 RESUMO DA EXECUÇÃO');
        console.log('='.repeat(60));
        console.log(`Total de empresas: ${companies.length}`);
        console.log(`✅ Landing pages criadas: ${created}`);
        console.log(`⏭️  Landing pages já existentes: ${skipped}`);
        console.log(`❌ Erros: ${errors}`);
        console.log('='.repeat(60));

        if (created > 0) {
            console.log('\n🎉 Script concluído com sucesso!');
        } else if (skipped === companies.length) {
            console.log('\n✨ Todas as empresas já possuem landing pages!');
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

// Executar script
bootstrap().catch((error) => {
    console.error('❌ Erro ao inicializar script:', error);
    process.exit(1);
});

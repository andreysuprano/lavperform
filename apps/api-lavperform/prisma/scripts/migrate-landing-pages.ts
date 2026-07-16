import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set; please configure it in your .env before running the migration.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface OldLocationData {
  title: string;
  description: string;
  placeName: string;
  address: string;
  mapUrl: string;
  mapEmbedUrl: string;
  googleMapsLink: string;
}

interface NewLocationData {
  title: string;
  description: string;
  items: Array<{
    placeName: string;
    address: string;
    mapUrl: string;
    mapEmbedUrl: string;
    googleMapsLink: string;
  }>;
}

function isOldLocationFormat(location: any): location is OldLocationData {
  return (
    location &&
    typeof location === 'object' &&
    'placeName' in location &&
    'address' in location &&
    !('items' in location)
  );
}

function convertLocationToNewFormat(oldLocation: OldLocationData): NewLocationData {
  return {
    title: oldLocation.title,
    description: oldLocation.description,
    items: [
      {
        placeName: oldLocation.placeName,
        address: oldLocation.address,
        mapUrl: oldLocation.mapUrl,
        mapEmbedUrl: oldLocation.mapEmbedUrl,
        googleMapsLink: oldLocation.googleMapsLink,
      },
    ],
  };
}

async function migrateLandingPages() {
  console.log('🚀 Iniciando migração das landing pages...\n');

  try {
    // Buscar todas as landing pages
    const landingPages = await prisma.landingPage.findMany({
      select: {
        id: true,
        slug: true,
        location: true,
        template: true,
      },
    });

    console.log(`📊 Total de landing pages encontradas: ${landingPages.length}\n`);

    if (landingPages.length === 0) {
      console.log('✅ Nenhuma landing page para migrar.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const landingPage of landingPages) {
      try {
        const location = landingPage.location as any;
        const needsLocationMigration = isOldLocationFormat(location);
        const needsTemplateField = !landingPage.template;

        if (!needsLocationMigration && !needsTemplateField) {
          console.log(`⏭️  Landing page "${landingPage.slug}" já está no formato correto.`);
          skippedCount++;
          continue;
        }

        const updateData: any = {};

        // Migrar location se necessário
        if (needsLocationMigration) {
          console.log(`🔄 Migrando location de "${landingPage.slug}"...`);
          updateData.location = convertLocationToNewFormat(location);
        }

        // Adicionar template se necessário
        if (needsTemplateField) {
          console.log(`➕ Adicionando template "default" para "${landingPage.slug}"...`);
          updateData.template = 'default';
        }

        // Atualizar no banco
        await prisma.landingPage.update({
          where: { id: landingPage.id },
          data: updateData,
        });

        console.log(`✅ Landing page "${landingPage.slug}" atualizada com sucesso!\n`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Erro ao migrar landing page "${landingPage.slug}":`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Resumo da migração:');
    console.log(`   ✅ Atualizadas: ${updatedCount}`);
    console.log(`   ⏭️  Puladas (já no formato correto): ${skippedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📊 Total: ${landingPages.length}\n`);

    if (errorCount === 0) {
      console.log('🎉 Migração concluída com sucesso!');
    } else {
      console.log('⚠️  Migração concluída com alguns erros. Verifique os logs acima.');
    }
  } catch (error) {
    console.error('❌ Erro fatal durante a migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Executar migração
migrateLandingPages()
  .then(() => {
    console.log('\n✨ Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script finalizado com erro:', error);
    process.exit(1);
  });

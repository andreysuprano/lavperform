import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set; please configure it in your .env file.');
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
        companyId: true,
      },
    });

    console.log(`📊 Total de landing pages encontradas: ${landingPages.length}\n`);

    if (landingPages.length === 0) {
      console.log('✅ Nenhuma landing page encontrada. Nada para migrar.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const landingPage of landingPages) {
      try {
        const location = landingPage.location as any;

        // Verificar se a location está no formato antigo
        if (isOldLocationFormat(location)) {
          console.log(`🔄 Migrando landing page: ${landingPage.slug} (${landingPage.id})`);
          console.log(`   Formato antigo detectado:`, {
            placeName: location.placeName,
            address: location.address,
          });

          // Converter para o novo formato
          const newLocation = convertLocationToNewFormat(location);

          // Atualizar no banco
          await prisma.landingPage.update({
            where: { id: landingPage.id },
            data: {
              location: newLocation as any,
            },
          });

          console.log(`   ✅ Migrado com sucesso!`);
          console.log(`   Novo formato:`, {
            items: newLocation.items.length,
            firstItem: newLocation.items[0].placeName,
          });
          console.log('');

          migratedCount++;
        } else {
          console.log(`⏭️  Pulando landing page: ${landingPage.slug} (${landingPage.id})`);
          console.log(`   Já está no novo formato ou formato não reconhecido`);
          console.log('');
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar landing page ${landingPage.id}:`, error.message);
        console.log('');
        errorCount++;
      }
    }

    console.log('\n📈 Resumo da migração:');
    console.log(`   ✅ Migradas com sucesso: ${migratedCount}`);
    console.log(`   ⏭️  Puladas (já no novo formato): ${skippedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📊 Total processadas: ${landingPages.length}`);

    if (migratedCount > 0) {
      console.log('\n✨ Migração concluída com sucesso!');
    } else {
      console.log('\n✅ Todas as landing pages já estavam no formato correto!');
    }
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Executar a migração
migrateLandingPages()
  .then(() => {
    console.log('\n👋 Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script finalizado com erro:', error);
    process.exit(1);
  });

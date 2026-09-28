import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AutomaticCampaignStatus } from '@prisma/client';
import { AudiencesModule } from '../audiences/audiences.module';
import { AutomaticCampaignBatchService } from '../automatic-campaign/application/automatic-campaign-batch.service';
import { AutomaticCampaignBatchModule } from '../automatic-campaign/automatic-campaign-batch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AudiencesModule,
    AutomaticCampaignBatchModule,
  ],
})
class SnapshotAutomaticCampaignBatchesModule {}

async function bootstrap() {
  console.log('Congelando a leva das campanhas automáticas abertas...\n');

  const app = await NestFactory.createApplicationContext(
    SnapshotAutomaticCampaignBatchesModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const prisma = app.get(PrismaService);
    const batch = app.get(AutomaticCampaignBatchService);

    const campaigns = await prisma.automaticCampaign.findMany({
      where: {
        deletedAt: null,
        status: { not: AutomaticCampaignStatus.COMPLETED },
        batchSnapshottedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        targetingMode: true,
        segmentation: true,
        audienceId: true,
        customSendListId: true,
        channel: true,
        status: true,
        name: true,
      },
    });

    let ok = 0;
    let failed = 0;
    for (const campaign of campaigns) {
      try {
        const customerIds = await batch.resolveContactableIds(campaign);
        await batch.commitBatch(campaign, customerIds);
        ok += 1;
        console.log(
          `${campaign.id}  leva ${customerIds.length}  ${campaign.name}`,
        );
      } catch (error) {
        failed += 1;
        console.error(`${campaign.id}  falhou  ${campaign.name}`, error);
      }
    }
    console.log(`Congeladas: ${ok}. Falhas: ${failed}.`);
    if (failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

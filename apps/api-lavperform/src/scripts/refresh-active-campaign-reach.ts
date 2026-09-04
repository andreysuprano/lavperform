import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AudiencesModule } from '../audiences/audiences.module';
import { CampaignCustomerResolverService } from '../audiences/application/campaign-customer-resolver.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AudiencesModule,
  ],
})
class RefreshActiveCampaignReachModule {}

async function bootstrap() {
  console.log('Recalculando alcance das campanhas automáticas ativas...\n');

  const app = await NestFactory.createApplicationContext(
    RefreshActiveCampaignReachModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const prisma = app.get(PrismaService);
    const resolver = app.get(CampaignCustomerResolverService);

    const campaigns = await prisma.automaticCampaign.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        companyId: true,
        targetingMode: true,
        segmentation: true,
        audienceId: true,
        customSendListId: true,
        channel: true,
        campaignMetric: {
          select: { totalCustomers: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Campanhas ativas: ${campaigns.length}\n`);

    let updated = 0;

    for (const campaign of campaigns) {
      const previous = campaign.campaignMetric[0]?.totalCustomers ?? 0;
      const totalCustomers = await resolver.countEligibleCustomers({
        companyId: campaign.companyId,
        targetingMode: campaign.targetingMode,
        segmentation: campaign.segmentation,
        audienceId: campaign.audienceId,
        customSendListId: campaign.customSendListId,
        channel: campaign.channel,
        eligibility: 'contactable',
      });

      await prisma.campaignMetric.updateMany({
        where: { automaticCampaignId: campaign.id },
        data: { totalCustomers },
      });

      updated += 1;
      console.log(
        `${campaign.id}  ${previous} -> ${totalCustomers}  ${campaign.name.trim()}`,
      );
    }

    console.log(`\nAtualizadas: ${updated}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

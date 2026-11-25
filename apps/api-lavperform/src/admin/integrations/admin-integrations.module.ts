import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CiccloModule } from '../../integrations/cicclo/cicclo.module';
import { WindelModule } from '../../integrations/windel/windel.module';
import { WaymoneyModule } from '../../integrations/waymoney/waymoney.module';
import { SwlModule } from '../../integrations/swl/swl.module';
import { ImportHistoryModule } from '../../integrations/import-history.module';
import { L2AutomateModule } from '../../integrations/l2automate/l2automate.module';
import { MaxlavModule } from '../../integrations/maxlav/maxlav.module';
import { AgidezModule } from '../../integrations/agidez/agidez.module';
import { HybexEssenceModule } from '../../integrations/hybex-essence/hybex-essence.module';
import { VmLavModule } from '../../integrations/vmlav/vmlav.module';
import { PartnersModule } from '../../partners/partners.module';
import { SessionRefreshModule } from '../../integrations/session-refresh/session-refresh.module';
import { PartnerFeedModule } from '../../integrations/partner-feed/partner-feed.module';
import { AdminCompanyIntegrationsController } from './admin-company-integrations.controller';
import { AdminIntegrationsController } from './admin-integrations.controller';
import { AdminIntegrationsService } from './admin-integrations.service';

@Module({
  imports: [
    PrismaModule,
    PartnersModule,
    SessionRefreshModule,
    PartnerFeedModule,
    ImportHistoryModule,
    VmLavModule,
    CiccloModule,
    WindelModule,
    WaymoneyModule,
    SwlModule,
    L2AutomateModule,
    MaxlavModule,
    AgidezModule,
    HybexEssenceModule,
  ],
  controllers: [AdminIntegrationsController, AdminCompanyIntegrationsController],
  providers: [AdminIntegrationsService],
})
export class AdminIntegrationsModule {}

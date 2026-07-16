import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CiccloModule } from '../../integrations/cicclo/cicclo.module';
import { ImportHistoryModule } from '../../integrations/import-history.module';
import { L2AutomateModule } from '../../integrations/l2automate/l2automate.module';
import { MaxlavModule } from '../../integrations/maxlav/maxlav.module';
import { VmLavModule } from '../../integrations/vmlav/vmlav.module';
import { PartnersModule } from '../../partners/partners.module';
import { AdminCompanyIntegrationsController } from './admin-company-integrations.controller';
import { AdminIntegrationsController } from './admin-integrations.controller';
import { AdminIntegrationsService } from './admin-integrations.service';

@Module({
  imports: [
    PrismaModule,
    PartnersModule,
    ImportHistoryModule,
    VmLavModule,
    CiccloModule,
    L2AutomateModule,
    MaxlavModule,
  ],
  controllers: [AdminIntegrationsController, AdminCompanyIntegrationsController],
  providers: [AdminIntegrationsService],
})
export class AdminIntegrationsModule {}

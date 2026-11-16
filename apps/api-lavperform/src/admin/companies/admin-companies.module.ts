import { Module } from '@nestjs/common';
import { CompaniesModule } from '../../companies/companies.module';
import { CouponsModule } from '../../coupons/coupons.module';
import { CustomersModule } from '../../customers/customers.module';
import { RfvEngineModule } from '../../rfv-engine/rfv-engine.module';
import { AdminCompaniesController } from './admin-companies.controller';
import { AdminCompaniesExportService } from './admin-companies-export.service';
import { AdminCompanyCustomerBaseService } from './admin-company-customer-base.service';

@Module({
  imports: [CompaniesModule, CouponsModule, CustomersModule, RfvEngineModule],
  controllers: [AdminCompaniesController],
  providers: [AdminCompaniesExportService, AdminCompanyCustomerBaseService],
})
export class AdminCompaniesModule {}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientTypes } from '../common/utils/rfvClassification';
import { ICustomerRepository } from '../customers/domain/customer.repository.interface';
import { IDashboardRepository } from './domain/dashboard.repository.interface';
import {
  DateRangeFilterDto,
  resolveDateRange,
} from '../common/dto/date-range-filter.dto';

export type DailyMetrics = {
  day: string;
  messages: number;
  clicks: number;
  sales: number;
};

@Injectable()
export class DashboardService {
  private readonly logger: Logger;

  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepository: ICustomerRepository,
    @Inject('IDashboardRepository')
    private readonly dashboardRepository: IDashboardRepository,
  ) {
    this.logger = new Logger(DashboardService.name);
  }

  async getCustomersSummary(companyId: string) {
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      newCustomers,
      achievableCustomers,
      unattainableCustomers,
      leads,
    ] = await Promise.all([
      this.customerRepository.countByCompany(companyId),
      this.customerRepository.countByCompanyAndRfv(companyId, [
        ClientTypes.Novo,
        ClientTypes.Campeao,
        ClientTypes.Fiel,
        ClientTypes.Promissor,
      ]),
      this.customerRepository.countByCompanyAndRfv(companyId, [
        ClientTypes.QuaseDormente,
        ClientTypes.NaoPossoPerder,
        ClientTypes.EmRisco,
        ClientTypes.Hibernando,
        ClientTypes.PrecisaDeAtencao,
        ClientTypes.Perdido,
      ]),
      this.customerRepository.countByCompanyAndRfv(companyId, [ClientTypes.Novo]),
      this.customerRepository.countByCompanyAndWhatsappVerified(companyId, true),
      this.customerRepository.countByCompanyAndWhatsappVerified(companyId, false),
      this.customerRepository.countLeadsByCompany(companyId),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      newCustomers,
      achievableCustomers,
      unattainableCustomers,
      leads,
    };
  }

  async getCampaignsSummary(companyId: string, filter: DateRangeFilterDto) {
    const range = resolveDateRange(filter);

    const summary = await this.dashboardRepository.getCampaignsSummary(companyId, range);
    const dailyMetrics = await this.dashboardRepository.getDailyMessageMetrics(companyId, range);

    return {
      activeCampaigns: summary,
      messagesSentByDate: dailyMetrics,
    }
  }
}

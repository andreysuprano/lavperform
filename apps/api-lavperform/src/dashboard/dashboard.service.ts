import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ALL_RFV_CLASSIFICATIONS,
  ClientLabels,
  ClientTypes,
  getIconBySegmentation,
  LEAD_ICON,
  LEAD_LABEL,
  LEAD_SEGMENTATION,
} from '../common/utils/rfvClassification';
import { ICustomerRepository } from '../customers/domain/customer.repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { IDashboardRepository } from './domain/dashboard.repository.interface';
import {
  DateRangeFilterDto,
  resolveDateRange,
} from '../common/dto/date-range-filter.dto';

const RETENTION_SEGMENTS = [
  ClientTypes.EmRisco,
  ClientTypes.PrecisaDeAtencao,
  ClientTypes.NaoPossoPerder,
  ClientTypes.QuaseDormente,
];

const RECONQUEST_SEGMENTS = [
  ClientTypes.Hibernando,
  ClientTypes.Perdido,
];

const LOYALTY_SEGMENTS = [ClientTypes.Campeao, ClientTypes.Fiel];

const NURTURE_SEGMENTS = [
  ClientTypes.Novo,
  ClientTypes.Promissor,
  ClientTypes.EmPotencial,
];

function pct(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function nextDaysMmDd(days: number): string[] {
  const result: string[] = [];
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + i);
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    result.push(`${mm}${dd}`);
  }
  return result;
}

@Injectable()
export class DashboardService {
  private readonly logger: Logger;

  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepository: ICustomerRepository,
    @Inject('IDashboardRepository')
    private readonly dashboardRepository: IDashboardRepository,
    private readonly prisma: PrismaService,
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

  async getCustomersInsights(companyId: string) {
    const [
      summary,
      rawCounts,
      retentionCount,
      reconquestCount,
      loyaltyCount,
      nurtureCount,
      avgTicketAgg,
      bestOrderDayRows,
      upcomingBirthdays,
      withEmail,
      withBirthDate,
      withPhone,
      withWhatsappOptin,
    ] = await Promise.all([
      this.getCustomersSummary(companyId),
      this.customerRepository.totalCustomersBySegmentation(companyId),
      this.customerRepository.countByCompanyAndRfv(companyId, RETENTION_SEGMENTS),
      this.customerRepository.countByCompanyAndRfv(companyId, RECONQUEST_SEGMENTS),
      this.customerRepository.countByCompanyAndRfv(companyId, LOYALTY_SEGMENTS),
      this.customerRepository.countByCompanyAndRfv(companyId, NURTURE_SEGMENTS),
      this.prisma.customer.aggregate({
        where: {
          companyId,
          averageTicket: { gt: 0 },
        },
        _avg: { averageTicket: true },
      }),
      this.prisma.customer.groupBy({
        by: ['bestOrderDay'],
        where: {
          companyId,
          bestOrderDay: { not: null },
        },
        _count: { _all: true },
      }),
      this.countUpcomingBirthdays(companyId, 30),
      this.prisma.customer.count({
        where: {
          companyId,
          email: { not: null },
          NOT: { email: '' },
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId,
          birthDate: { not: null },
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId,
          phone: { not: null },
          NOT: { phone: '' },
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId,
          whatsappOptin: true,
        },
      }),
    ]);

    const countBySegment = new Map<string, number>();
    for (const row of rawCounts as Array<{ rfvClassification: string; _count: { _all: number } }>) {
      countBySegment.set(row.rfvClassification, row._count._all);
    }

    const segments = [
      ...ALL_RFV_CLASSIFICATIONS.map((segmentation) => ({
        segmentation,
        count: countBySegment.get(segmentation) ?? 0,
        label: ClientLabels[segmentation],
        icon: getIconBySegmentation(segmentation) || '',
      })),
      {
        segmentation: LEAD_SEGMENTATION,
        count: summary.leads,
        label: LEAD_LABEL,
        icon: LEAD_ICON,
      },
    ];

    const topOrderDays = bestOrderDayRows
      .filter((row) => row.bestOrderDay)
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 3)
      .map((row) => ({
        day: row.bestOrderDay as string,
        count: row._count._all,
      }));

    const total = summary.totalCustomers;
    const reachableTotal =
      summary.achievableCustomers + summary.unattainableCustomers;

    return {
      summary,
      segments,
      opportunities: {
        retention: retentionCount,
        reconquest: reconquestCount,
        loyalty: loyaltyCount,
        nurture: nurtureCount,
        leads: summary.leads,
        upcomingBirthdays,
      },
      campaignReadiness: {
        withEmail,
        withBirthDate,
        withPhone,
        withWhatsappOptin,
        withEmailRate: pct(withEmail, total),
        withBirthDateRate: pct(withBirthDate, total),
        withPhoneRate: pct(withPhone, total),
        withWhatsappOptinRate: pct(withWhatsappOptin, total),
      },
      health: {
        activeRate: pct(summary.activeCustomers, total),
        inactiveRate: pct(summary.inactiveCustomers, total),
        reachabilityRate: pct(summary.achievableCustomers, reachableTotal),
        retentionRate: pct(retentionCount, total),
        reconquestRate: pct(reconquestCount, total),
        loyaltyRate: pct(loyaltyCount, total),
      },
      patterns: {
        averageTicket: Number(avgTicketAgg._avg.averageTicket ?? 0),
        topOrderDays,
      },
    };
  }

  private async countUpcomingBirthdays(
    companyId: string,
    days: number,
  ): Promise<number> {
    const mmddList = nextDaysMmDd(days);
    if (mmddList.length === 0) return 0;

    const placeholders = mmddList.map((_, i) => `$${i + 2}`).join(', ');
    const rows = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count
       FROM "Customer"
       WHERE "companyId" = $1
         AND "birthDate" IS NOT NULL
         AND to_char("birthDate", 'MMDD') IN (${placeholders})`,
      companyId,
      ...mmddList,
    );

    return rows[0]?.count ?? 0;
  }

  async getCampaignsSummary(companyId: string, filter: DateRangeFilterDto) {
    const range = resolveDateRange(filter);

    const [summary, dailyMetrics, topCampaigns] = await Promise.all([
      this.dashboardRepository.getCampaignsSummary(companyId, range),
      this.dashboardRepository.getDailyMessageMetrics(companyId, range),
      this.dashboardRepository.getTopCampaigns(companyId, range, 5),
    ]);

    return {
      activeCampaigns: summary,
      messagesSentByDate: dailyMetrics,
      topCampaigns,
    };
  }
}

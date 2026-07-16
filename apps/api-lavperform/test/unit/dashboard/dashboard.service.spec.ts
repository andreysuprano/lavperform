import { DashboardService } from 'src/dashboard/dashboard.service';
import { DateFilter } from 'src/common/utils/dateFilter';
import { BadRequestException } from '@nestjs/common';

describe('DashboardService', () => {
  const customerRepository = {
    countByCompany: jest.fn(),
    countByCompanyAndRfv: jest.fn(),
    countByCompanyAndWhatsappVerified: jest.fn(),
    countLeadsByCompany: jest.fn(),
  };

  const dashboardRepository = {
    getCampaignsSummary: jest.fn(),
    getDailyMessageMetrics: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(customerRepository as any, dashboardRepository as any);
  });

  it('returns customers summary', async () => {
    customerRepository.countByCompany.mockResolvedValue(10);
    customerRepository.countByCompanyAndRfv
      .mockResolvedValueOnce(6)  // active
      .mockResolvedValueOnce(4)  // inactive
      .mockResolvedValueOnce(2); // new
    customerRepository.countByCompanyAndWhatsappVerified
      .mockResolvedValueOnce(7)  // achievable
      .mockResolvedValueOnce(3); // unattainable
    customerRepository.countLeadsByCompany.mockResolvedValue(5);

    const summary = await service.getCustomersSummary('comp1');
    expect(summary).toEqual({
      totalCustomers: 10,
      activeCustomers: 6,
      inactiveCustomers: 4,
      newCustomers: 2,
      achievableCustomers: 7,
      unattainableCustomers: 3,
      leads: 5,
    });
    expect(customerRepository.countByCompany).toHaveBeenCalledWith('comp1');
    expect(customerRepository.countByCompanyAndRfv).toHaveBeenCalledTimes(3);
    expect(customerRepository.countByCompanyAndWhatsappVerified).toHaveBeenCalledWith('comp1', true);
    expect(customerRepository.countByCompanyAndWhatsappVerified).toHaveBeenCalledWith('comp1', false);
    expect(customerRepository.countLeadsByCompany).toHaveBeenCalledWith('comp1');
  });

  it('returns campaigns summary using dateFilter fallback', async () => {
    dashboardRepository.getCampaignsSummary.mockResolvedValue({
      messagesSent: 5,
      conversionRate: 0.375,
      salesTotalQuantity: 4,
      salesTotalAmount: 40,
      totalCustomers: 0,
    });
    dashboardRepository.getDailyMessageMetrics.mockResolvedValue([
      { day: '01 jan', messages: 2, clicks: 1, sales: 0 },
      { day: '02 jan', messages: 3, clicks: 2, sales: 1 },
    ]);

    const result = await service.getCampaignsSummary('comp1', {
      dateFilter: DateFilter.LAST_7_DAYS,
    });

    expect(dashboardRepository.getCampaignsSummary).toHaveBeenCalledWith(
      'comp1',
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );
    expect(dashboardRepository.getDailyMessageMetrics).toHaveBeenCalledWith(
      'comp1',
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );

    const [, rangeArg] = dashboardRepository.getCampaignsSummary.mock.calls[0];
    const diffMs = rangeArg.endDate.getTime() - rangeArg.startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(DateFilter.LAST_7_DAYS - 1);

    expect(result.activeCampaigns.messagesSent).toBe(5);
    expect(result.messagesSentByDate).toHaveLength(2);
  });

  it('uses custom startDate/endDate range when provided', async () => {
    dashboardRepository.getCampaignsSummary.mockResolvedValue({});
    dashboardRepository.getDailyMessageMetrics.mockResolvedValue([]);

    await service.getCampaignsSummary('comp1', {
      startDate: '2024-01-01',
      endDate: '2024-01-10',
    });

    const [, rangeArg] = dashboardRepository.getCampaignsSummary.mock.calls[0];
    expect(rangeArg.startDate.toISOString()).toBe('2024-01-01T03:00:00.000Z');
    expect(rangeArg.endDate.toISOString()).toBe('2024-01-11T02:59:59.999Z');
    expect(rangeArg.timeZone).toBe('America/Sao_Paulo');
  });

  it('throws BadRequest when only one of startDate/endDate is provided', async () => {
    await expect(
      service.getCampaignsSummary('comp1', { startDate: '2024-01-01' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when endDate is before startDate', async () => {
    await expect(
      service.getCampaignsSummary('comp1', {
        startDate: '2024-01-10',
        endDate: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

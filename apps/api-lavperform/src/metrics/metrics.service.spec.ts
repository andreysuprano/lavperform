import { MetricsService } from './metrics.service';
import { IMetricsUnitOfWork } from './domain/metrics-unit-of-work.interface';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockMetricsUnitOfWork: jest.Mocked<IMetricsUnitOfWork>;

  beforeEach(() => {
    mockMetricsUnitOfWork = {
      recordMessageClick: jest.fn(),
    };
    service = new MetricsService(mockMetricsUnitOfWork);
  });

  it('increments interactions when a campaign id exists', async () => {
    mockMetricsUnitOfWork.recordMessageClick.mockResolvedValue({
      redirectUrl: 'https://menu.example.com',
    });

    const result = await service.setMessageClick('token-123');

    expect(mockMetricsUnitOfWork.recordMessageClick).toHaveBeenCalledWith('token-123');
    expect(result.redirectUrl).toBe('https://menu.example.com');
  });

  it('does not update interactions when no campaign ids are present', async () => {
    mockMetricsUnitOfWork.recordMessageClick.mockResolvedValue({
      redirectUrl: 'https://www.google.com',
    });

    const result = await service.setMessageClick('token-456');

    expect(mockMetricsUnitOfWork.recordMessageClick).toHaveBeenCalledWith('token-456');
    expect(result.redirectUrl).toBe('https://www.google.com');
  });
});

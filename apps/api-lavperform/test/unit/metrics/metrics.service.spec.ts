import { MetricsService } from 'src/metrics/metrics.service';
import { IMetricsUnitOfWork } from 'src/metrics/domain/metrics-unit-of-work.interface';

describe('MetricsService', () => {
  const mockMetricsUnitOfWork: jest.Mocked<IMetricsUnitOfWork> = {
    recordMessageClick: jest.fn(),
  };

  let service: MetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetricsService(mockMetricsUnitOfWork);
  });

  it('delegates to Unit of Work and returns redirect URL', async () => {
    mockMetricsUnitOfWork.recordMessageClick.mockResolvedValue({
      redirectUrl: 'https://menu.example.com',
    });

    const result = await service.setMessageClick('test-token');

    expect(mockMetricsUnitOfWork.recordMessageClick).toHaveBeenCalledWith('test-token');
    expect(result.redirectUrl).toBe('https://menu.example.com');
  });

  it('returns Google fallback when Unit of Work returns fallback', async () => {
    mockMetricsUnitOfWork.recordMessageClick.mockResolvedValue({
      redirectUrl: 'https://www.google.com',
    });

    const result = await service.setMessageClick('invalid-token');

    expect(mockMetricsUnitOfWork.recordMessageClick).toHaveBeenCalledWith('invalid-token');
    expect(result.redirectUrl).toBe('https://www.google.com');
  });
});

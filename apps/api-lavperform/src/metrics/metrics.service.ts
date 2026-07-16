import { Injectable, Inject } from '@nestjs/common';
import { IMetricsUnitOfWork } from './domain/metrics-unit-of-work.interface';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('IMetricsUnitOfWork')
    private readonly metricsUnitOfWork: IMetricsUnitOfWork,
  ) {}

  async setMessageClick(token: string) {
    return await this.metricsUnitOfWork.recordMessageClick(token);
  }
} 

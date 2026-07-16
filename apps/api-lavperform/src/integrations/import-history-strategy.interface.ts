import { DigitalMenuIntegration } from '../partners/domain/digital-menu-integration.entity';
import { ImportOrderHistoryDto } from '../companies/application/dto/import-order-history.dto';

export interface ImportHistoryResult {
  message: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  jobsCreated: number;
}

export interface IImportHistoryStrategy {
  execute(
    companyId: string,
    integration: DigitalMenuIntegration,
    dto: ImportOrderHistoryDto,
  ): Promise<ImportHistoryResult>;
}

import { IRepository } from '../../common/database/repository.interface';
import { ConversionWindow } from './conversion-window.entity';

export interface IConversionWindowRepository extends IRepository<ConversionWindow> {
    findByCompanyId(companyId: string): Promise<ConversionWindow[]>;
    findByCompanyAndClassification(
        companyId: string,
        rfvClassification: string,
    ): Promise<ConversionWindow | null>;
    upsertThreshold(
        companyId: string,
        rfvClassification: string,
        thresholdDays: number,
    ): Promise<ConversionWindow>;
}

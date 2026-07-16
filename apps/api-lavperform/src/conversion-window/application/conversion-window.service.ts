import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IConversionWindowRepository } from '../domain/conversion-window.repository.interface';
import { ConversionWindow } from '../domain/conversion-window.entity';
import { UpdateConversionWindowDto } from './dto/update-conversion-window.dto';
import { snakeToCamelCase } from '../../common/utils/case.utils';
import {
    ALL_RFV_CLASSIFICATIONS,
    ClientTypes,
    DEFAULT_CONVERSION_WINDOW_DAYS,
} from '../../common/utils/rfvClassification';
import { ConversionWindowSegmentDto, ConversionWindowThresholdMap } from './conversion-window.types';

@Injectable()
export class ConversionWindowService {
    constructor(
        @Inject('IConversionWindowRepository')
        private readonly conversionWindowRepository: IConversionWindowRepository,
    ) {}

    /**
     * Garante um registro por classificação RFV (padrão 7 dias) e retorna mapa segmento → dias (chaves em camelCase).
     */
    async getOrCreateForCompany(companyId: string): Promise<ConversionWindowThresholdMap> {
        const rows = await this.ensureAllSegmentsForCompany(companyId);
        return this.rowsToThresholdMap(rows);
    }

    /**
     * Retorna o limiar de um segmento (garante linhas default antes).
     */
    async getByCompanyAndClassification(
        companyId: string,
        rfvClassification: string,
    ): Promise<ConversionWindowSegmentDto> {
        if (!ALL_RFV_CLASSIFICATIONS.includes(rfvClassification as ClientTypes)) {
            throw new BadRequestException(`Classificação RFV inválida: ${rfvClassification}`);
        }

        await this.ensureAllSegmentsForCompany(companyId);
        const row = await this.conversionWindowRepository.findByCompanyAndClassification(
            companyId,
            rfvClassification,
        );
        if (!row) {
            throw new NotFoundException(
                `Janela de conversão não encontrada para a classificação ${rfvClassification}`,
            );
        }
        return {
            rfvClassification: row.rfvClassification,
            thresholdDays: row.thresholdDays,
        };
    }

    /**
     * Atualiza (ou cria) os limiares informados; garante demais classificações com default.
     */
    async upsertForCompany(
        companyId: string,
        dto: UpdateConversionWindowDto,
    ): Promise<ConversionWindowThresholdMap> {
        for (const item of dto.items) {
            await this.conversionWindowRepository.upsertThreshold(
                companyId,
                item.rfvClassification,
                item.thresholdDays,
            );
        }
        return this.getOrCreateForCompany(companyId);
    }

    private async ensureAllSegmentsForCompany(companyId: string): Promise<ConversionWindow[]> {
        const existing = await this.conversionWindowRepository.findByCompanyId(companyId);
        const present = new Set(existing.map((r) => r.rfvClassification));

        for (const rfvClassification of ALL_RFV_CLASSIFICATIONS) {
            if (!present.has(rfvClassification)) {
                await this.conversionWindowRepository.create({
                    companyId,
                    rfvClassification,
                    thresholdDays: DEFAULT_CONVERSION_WINDOW_DAYS,
                });
            }
        }

        return this.conversionWindowRepository.findByCompanyId(companyId);
    }

    private rowsToThresholdMap(rows: ConversionWindow[]): ConversionWindowThresholdMap {
        const byClass = new Map(rows.map((r) => [r.rfvClassification, r.thresholdDays]));
        const map: ConversionWindowThresholdMap = {};
        for (const c of ALL_RFV_CLASSIFICATIONS) {
            map[snakeToCamelCase(c)] = byClass.get(c) ?? DEFAULT_CONVERSION_WINDOW_DAYS;
        }
        return map;
    }
}

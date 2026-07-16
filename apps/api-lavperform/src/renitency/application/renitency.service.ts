import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRenitencyConfigurationRepository } from '../domain/renitency-configuration.repository.interface';
import { UpdateRenitencyConfigurationDto } from './dto/update-renitency-configuration.dto';
import { RenitencyConfiguration } from '../domain/renitency-configuration.entity';

@Injectable()
export class RenitencyService {
    constructor(
        @Inject('IRenitencyConfigurationRepository')
        private readonly repository: IRenitencyConfigurationRepository,
    ) {}

    async getOrCreateConfiguration(companyId: string): Promise<RenitencyConfiguration> {
        let config = await this.repository.findByCompanyId(companyId);
        if (!config) {
            config = await this.createDefaultConfiguration(companyId);
        }
        return config;
    }

    async updateConfiguration(companyId: string, dto: UpdateRenitencyConfigurationDto): Promise<RenitencyConfiguration> {
        const config = await this.repository.findByCompanyId(companyId);
        if (!config) {
            throw new NotFoundException('Configuração de renitência não encontrada para esta empresa');
        }
        return await this.repository.update(config.id, dto);
    }

    async createDefaultConfiguration(companyId: string): Promise<RenitencyConfiguration> {
        return await this.repository.create({
            companyId,
            minDaysBetween: 3,
        });
    }
}

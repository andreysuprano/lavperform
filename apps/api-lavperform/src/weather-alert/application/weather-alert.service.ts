import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CreateWeatherAlertDto, UpdateWeatherAlertDto, ToggleWeatherAlertDto } from './dto/weather-alert.dto';
import { IWeatherAlertRepository } from '../domain/weather-alert.repository.interface';
import { WeatherAlert } from '../domain/weather-alert.entity';
import { DEFAULT_WEATHER_ALERT_CONFIG } from '../domain/weather-alert.defaults';
import { WeatherDataService } from './weather-data.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeatherAlertService {
    private readonly logger: Logger;

    constructor(
        @Inject('IWeatherAlertRepository')
        private readonly weatherAlertRepository: IWeatherAlertRepository,
        private readonly weatherDataService: WeatherDataService,
        private readonly prisma: PrismaService,
    ) {
        this.logger = new Logger(WeatherAlertService.name);
    }

    private async findOrCreateByCompanyId(
        companyId: string,
        options?: { active?: boolean },
    ): Promise<WeatherAlert> {
        const existingAlert = await this.weatherAlertRepository.findByCompanyId(companyId);

        if (existingAlert) {
            return existingAlert;
        }

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company) {
            throw new NotFoundException('Empresa não encontrada');
        }

        this.logger.log(`Criando configuração padrão de alerta de clima para empresa: ${companyId}`);

        return this.weatherAlertRepository.create({
            companyId,
            ...DEFAULT_WEATHER_ALERT_CONFIG,
            daysOfWeek: [...DEFAULT_WEATHER_ALERT_CONFIG.daysOfWeek],
            active: options?.active ?? DEFAULT_WEATHER_ALERT_CONFIG.active,
        });
    }

    /**
     * Cria ou atualiza uma configuração de alerta de clima para uma empresa
     * Se já existir uma configuração, ela será atualizada
     * Se não existir, uma nova será criada
     */
    async createOrUpdate(companyId: string, createWeatherAlertDto: CreateWeatherAlertDto) {
        this.logger.log(`Criando/atualizando alerta de clima para empresa: ${companyId}`);

        try {
            // Verificar se já existe um alerta para esta empresa
            const existingAlert = await this.weatherAlertRepository.findByCompanyId(companyId);

            if (existingAlert) {
                // Atualizar alerta existente
                this.logger.log(`Alerta já existe, atualizando: ${existingAlert.id}`);
                const updated = await this.weatherAlertRepository.update(existingAlert.id, {
                    ...createWeatherAlertDto,
                });
                this.logger.log(`Alerta atualizado com sucesso: ${updated.id}`);
                return updated;
            }

            // Criar novo alerta
            const weatherAlert = await this.weatherAlertRepository.create({
                companyId,
                ...createWeatherAlertDto,
                active: createWeatherAlertDto.active ?? true,
            });

            this.logger.log(`Alerta criado com sucesso: ${weatherAlert.id}`);
            return weatherAlert;
        } catch (error) {
            this.logger.error(`Erro ao criar/atualizar alerta de clima: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findByCompanyId(companyId: string) {
        this.logger.log(`Buscando alerta de clima da empresa: ${companyId}`);
        return this.findOrCreateByCompanyId(companyId);
    }

    async toggleActive(companyId: string, toggleDto: ToggleWeatherAlertDto) {
        this.logger.log(`Alterando status do alerta de clima para empresa: ${companyId}`);

        const weatherAlert = await this.findOrCreateByCompanyId(companyId, {
            active: toggleDto.active,
        });

        if (weatherAlert.active === toggleDto.active) {
            this.logger.log(`Status do alerta já está como: ${toggleDto.active ? 'ativo' : 'inativo'}`);
            return weatherAlert;
        }

        const updated = await this.weatherAlertRepository.update(weatherAlert.id, {
            active: toggleDto.active,
        });

        this.logger.log(`Status do alerta alterado para: ${toggleDto.active ? 'ativo' : 'inativo'}`);
        return updated;
    }

    async delete(companyId: string) {
        this.logger.log(`Deletando alerta de clima da empresa: ${companyId}`);

        const weatherAlert = await this.weatherAlertRepository.findByCompanyId(companyId);
        
        if (!weatherAlert) {
            throw new NotFoundException('Configuração de alerta de clima não encontrada para esta empresa');
        }

        await this.weatherAlertRepository.delete(weatherAlert.id);

        return {
            message: 'Configuração de alerta de clima deletada com sucesso',
        };
    }

    /**
     * Método auxiliar para buscar todos os alertas ativos
     * Útil para processos em background que verificam a previsão do tempo
     */
    async findAllActive() {
        this.logger.log('Buscando todos os alertas ativos');
        return this.weatherAlertRepository.findAll({ where: { active: true } });
    }

    /**
     * Busca dados meteorológicos da cidade da empresa
     * Útil para verificar se deve enviar alertas
     */
    async getWeatherForCompany(companyId: string) {
        this.logger.log(`Buscando dados meteorológicos para empresa: ${companyId}`);

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: { address: true },
        });

        if (!company?.address?.city) {
            throw new NotFoundException('Empresa não possui cidade cadastrada no endereço');
        }

        const weatherData = await this.weatherDataService.getWeatherByCityName(company.address.city);

        if (!weatherData) {
            throw new NotFoundException(`Dados meteorológicos não encontrados para a cidade: ${company.address.city}`);
        }

        return weatherData;
    }
}

import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { UpdateLandingPageDto } from './dto/landing-page.dto';
import { ILandingPageRepository } from '../domain/landing-page.repository.interface';
import { ICompanyRepository } from '../../companies/domain/company.repository.interface';
import { generateDefaultLandingPageData } from './default-landing-page.template';

@Injectable()
export class LandingPageService {
    private readonly logger: Logger;

    constructor(
        @Inject('ILandingPageRepository')
        private readonly landingPageRepository: ILandingPageRepository,
        @Inject('ICompanyRepository')
        private readonly companyRepository: ICompanyRepository,
    ) {
        this.logger = new Logger(LandingPageService.name);
    }

    /**
     * Cria uma landing page default para uma nova empresa
     * Este método deve ser chamado automaticamente quando uma nova empresa é criada
     */
    async createDefaultLandingPage(
        companyId: string,
        companyName: string,
        companySlug: string,
        companyAddress?: string,
        companyPhone?: string
    ) {
        this.logger.log(`Criando landing page default para empresa: ${companyName} (${companyId})`);

        try {
            // Verificar se já existe uma landing page para esta empresa
            const existingLandingPages = await this.landingPageRepository.findByCompanyId(companyId);
            if (existingLandingPages && existingLandingPages.length > 0) {
                this.logger.warn(`Landing page já existe para a empresa ${companyId}`);
                return existingLandingPages[0];
            }

            // Gerar dados default
            const defaultData = generateDefaultLandingPageData(
                companyName,
                companySlug,
                companyAddress,
                companyPhone
            );

            // Criar landing page
            const landingPage = await this.landingPageRepository.create({
                companyId,
                ...defaultData,
            });

            this.logger.log(`Landing page default criada com sucesso: ${landingPage.id}`);
            return landingPage;
        } catch (error) {
            this.logger.error(`Erro ao criar landing page default: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findAll(companyId?: string) {
        this.logger.log('Listando landing pages');

        if (companyId) {
            return this.landingPageRepository.findByCompanyId(companyId);
        }

        return this.landingPageRepository.findAll();
    }

    async findOne(id: string) {
        this.logger.log(`Buscando landing page por ID: ${id}`);

        const landingPage = await this.landingPageRepository.findById(id);
        if (!landingPage) {
            throw new NotFoundException('Landing page não encontrada');
        }

        return landingPage;
    }

    async findBySlug(slug: string, onlyActive = false) {
        this.logger.log(`Buscando landing page por slug: ${slug}`);

        const landingPage = onlyActive
            ? await this.landingPageRepository.findActiveBySlug(slug)
            : await this.landingPageRepository.findBySlug(slug);

        if (!landingPage) {
            throw new NotFoundException('Landing page não encontrada');
        }

        return landingPage;
    }

    async findByCustomDomain(customDomain: string, onlyActive = false) {
        this.logger.log(`Buscando landing page por domínio customizado: ${customDomain}`);

        const landingPage = onlyActive
            ? await this.landingPageRepository.findActiveByCustomDomain(customDomain)
            : await this.landingPageRepository.findByCustomDomain(customDomain);

        if (!landingPage) {
            throw new NotFoundException('Landing page não encontrada');
        }

        return landingPage;
    }

    async findByCompanyId(companyId: string) {
        this.logger.log(`Buscando landing pages da empresa: ${companyId}`);

        const landingPages = await this.landingPageRepository.findByCompanyId(companyId);
        
        if (!landingPages || landingPages.length === 0) {
            throw new NotFoundException('Nenhuma landing page encontrada para esta empresa');
        }

        // Retorna a primeira (única) landing page da empresa
        return landingPages[0];
    }

    async updateByCompanyId(companyId: string, updateLandingPageDto: UpdateLandingPageDto) {
        this.logger.log(`Atualizando landing page da empresa: ${companyId}`);

        // Buscar landing page da empresa
        const landingPages = await this.landingPageRepository.findByCompanyId(companyId);
        
        // Se não existe landing page, cria uma nova
        if (!landingPages || landingPages.length === 0) {
            this.logger.log(`Landing page não encontrada para empresa ${companyId}, criando nova...`);
            
            // Buscar dados da empresa para criar landing page com informações corretas
            const company = await this.companyRepository.findById(companyId);
            
            if (!company) {
                throw new NotFoundException('Empresa não encontrada');
            }

            // Gerar dados default
            const defaultData = generateDefaultLandingPageData(
                company.name,
                company.slug || "",
                company.address?.street || undefined,
                company.phone || undefined
            );

            // Merge dos dados default com os dados recebidos
            const createData: any = {
                companyId,
                slug: defaultData.slug,
                customDomain: updateLandingPageDto.customDomain || defaultData.customDomain,
                active: updateLandingPageDto.active !== undefined ? updateLandingPageDto.active : defaultData.active,
                template: updateLandingPageDto.template || defaultData.template,
                branding: updateLandingPageDto.branding || defaultData.branding,
                hero: updateLandingPageDto.hero || defaultData.hero,
                services: updateLandingPageDto.services || defaultData.services,
                location: updateLandingPageDto.location || defaultData.location,
                faq: updateLandingPageDto.faq || defaultData.faq,
                testimonials: updateLandingPageDto.testimonials || defaultData.testimonials,
                cta: updateLandingPageDto.cta || defaultData.cta,
                footer: updateLandingPageDto.footer || defaultData.footer,
                navigation: updateLandingPageDto.navigation || defaultData.navigation,
            };

            // Criar landing page
            const newLandingPage = await this.landingPageRepository.create(createData);
            
            this.logger.log(`Landing page criada com sucesso: ${newLandingPage.id}`);
            return newLandingPage;
        }

        // Se existe, atualiza normalmente
        const landingPage = landingPages[0]; // Pega a primeira (única) landing page da empresa

        // Merge dos dados existentes com os novos (atualização parcial)
        const updatedData: any = {};

        // Atualizar campo active se fornecido
        if (updateLandingPageDto.active !== undefined) {
            updatedData.active = updateLandingPageDto.active;
        }

        // Atualizar customDomain se fornecido
        if (updateLandingPageDto.customDomain !== undefined) {
            updatedData.customDomain = updateLandingPageDto.customDomain;
        }

        // Atualizar template se fornecido
        if (updateLandingPageDto.template !== undefined) {
            updatedData.template = updateLandingPageDto.template;
        }

        // Atualizar seções individualmente se fornecidas
        if (updateLandingPageDto.branding) {
            updatedData.branding = { ...landingPage.branding, ...updateLandingPageDto.branding };
        }
        if (updateLandingPageDto.hero) {
            updatedData.hero = { ...landingPage.hero, ...updateLandingPageDto.hero };
        }
        if (updateLandingPageDto.services) {
            updatedData.services = { ...landingPage.services, ...updateLandingPageDto.services };
        }
        if (updateLandingPageDto.location) {
            updatedData.location = { ...landingPage.location, ...updateLandingPageDto.location };
        }
        if (updateLandingPageDto.faq) {
            updatedData.faq = { ...landingPage.faq, ...updateLandingPageDto.faq };
        }
        if (updateLandingPageDto.testimonials) {
            updatedData.testimonials = { ...landingPage.testimonials, ...updateLandingPageDto.testimonials };
        }
        if (updateLandingPageDto.cta) {
            updatedData.cta = { ...landingPage.cta, ...updateLandingPageDto.cta };
        }
        if (updateLandingPageDto.footer) {
            updatedData.footer = { ...landingPage.footer, ...updateLandingPageDto.footer };
        }
        if (updateLandingPageDto.navigation) {
            updatedData.navigation = updateLandingPageDto.navigation;
        }

        const updated = await this.landingPageRepository.update(landingPage.id, updatedData);

        this.logger.log(`Landing page atualizada com sucesso: ${landingPage.id}`);
        return updated;
    }

    async deleteByCompanyId(companyId: string) {
        this.logger.log(`Deletando landing page da empresa: ${companyId}`);

        // Buscar landing page da empresa
        const landingPages = await this.landingPageRepository.findByCompanyId(companyId);
        
        if (!landingPages || landingPages.length === 0) {
            throw new NotFoundException('Landing page não encontrada para esta empresa');
        }

        const landingPage = landingPages[0]; // Pega a primeira (única) landing page da empresa

        await this.landingPageRepository.delete(landingPage.id);

        return {
            message: 'Landing page deletada com sucesso',
        };
    }
}

import { Controller, Post, Body, Param, Patch, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { OnboardingDto } from '../users/application/dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';
import { CreateBusinessPartnerDto, CreateDigitalMenuIntegrationDto, CreatePartnerDto } from './dto/digital-menu-integration';
import { OnboardingWithPaymentDto } from './dto/onboarding-with-payment.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) { }

  @Post()
  @ApiOperation({ summary: 'Criar empresa e usuário administrador' })
  @ApiResponse({ status: 201, description: 'Empresa e usuário criados com sucesso' })
  create(@Body() onboardingDto: OnboardingDto) {
    return this.onboardingService.create(onboardingDto);
  }

  @Post('with-payment')
  @ApiOperation({ summary: 'Criar empresa com assinatura mensal e pagamento via cartão' })
  @ApiBody({ type: OnboardingWithPaymentDto })
  @ApiResponse({ status: 201, description: 'Empresa criada com pagamento processado' })
  createWithPayment(@Body() onboardingDto: OnboardingWithPaymentDto, @Req() request: Request) {
    const remoteIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket.remoteAddress ||
      '127.0.0.1';

    return this.onboardingService.createWithPayment(onboardingDto, remoteIp);
  }

  @Get('subscription-plan')
  @ApiOperation({ summary: 'Obter plano padrão de assinatura mensal' })
  @ApiResponse({ status: 200, description: 'Plano de assinatura obtido com sucesso' })
  getSubscriptionPlan() {
    return this.onboardingService.getSubscriptionPlan();
  }

  @Post('digital-menu-integration/:companyId')
  @ApiOperation({ summary: 'Criar integração com o digital menu' })
  @ApiResponse({ status: 201, description: 'Integração com o digital menu criada com sucesso' })
  createDigitalMenuIntegration(@Param('companyId') companyId: string, @Body() digitalMenuIntegrationDto: CreateDigitalMenuIntegrationDto) {
    return this.onboardingService.createDigitalMenuIntegration(companyId, digitalMenuIntegrationDto);
  }

  @Get('digital-menu-integration/:companyId')
  @ApiOperation({ summary: 'Obter integração com o digital menu' })
  @ApiResponse({ status: 200, description: 'Integração com o digital menu obtida com sucesso' })
  getDigitalMenuIntegration(@Param('companyId') companyId: string) {
    return this.onboardingService.getDigitalMenuIntegration(companyId);
  }

  @Post('partner')
  @ApiOperation({ summary: 'Criar parceiro' })
  @ApiResponse({ status: 201, description: 'Parceiro criado com sucesso' })
  createPartner(@Body() partnerDto: CreatePartnerDto) {
    return this.onboardingService.createPartner(partnerDto);
  }

  @Get('partner/:companyId')
  @ApiOperation({ summary: 'Obter parceiros' })
  @ApiResponse({ status: 200, description: 'Parceiros obtidos com sucesso' })
  getPartners(@Param('companyId') companyId: string) {
    return this.onboardingService.getPartners(companyId);
  }

  @Get('business-partner/:id')
  @ApiOperation({ summary: 'Obter business partner' })
  @ApiResponse({ status: 200, description: 'Business partner obtido com sucesso' })
  getBusinessPartnerById(@Param('id') id: string) {
    return this.onboardingService.getBusinessPartnerById(id);
  }

  @Get('business-partner')
  @ApiOperation({ summary: 'Obter business partners' })
  @ApiResponse({ status: 200, description: 'Business partners obtidos com sucesso' })
  getBusinessPartners() {
    return this.onboardingService.getBusinessPartners();
  }

  @Post('business-partner')
  @ApiOperation({ summary: 'Criar parceiro' })
  @ApiResponse({ status: 201, description: 'Parceiro criado com sucesso' })
  createBusinessPartner(@Body() businessPartnerDto: CreateBusinessPartnerDto) {
    return this.onboardingService.createBusinessPartner(businessPartnerDto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Obter plans' })
  @ApiResponse({ status: 200, description: 'Plans obtidos com sucesso' })
  getPlans() {
    return this.onboardingService.getPlans();
  }

  @Patch('business-partner/:id')
  @ApiOperation({ summary: 'Atualizar business partner' })
  @ApiResponse({ status: 200, description: 'Business partner atualizado com sucesso' })
  updateBusinessPartner(@Param('id') id: string, @Body() businessPartnerDto: CreateBusinessPartnerDto) {
    return this.onboardingService.updateBusinessPartner(id, businessPartnerDto);
  }
} 
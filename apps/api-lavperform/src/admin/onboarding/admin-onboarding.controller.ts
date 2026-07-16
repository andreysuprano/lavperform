import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { OnboardingDto } from '../../users/application/dto/onboarding.dto';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';

@ApiTags('Admin Onboarding')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/onboarding')
export class AdminOnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @ApiOperation({ summary: 'Criar empresa e usuário usando o fluxo completo de onboarding no admin' })
  @ApiResponse({ status: 201, description: 'Empresa e usuário criados com sucesso' })
  create(@Body() onboardingDto: OnboardingDto) {
    return this.onboardingService.create(onboardingDto);
  }
}

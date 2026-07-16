import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../common/decorators/user.decorator';
import { ApplicationService } from './application.service';

@ApiTags('Application')
@Controller('application')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('preload')
  @ApiOperation({ summary: 'Carregar todas as informações necessárias para o carregamento da aplicação' })
  @ApiResponse({ status: 200, description: 'Dados carregadas com sucesso' })
  preloadApplicationData(@User() userId: string) {
    return this.applicationService.getUserCompanies(userId);
  }

  @Get("/debug-sentry")
  getError() {
    return this.applicationService.getMessage();
  }
} 
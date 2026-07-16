import { Controller, Post, Param} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('interaction/:token')
  @ApiOperation({ summary: 'Registra um evento de interação em uma mensagem e campanha.' })
  @ApiResponse({ status: 201, description: 'Empresa e usuário criados com sucesso' })
  @ApiParam({ name: 'token', description: 'Token da mensagem' })

  setMessageClick(@Param('token') token: string) {
    return this.metricsService.setMessageClick(token);
  }
} 
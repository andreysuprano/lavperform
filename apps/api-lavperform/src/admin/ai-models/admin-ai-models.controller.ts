import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiModelSettingsService } from '../../integrations/openrouter/ai-model-settings.service';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminJwtPayload } from '../auth/interfaces/admin-jwt-payload.interface';
import { UpdateAiModelsDto } from './dto/update-ai-models.dto';

@ApiTags('Admin AI Models')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/ai-models')
export class AdminAiModelsController {
  constructor(private readonly settings: AiModelSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar modelos da OpenRouter e a escolha atual',
  })
  get() {
    return this.settings.getView();
  }

  @Put()
  @ApiOperation({
    summary: 'Salvar os modelos de texto e imagem da geração de posts',
  })
  save(@Body() dto: UpdateAiModelsDto, @Req() req: { user: AdminJwtPayload }) {
    return this.settings.save(dto, req.user.adminUserId);
  }
}

import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminSuperAdminGuard } from '../auth/guards/admin-super-admin.guard';
import { AdminOverviewService } from './admin-overview.service';
import { AdminOverviewResponseDto } from './dto/admin-overview-response.dto';

@ApiTags('Admin Overview')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly overviewService: AdminOverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas globais da plataforma (cache Redis 2h)' })
  getOverview(): Promise<AdminOverviewResponseDto> {
    return this.overviewService.getOverview();
  }

  @Post('refresh')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({
    summary: 'Invalidar cache e recalcular métricas (super admin)',
  })
  refreshOverview(): Promise<AdminOverviewResponseDto> {
    return this.overviewService.refreshOverview();
  }
}

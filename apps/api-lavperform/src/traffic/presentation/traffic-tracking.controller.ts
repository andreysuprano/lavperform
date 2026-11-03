import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyGtmContainerService } from '../application/company-gtm-container.service';
import { CompanyMetaPixelService } from '../application/company-meta-pixel.service';
import { UpsertTrackingCodeDto } from '../application/dto/upsert-tracking-code.dto';
import { TrafficReadGuard } from './traffic-read.guard';

@ApiTags('Traffic')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TrafficReadGuard)
@Controller('companies/:companyId/traffic')
export class TrafficTrackingController {
  constructor(
    private readonly pixelService: CompanyMetaPixelService,
    private readonly gtmService: CompanyGtmContainerService,
  ) {}

  @Get('pixel')
  getPixel(@Param('companyId') companyId: string) {
    return this.pixelService.get(companyId);
  }

  @Put('pixel')
  savePixel(@Param('companyId') companyId: string, @Body() body: UpsertTrackingCodeDto) {
    return this.pixelService.save(companyId, body);
  }

  @Delete('pixel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePixel(@Param('companyId') companyId: string) {
    await this.pixelService.remove(companyId);
  }

  @Get('gtm')
  getGtm(@Param('companyId') companyId: string) {
    return this.gtmService.get(companyId);
  }

  @Put('gtm')
  saveGtm(@Param('companyId') companyId: string, @Body() body: UpsertTrackingCodeDto) {
    return this.gtmService.save(companyId, body);
  }

  @Delete('gtm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGtm(@Param('companyId') companyId: string) {
    await this.gtmService.remove(companyId);
  }
}

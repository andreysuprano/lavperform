import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RenitencyService } from '../application/renitency.service';
import { UpdateRenitencyConfigurationDto } from '../application/dto/update-renitency-configuration.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Renitency')
@Controller('renitency')
export class RenitencyController {
    constructor(private readonly renitencyService: RenitencyService) {}

    @Get('configuration/:companyId')
    async getConfiguration(@Param('companyId') companyId: string) {
        return await this.renitencyService.getOrCreateConfiguration(companyId);
    }

    @Put('configuration/:companyId')
    async updateConfiguration(
        @Param('companyId') companyId: string,
        @Body() dto: UpdateRenitencyConfigurationDto,
    ) {
        return await this.renitencyService.updateConfiguration(companyId, dto);
    }
}

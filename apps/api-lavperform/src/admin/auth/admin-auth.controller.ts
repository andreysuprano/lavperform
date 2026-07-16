import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminAuthService,
  AdminLoginResponse,
  AdminProfileResponse,
  AdminProfileUpdateResponse,
} from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminJwtPayload } from './interfaces/admin-jwt-payload.interface';

@ApiTags('Admin Auth')
@Controller('auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login como administrador' })
  @ApiResponse({ status: 200, description: 'Login admin realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() loginDto: AdminLoginDto): Promise<AdminLoginResponse> {
    return this.adminAuthService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do administrador autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
  getProfile(
    @Req() req: { user: AdminJwtPayload },
  ): Promise<AdminProfileResponse> {
    return this.adminAuthService.getProfile(req.user.adminUserId);
  }

  @Patch('profile')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil do administrador autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  updateProfile(
    @Req() req: { user: AdminJwtPayload },
    @Body() dto: UpdateAdminProfileDto,
  ): Promise<AdminProfileUpdateResponse> {
    return this.adminAuthService.updateProfile(req.user.adminUserId, dto);
  }
}

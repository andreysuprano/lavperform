import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponse } from './interfaces/login-response.interface';
import { ConfirmCodeDto, ForgotPasswordDto } from './dto/forgot-password';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar código de recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Código de recuperação de senha enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Email inválido' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('confirm-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar código de recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Código de recuperação de senha confirmado com sucesso' })
  @ApiResponse({ status: 400, description: 'Código de confirmação inválido' })
  confirmCode(@Body() confirmCodeDto: ConfirmCodeDto) {
    return this.authService.confirmCode(confirmCodeDto);
  }
} 
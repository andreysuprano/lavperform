import { IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@exemplo.com',
    required: true
  })
  @IsEmail()
  email: string;
}

export class ConfirmCodeDto {
  @ApiProperty({
    description: 'Código de confirmação',
    example: '123456',
    required: true
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    required: true
  })
  @IsString()
  password: string;
}
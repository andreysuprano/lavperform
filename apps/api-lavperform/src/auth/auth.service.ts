import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, ResumedCompany, AccessRule } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { LoginResponse } from './interfaces/login-response.interface';
import { ConfirmCodeDto, ForgotPasswordDto } from './dto/forgot-password';
import { Smtp } from 'src/common/smtp/smtp';
import { Mail } from 'src/common/smtp/templates/confirmation-code';
import { MailLavperform } from 'src/common/smtp/templates/confirmation-code-lavperform';
import { IUserRepository } from './domain/user.repository.interface';
import { IConfirmationCodeRepository } from './domain/confirmation-code.repository.interface';
import { UserEntity } from './domain/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IConfirmationCodeRepository')
    private readonly confirmationCodeRepository: IConfirmationCodeRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    if (!email || !password) {
      throw new UnauthorizedException('Email e senha são obrigatórios');
    }

    const user = await this.userRepository.findByEmailWithCompaniesAndRules(email);

    if (!user) {
      throw new UnauthorizedException('Usuário ou senha incorretos. Verifique e tente novamente.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Usuário ou senha incorretos. Verifique e tente novamente.');
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Pega a primeira empresa como a empresa ativa
    const activeCompany = user.getActiveCompany();
    if (!activeCompany) {
      throw new UnauthorizedException('Usuário não está vinculado a nenhuma empresa ativa');
    }

    // Obter regras de acesso
    const accessRules: AccessRule[] = user.accessRules!.map(rule => ({
      module: rule.module,
      action: rule.action,
    }));

    const payload: JwtPayload = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      companyId: activeCompany.id,
      companyName: activeCompany.name,
      companyAvatar: activeCompany.avatarUrl ?? '',
      accessRules: accessRules,
      slug: activeCompany.slug ?? ''
    };

    const expiresIn = process.env.JWT_EXPIRES_IN ? `${process.env.JWT_EXPIRES_IN}d` : '7d';

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: expiresIn as `${number}d`,
      }),
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(forgotPasswordDto.email);

    if (!user) {
      return;
    }

    const confirmationCode = await this.confirmationCodeRepository.create(
      Math.floor(10000 + Math.random() * 90000).toString(),
      user.id
    );

    const mailTemplate = process.env.WHITELABEL === 'lavperform' ? MailLavperform : Mail;
    await new Smtp().sendMail(user.email, mailTemplate.title(confirmationCode.code), mailTemplate.html(confirmationCode.code));
  }

  async confirmCode(confirmCodeDto: ConfirmCodeDto): Promise<void> {
    const confirmationCode = await this.confirmationCodeRepository.findUnusedByCode(confirmCodeDto.code);

    if (!confirmationCode) {
      throw new BadRequestException('Código de confirmação inválido');
    }

    await this.confirmationCodeRepository.markAsUsed(confirmationCode.id);

    const hashedPassword = await bcrypt.hash(confirmCodeDto.password, 10);
    await this.userRepository.updatePassword(confirmationCode.userId, hashedPassword);
  }
}

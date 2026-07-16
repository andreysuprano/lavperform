import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SolvefyAdsService {
  private readonly logger = new Logger(SolvefyAdsService.name);
  private readonly baseUrl: string;
  private readonly partnerApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'SOLVEFYADS_API_BASE_URL',
      'https://solvefy-ads-backend.onrender.com',
    );
    this.partnerApiKey = this.configService.get<string>('SOLVEFYADS_PARTNER_API_KEY', '') ?? '';
  }

  async getEmbedTokenForCompany(
    companyId: string,
    userId: string,
  ): Promise<{ token: string; expiresAt?: string }> {
    const link = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
      select: { companyId: true },
    });

    if (!link) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const raw = await this.requestEmbedToken({
      externalUserId: company.id,
      email: company.email,
      name: company.name,
    });

    return this.mapPartnerEmbedResponse(raw);
  }

  private async requestEmbedToken(body: {
    externalUserId: string;
    email: string;
    name: string;
  }): Promise<Record<string, unknown>> {
    if (!this.partnerApiKey) {
      this.logger.error('SOLVEFYADS_PARTNER_API_KEY não configurada');
      throw new InternalServerErrorException('Integração de anúncios não configurada');
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/v1/embed/token`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, unknown>>(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Partner-Api-Key': this.partnerApiKey,
          },
        }),
      );
      return response.data ?? {};
    } catch (err) {
      this.handleHttpError(err, url);
    }
  }

  /** Formato do parceiro: `{ embedToken, expiresAt }`; expomos `token` para o front. */
  private mapPartnerEmbedResponse(data: Record<string, unknown>): {
    token: string;
    expiresAt?: string;
  } {
    const token = this.extractToken(data);
    const expiresAt = data.expiresAt;
    const expires =
      typeof expiresAt === 'string' && expiresAt.length > 0 ? expiresAt : undefined;
    return expires !== undefined ? { token, expiresAt: expires } : { token };
  }

  private extractToken(data: Record<string, unknown>): string {
    const directKeys = ['embedToken', 'token', 'accessToken', 'access_token'];
    for (const key of directKeys) {
      const v = data[key];
      if (typeof v === 'string' && v.length > 0) {
        return v;
      }
    }

    const nested = data.data;
    if (nested !== null && typeof nested === 'object' && !Array.isArray(nested)) {
      return this.extractToken(nested as Record<string, unknown>);
    }

    this.logger.error(`Resposta sem token reconhecível: ${JSON.stringify(data)}`);
    throw new InternalServerErrorException(
      'Resposta do serviço de token inválida; contate o suporte.',
    );
  }

  private handleHttpError(err: unknown, url: string): never {
    const axiosError = err as AxiosError<{ message?: string | string[]; error?: string }>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const message = Array.isArray(responseData?.message)
      ? responseData.message.join(', ')
      : responseData?.message ?? responseData?.error ?? 'Erro ao obter token de embed';

    this.logger.error(`Ads embed token [${status}] ${url}: ${JSON.stringify(message)}`);

    if (status === 400) throw new BadRequestException(message);
    if (status === 403 || status === 401) throw new ForbiddenException(message);
    throw new InternalServerErrorException(`Falha ao obter token de embed: ${message}`);
  }
}

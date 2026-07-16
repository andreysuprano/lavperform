import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface DisparoProSmsPayload {
  numero: string;
  mensagem: string;
  parceiro_id: string;
  servico?: string;
  codificacao?: string;
}

export interface DisparoProSmsResponse {
  success: boolean;
  data?: unknown;
}

@Injectable()
export class DisparoProClient {
  private readonly logger = new Logger(DisparoProClient.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.DISPARO_PRO_BASE_URL ?? 'https://apihttp.disparopro.com.br';
    this.apiToken = process.env.DISPARO_PRO_API_TOKEN ?? '';
  }

  async sendSms(
    numero: string,
    mensagem: string,
    companyId: string,
  ): Promise<DisparoProSmsResponse> {
    const payload: DisparoProSmsPayload[] = [
      {
        numero,
        servico: 'short',
        mensagem,
        parceiro_id: companyId,
        codificacao: '0',
      },
    ];

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/mt`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
        }),
      );

      this.logger.log(`SMS enviado para ${numero} (empresa: ${companyId}): ${response.status}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      this.logger.error(`Erro ao enviar SMS para ${numero}: ${error.message}`);
      throw new Error(`Falha ao enviar SMS via DisparoPro: ${error.message}`);
    }
  }
}

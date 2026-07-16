import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateInstanceDto, CreateInstanceResponseDto } from './application/dto/create-instance.dto';
import { ConnectInstanceResponseDto } from './application/dto/connect-instance.dto';
import { ConnectionStateDto } from './application/dto/connection-state.dto';
import { DeleteInstanceDto } from './application/dto/delete-instance.dto';
import { formatError } from '../../common/utils/formatters';
import { CheckNumberItemDto } from './application/dto/check-numbers.dto';
import { UazapiInstanceSummaryDto } from './application/dto/instance-list.dto';

export type CheckNumberResult = {
  phone: string;
  exists: boolean;
};

@Injectable()
export class UazapiClient {
  private readonly logger = new Logger(UazapiClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.UAZAPI_API_URL || '';
    this.apiKey = process.env.UAZAPI_ADMIN_API_KEY || '';
  }

  private getHeaders() {
    return {
      'admintoken': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async createInstance(data: CreateInstanceDto): Promise<CreateInstanceResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/instance/init`,
          data,
          { headers: this.getHeaders() }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao criar instância ${data.name}: \n${errorMessage} `);
      throw new Error(`Erro ao criar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async connectInstance(token: string): Promise<ConnectInstanceResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/instance/connect`,
          {},
          { headers: { 'token': token } }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao conectar instância ${token}: \n${errorMessage} `);
      throw new Error(`Erro ao conectar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async getConnectionState(token: string): Promise<ConnectionStateDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/instance/status`,
          { headers: { 'token': `${token}` } }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao verificar status da instância ${token}: \n${errorMessage} `);
      throw new Error(`Erro ao verificar status da instância: \n${errorMessage} `);
    }
  }

  async deleteInstance(token: string): Promise<DeleteInstanceDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/instance`,
          { headers: { 'token': `${token}` } }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao deletar instância ${token}: \n${errorMessage} `);
      throw new Error(`Erro ao deletar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async sendTextMessage(phone: string, text: string, token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/send/text`,
          {
            number: phone,
            text,
            linkPreview: false,
          },
          { headers: { token } }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao enviar mensagem de texto para ${phone}: \n${errorMessage} `);
      throw new Error(`Erro ao enviar mensagem de texto para ${phone}: \n${errorMessage} `);
    }
  }

  async sendMessageWithImage(phone: string, message: string, imageUrl: string, token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/send/media`,
          {
            "number": phone,
            "type": "image",
            "text": message,
            "file": imageUrl,
            "delay": 10000,
          },
          { headers: { 'token': `${token}` } })
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao enviar mensagem com imagem para ${phone}: \n${errorMessage} `);
      throw new Error(`Erro ao enviar mensagem com imagem para ${phone}: \n${errorMessage} `);
    }
  }

  async sendTyping(phone: string, token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/message/presence`,
          {
            "number": phone,
            "delay": Math.floor(Math.random() * 1000) + 1000,
            "presence": "composing",
          },
          { headers: { 'token': `${token}` } }
        )
      );

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao enviar presença para ${phone}: \n${errorMessage} `);
      throw new Error(`Erro ao enviar presença para ${phone}: \n${errorMessage} `);
    }
  }

  async setWebhook(
    token: string,
    url: string,
    events: string[],
    options?: { excludeMessages?: string[] },
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/webhook`,
          {
            "enabled": true,
            "url": url,
            "events": events,
            "excludeMessages": options?.excludeMessages ?? ["wasSentByApi"],
          },
          { headers: { 'token': `${token}` } }
        )
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao definir webhook: \n${errorMessage} `);
      throw new Error(`Erro ao definir webhook: \n${errorMessage} `);
    }
  }

  async getContactsFromCompany(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/contacts`, { headers: { 'token': `${token}` } })
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao obter contatos da empresa: \n${errorMessage} `);
      throw new Error(`Erro ao obter contatos da empresa: \n${errorMessage} `);
    }
  }

  async getConversationContactsFromCompany(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/chat/find`, {
          "wa_isGroup": false
        },{ headers: { 'token': `${token}` }})
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao obter conversa de contatos da empresa: \n${errorMessage} `);
      throw new Error(`Erro ao obter conversa de contatos da empresa: \n${errorMessage} `);
    }
  }

  async getAllInstances(): Promise<UazapiInstanceSummaryDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UazapiInstanceSummaryDto[]>(
          `${this.baseUrl}/instance/all`,
          { headers: this.getHeaders() },
        ),
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao listar instâncias: \n${errorMessage}`);
      throw new Error(`Erro ao listar instâncias da Uazapi: \n${errorMessage}`);
    }
  }

  // ─── Admin endpoints (admintoken) ────────────────────────────────────────

  /**
   * POST /instance/update
   * Atualizar campos administrativos de uma instância existente.
   * Usa admintoken + token da instância no body.
   */
  async updateInstanceAdminFields(
    instanceToken: string,
    fields: { adminField01?: string; adminField02?: string; systemName?: string },
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/instance/update`,
          { token: instanceToken, ...fields },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao atualizar campos da instância ${instanceToken}: \n${errorMessage}`);
      throw new Error(`Erro ao atualizar campos da instância: \n${errorMessage}`);
    }
  }

  /**
   * GET /admin/webhook
   * Ver configuração do webhook global.
   */
  async getGlobalWebhook(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/admin/webhook`, { headers: this.getHeaders() }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao obter webhook global: \n${errorMessage}`);
      throw new Error(`Erro ao obter webhook global: \n${errorMessage}`);
    }
  }

  /**
   * POST /admin/webhook
   * Configurar o webhook global da aplicação.
   */
  async setGlobalWebhook(config: {
    enabled: boolean;
    url: string;
    events?: string[];
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/admin/webhook`, config, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao configurar webhook global: \n${errorMessage}`);
      throw new Error(`Erro ao configurar webhook global: \n${errorMessage}`);
    }
  }

  /**
   * GET /admin/webhook/errors
   * Ver últimos erros do webhook global.
   */
  async getGlobalWebhookErrors(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/admin/webhook/errors`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao obter erros do webhook global: \n${errorMessage}`);
      throw new Error(`Erro ao obter erros do webhook global: \n${errorMessage}`);
    }
  }

  /**
   * POST /admin/restart
   * Reiniciar a aplicação UAZAPI.
   */
  async restartApplication(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/admin/restart`, {}, { headers: this.getHeaders() }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao reiniciar aplicação UAZAPI: \n${errorMessage}`);
      throw new Error(`Erro ao reiniciar aplicação UAZAPI: \n${errorMessage}`);
    }
  }

  /**
   * POST /admin/token
   * Rotacionar o admin token da aplicação.
   */
  async rotateAdminToken(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/admin/token`, {}, { headers: this.getHeaders() }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao rotacionar admin token: \n${errorMessage}`);
      throw new Error(`Erro ao rotacionar admin token: \n${errorMessage}`);
    }
  }

  async checkNumbers(numbers: string[]): Promise<CheckNumberResult[]> {
    const checkToken = process.env.UAZAPI_TOKEN;

    if (!checkToken) {
      throw new Error('UAZAPI_TOKEN não configurado');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<CheckNumberItemDto[]>(
          `${this.baseUrl}/chat/check`,
          { numbers },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              token: checkToken,
            },
          },
        ),
      );

      const data: CheckNumberItemDto[] = Array.isArray(response.data) ? response.data : [];

      return data.map((item) => ({
        phone: item.query,
        exists: item.isInWhatsapp,
      }));
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao verificar números no WhatsApp: \n${errorMessage} `);
      throw new Error(`Erro ao verificar números no WhatsApp: \n${errorMessage} `);
    }
  }
}
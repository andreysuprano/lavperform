import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateInstanceDto } from '../application/dto/create-instance.dto';
import { ConnectInstanceDto } from '../application/dto/connect-instance.dto';
import { ConnectionStateDto } from '../application/dto/connection-state.dto';
import { DeleteInstanceDto } from '../application/dto/delete-instance.dto';
import { formatError } from '../../common/utils/formatters';
import { MessageTextWithImageResponse } from '../application/dto/message-text-with-image-response';

@Injectable()
export class EvolutionClient {
  private readonly logger = new Logger(EvolutionClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.EVOLUTION_API_URL || '';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
  }

  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async createInstance(data: CreateInstanceDto) {
    this.logger.log(`Criando nova instância: ${data.instanceName} `);
    this.logger.debug(`Dados da instância: ${JSON.stringify(data)} `);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/instance/create`,
          data,
          { headers: this.getHeaders() }
        )
      );

      this.logger.log(`Instância ${data.instanceName} criada com sucesso`);
      this.logger.debug(`Resposta da API: ${JSON.stringify(response.data)} `);

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao criar instância ${data.instanceName}: \n${errorMessage} `);
      throw new Error(`Erro ao criar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async connectInstance(instanceName: string): Promise<ConnectInstanceDto> {
    this.logger.log(`Conectando instância: ${instanceName} `);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/instance/connect/${instanceName}`,
          { headers: this.getHeaders() }
        )
      );

      this.logger.log(`Instância ${instanceName} conectada com sucesso`);
      this.logger.debug(`Resposta da API: ${JSON.stringify(response.data)} `);

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao conectar instância ${instanceName}: \n${errorMessage} `);
      throw new Error(`Erro ao conectar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async getConnectionState(instanceName: string): Promise<ConnectionStateDto> {
    this.logger.log(`Verificando status da instância: ${instanceName} `);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/instance/connectionState/${instanceName}`,
          { headers: this.getHeaders() }
        )
      );

      this.logger.log(`Status da instância ${instanceName} obtido com sucesso`);
      this.logger.debug(`Resposta da API: ${JSON.stringify(response.data)} `);

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao verificar status da instância ${instanceName}: \n${errorMessage} `);
      throw new Error(`Erro ao verificar status da instância: \n${errorMessage} `);
    }
  }

  async deleteInstance(instanceName: string): Promise<DeleteInstanceDto> {
    this.logger.log(`Deletando instância: ${instanceName} `);

    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/instance/delete/${instanceName}`,
          { headers: this.getHeaders() }
        )
      );

      this.logger.log(`Instância ${instanceName} deletada com sucesso`);
      this.logger.debug(`Resposta da API: ${JSON.stringify(response.data)} `);

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao deletar instância ${instanceName}: \n${errorMessage} `);
      throw new Error(`Erro ao deletar instância do WhatsApp: \n${errorMessage} `);
    }
  }

  async sendMessageWithImage(phone: string, message: string, imageUrl: string, instance: string): Promise<MessageTextWithImageResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/message/sendMedia/${instance}`,
          {
            "number": phone,
            "mediatype": "image",
            "mimetype": "image/png",
            "caption": message,
            "media": imageUrl,
            "delay": 10000,
            "linkPreview": true,
          },
          { headers: this.getHeaders() })
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao enviar mensagem com imagem para ${phone}: \n${errorMessage} `);
      throw new Error(`Erro ao enviar mensagem com imagem para ${phone}: \n${errorMessage} `);
    }
  }

  async sendTyping(phone: string, instance: string): Promise<MessageTextWithImageResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/chat/sendPresence/${instance}`,
          {
            "number": phone,
            "options": {
              "delay": Math.floor(Math.random() * 1000) + 1000,
              "presence": "composing",
            }
          },
          { headers: this.getHeaders() }
        )
      );

      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao enviar presença para ${phone}: \n${errorMessage} `);
      throw new Error(`Erro ao enviar presença para ${phone}: \n${errorMessage} `);
    }
  }
}
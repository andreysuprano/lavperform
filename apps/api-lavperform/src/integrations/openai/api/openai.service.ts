import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from 'src/common/utils/formatters';

export interface GenerateMessageRequest {
  customerName: string;
  messageText: string;
  linkCardapio: string;
  couponCode?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.OPENAI_URL || '';  
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };

  }
  async generateMessage(message: GenerateMessageRequest) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/webhook/generate-message`, { message }, { headers: this.getHeaders() })
      );
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Não foi possível gerar a mensagem: ${errorMessage}`);
      throw new Error(`Não foi possível gerar a mensagem: ${errorMessage}`);
    }
  }
} 
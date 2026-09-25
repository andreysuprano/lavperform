import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  AgidezCliente,
  AgidezCredentials,
  AgidezDaySales,
  AgidezProduto,
  AgidezServico,
  AgidezTicket,
} from './agidez.types';

const DEFAULT_BASE_URL =
  'https://viewinterface-agidez-integracoes.hybex.com.br';

/** Pausa entre chamadas. A Hybex bloqueia rajadas de dezenas de requests por segundo. */
const INTER_REQUEST_DELAY_MS = 1000;

@Injectable()
export class AgidezService {
  private readonly logger = new Logger(AgidezService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.AGIDEZ_API_URL ?? DEFAULT_BASE_URL;
  }

  async getCustomers(credentials: AgidezCredentials): Promise<AgidezCliente[]> {
    return this.select<AgidezCliente>(credentials, 'pAPI_WA_Clientes');
  }

  /**
   * A data final da View é exclusiva. O dia `YYYY-MM-DD` vai de 00:00 até
   * 00:00 do dia seguinte.
   */
  async getDailySales(
    credentials: AgidezCredentials,
    date: string,
  ): Promise<AgidezDaySales> {
    const start = `${date} 00:00:00`;
    const end = `${nextDateOnly(date)} 00:00:00`;

    const tickets = await this.select<AgidezTicket>(
      credentials,
      'pAPI_WA_Tickets',
      start,
      end,
    );
    await this.sleep(INTER_REQUEST_DELAY_MS);
    const services = await this.select<AgidezServico>(
      credentials,
      'pAPI_WA_TicketsPecasIndividuaisServicos',
      start,
      end,
    );
    await this.sleep(INTER_REQUEST_DELAY_MS);
    const products = await this.select<AgidezProduto>(
      credentials,
      'pAPI_WA_TicketsProdutos',
      start,
      end,
    );
    await this.sleep(INTER_REQUEST_DELAY_MS);

    return { tickets, services, products };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async select<T>(
    credentials: AgidezCredentials,
    name: string,
    start?: string,
    end?: string,
  ): Promise<T[]> {
    const parameters: Array<number | string> = [
      credentials.accountCode,
      credentials.storeCode,
      credentials.token,
    ];
    if (start && end) {
      parameters.push(start, end);
    }

    try {
      this.logger.log(
        `Agidez ${name} loja ${credentials.storeCode}${start ? ` (${start} → ${end})` : ''}`,
      );

      const response = await firstValueFrom(
        this.httpService
          .post<T[]>(`${this.baseUrl}/api/View/Select`, { name, parameters }, {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
              ApiPassword: credentials.apiPassword,
            },
          })
          .pipe(
            catchError((error) => {
              throw error;
            }),
          ),
      );

      const rows = Array.isArray(response.data) ? response.data : [];
      this.logger.log(`Agidez ${name}: ${rows.length} registros`);
      return rows;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao consultar Agidez ${name}: ${errorMessage}`);
      throw new Error(
        `Não foi possível consultar Agidez ${name}: ${errorMessage}`,
      );
    }
  }
}

export function nextDateOnly(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

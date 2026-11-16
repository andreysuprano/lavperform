import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep as paceSleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import {
  EssenceCliente,
  EssenceCredentials,
  EssenceTicket,
} from './essence.types';

const DEFAULT_BASE_URL = 'https://viewinterface-essence.hybex.com.br';
const INTER_REQUEST_DELAY_MS = DEFAULT_PARTNER_HTTP_DELAY_MS;
const TICKETS_PAGE_SIZE = 50;
const CUSTOMERS_PAGE_SIZE = 50;

export function nextUtcDateOnly(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

@Injectable()
export class EssenceService {
  private readonly logger = new Logger(EssenceService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.HYBEX_ESSENCE_API_URL ?? DEFAULT_BASE_URL;
  }

  async listTicketsForDay(
    credentials: EssenceCredentials,
    date: string,
  ): Promise<EssenceTicket[]> {
    const start = `${date} 00:00:00`;
    const end = `${nextUtcDateOnly(date)} 00:00:00`;
    const all: EssenceTicket[] = [];
    let page = 1;

    for (;;) {
      const pageRows = await this.select<EssenceTicket>(
        credentials,
        'pAPI_Tickets',
        [
          credentials.storeGuid,
          credentials.integrationKey,
          page,
          TICKETS_PAGE_SIZE,
          '',
          '',
          start,
          end,
        ],
      );
      all.push(...pageRows);
      if (pageRows.length < TICKETS_PAGE_SIZE) break;
      page += 1;
      await this.sleep(INTER_REQUEST_DELAY_MS);
    }

    return all;
  }

  async listAllCustomers(
    credentials: EssenceCredentials,
  ): Promise<EssenceCliente[]> {
    const all: EssenceCliente[] = [];
    let page = 1;

    for (;;) {
      const pageRows = await this.select<EssenceCliente>(
        credentials,
        'pAPI_Clientes',
        [
          credentials.storeGuid,
          credentials.integrationKey,
          page,
          CUSTOMERS_PAGE_SIZE,
        ],
      );
      all.push(...pageRows);
      if (pageRows.length < CUSTOMERS_PAGE_SIZE) break;
      page += 1;
      await this.sleep(INTER_REQUEST_DELAY_MS);
    }

    return all;
  }

  private sleep(ms: number): Promise<void> {
    return paceSleep(ms);
  }

  private async select<T>(
    credentials: EssenceCredentials,
    name: string,
    parameters: Array<number | string>,
  ): Promise<T[]> {
    try {
      this.logger.log(`Essence ${name} loja ${credentials.storeGuid}`);

      const response = await with429Retry(
        () =>
          firstValueFrom(
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
          ),
        { logger: this.logger, sleep: (ms) => this.sleep(ms) },
      );

      const rows = Array.isArray(response.data) ? response.data : [];
      this.logger.log(`Essence ${name}: ${rows.length} registros`);
      return rows;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Erro ao consultar Essence ${name}: ${errorMessage}`);
      throw new Error(
        `Não foi possível consultar Essence ${name}: ${errorMessage}`,
      );
    }
  }
}
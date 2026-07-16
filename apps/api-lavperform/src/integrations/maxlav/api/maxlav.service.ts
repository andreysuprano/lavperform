import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import { MaxlavOrder, MaxlavOrdersResponse } from './maxlav.types';

const MAX_RETRIES_ON_429 = 3;
const INTER_REQUEST_DELAY_MS = 2000;

@Injectable()
export class MaxlavService {
  private readonly logger = new Logger(MaxlavService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env.MAXLAV_API_URL ?? 'https://api-dashboard.maxpan.com.br';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRetryAfterMs(retryAfterHeader?: string): number {
    const defaultWait = 60_000;
    if (!retryAfterHeader) return defaultWait;

    const seconds = Number(retryAfterHeader);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;

    const date = new Date(retryAfterHeader);
    if (!isNaN(date.getTime())) {
      const wait = date.getTime() - Date.now();
      return wait > 0 ? wait : defaultWait;
    }

    return defaultWait;
  }

  /**
   * Converte uma data YYYY-MM-DD em ISO datetime de início do dia (UTC).
   */
  private toBeginDate(date: string): string {
    return `${date}T00:00:00.000Z`;
  }

  /**
   * Converte uma data YYYY-MM-DD em ISO datetime de fim do dia (UTC).
   */
  private toEndDate(date: string): string {
    return `${date}T23:59:59.999Z`;
  }

  /**
   * Busca uma página de pedidos filtrando por data.
   */
  async getOrdersPage(
    apiToken: string,
    page: number,
    beginDate: string,
    endDate: string,
    limit = 100,
  ): Promise<MaxlavOrder[]> {
    for (let attempt = 1; attempt <= MAX_RETRIES_ON_429 + 1; attempt++) {
      try {
        this.logger.log(
          `Buscando pedidos Maxlav página ${page} (${beginDate} → ${endDate}, tentativa: ${attempt})`,
        );

        const response = await firstValueFrom(
          this.httpService
            .get<MaxlavOrdersResponse>(`${this.baseUrl}/v1/orders`, {
              params: {
                page,
                limit,
                mask: false,
                showName: true,
                period: 'custom',
                beginDate,
                endDate,
              },
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${apiToken}`,
              },
            })
            .pipe(
              catchError((error) => {
                throw error;
              }),
            ),
        );

        const results = response.data?.results ?? [];
        this.logger.log(
          `Retornados ${results.length} pedidos Maxlav na página ${page}`,
        );
        return results;
      } catch (error) {
        const status: number | undefined =
          error?.response?.status ?? error?.status;

        if (status === 429) {
          const retryAfterMs = this.parseRetryAfterMs(
            error?.response?.headers?.['retry-after'],
          );
          const waitSeconds = Math.ceil(retryAfterMs / 1000);

          if (attempt <= MAX_RETRIES_ON_429) {
            this.logger.warn(
              `HTTP 429 da API Maxlav. Aguardando ${waitSeconds}s antes da tentativa ${attempt + 1}/${MAX_RETRIES_ON_429 + 1}…`,
            );
            await this.sleep(retryAfterMs);
            continue;
          }

          this.logger.error(
            `HTTP 429 persistente após ${MAX_RETRIES_ON_429} retentativas. Abortando.`,
          );
        }

        if (status === 401) {
          this.logger.error(
            `HTTP 401 da API Maxlav: token expirado ou inválido. Verifique o apiKey da integração.`,
          );
        }

        const errorMessage = formatError(error);
        this.logger.error(
          `Erro ao buscar pedidos Maxlav (página ${page}): ${errorMessage}`,
        );
        throw new Error(
          `Não foi possível buscar pedidos Maxlav (página ${page}): ${errorMessage}`,
        );
      }
    }

    throw new Error(
      `Não foi possível buscar pedidos Maxlav: limite de tentativas esgotado`,
    );
  }

  /**
   * Busca TODOS os pedidos de um dia específico, paginando até a última página.
   * @param apiToken - Token de API
   * @param date     - Data no formato YYYY-MM-DD
   */
  async getDailySales(apiToken: string, date: string): Promise<MaxlavOrder[]> {
    const beginDate = this.toBeginDate(date);
    const endDate = this.toEndDate(date);
    const pageSize = 100;
    const allOrders: MaxlavOrder[] = [];
    let page = 1;

    while (true) {
      if (page > 1) {
        await this.sleep(INTER_REQUEST_DELAY_MS);
      }

      const orders = await this.getOrdersPage(
        apiToken,
        page,
        beginDate,
        endDate,
        pageSize,
      );

      if (!orders.length) {
        this.logger.log(
          `Maxlav: página ${page} vazia para ${date}   paginação concluída`,
        );
        break;
      }

      allOrders.push(...orders);
      this.logger.log(
        `Maxlav: página ${page}   ${orders.length} pedidos (total: ${allOrders.length})`,
      );
      page++;
    }

    this.logger.log(
      `Maxlav: ${allOrders.length} pedidos buscados para o dia ${date}`,
    );
    return allOrders;
  }
}

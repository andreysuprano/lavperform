import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep as paceSleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import { MaxlavOrder, MaxlavOrdersResponse } from './maxlav.types';

const INTER_REQUEST_DELAY_MS = DEFAULT_PARTNER_HTTP_DELAY_MS;
const RETRY_AFTER_FALLBACK_MS = 60_000;

@Injectable()
export class MaxlavService {
  private readonly logger = new Logger(MaxlavService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env.MAXLAV_API_URL ?? 'https://api-dashboard.maxpan.com.br';
  }

  private sleep(ms: number): Promise<void> {
    return paceSleep(ms);
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
    try {
      this.logger.log(
        `Buscando pedidos Maxlav página ${page} (${beginDate} → ${endDate})`,
      );

      const response = await with429Retry(
        () =>
          firstValueFrom(
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
          ),
        {
          logger: this.logger,
          sleep: (ms) => this.sleep(ms),
          fallbackMs: RETRY_AFTER_FALLBACK_MS,
        },
      );

      const results = response.data?.results ?? [];
      this.logger.log(
        `Retornados ${results.length} pedidos Maxlav na página ${page}`,
      );
      return results;
    } catch (error) {
      const status: number | undefined =
        error?.response?.status ?? error?.status;

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

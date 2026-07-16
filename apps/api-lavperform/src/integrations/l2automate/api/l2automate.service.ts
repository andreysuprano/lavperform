import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  L2AutomateSale,
  L2AutomateSalesQueryParams,
  L2AutomateSalesResponse,
} from './l2automate.types';

/** Limite da API: 100 requisições a cada 15 minutos por IP */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;

/** Delay mínimo entre requisições consecutivas para não saturar o limite */
const INTER_REQUEST_DELAY_MS = Math.ceil(RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS); // ~9 000 ms

/** Tentativas extras após receber HTTP 429 */
const MAX_RETRIES_ON_429 = 3;

@Injectable()
export class L2AutomateService {
  private readonly logger = new Logger(L2AutomateService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.L2AUTOMATE_API_URL ?? 'https://bolhadesabao.app.br';
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extrai o tempo de espera em ms a partir do header Retry-After.
   * Aceita valor em segundos (inteiro) ou data HTTP (RFC 7231).
   * Caso o header esteja ausente ou inválido, retorna o default de 15 minutos.
   */
  private parseRetryAfterMs(retryAfterHeader?: string): number {
    if (!retryAfterHeader) return RATE_LIMIT_WINDOW_MS;

    const seconds = Number(retryAfterHeader);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;

    const date = new Date(retryAfterHeader);
    if (!isNaN(date.getTime())) {
      const wait = date.getTime() - Date.now();
      return wait > 0 ? wait : RATE_LIMIT_WINDOW_MS;
    }

    return RATE_LIMIT_WINDOW_MS;
  }

  // ─── API calls ────────────────────────────────────────────────────────────

  /**
   * Busca vendas em um período específico na API L2 Automate (Bolha de Sabão).
   * Aplica retry automático com base no header Retry-After ao receber HTTP 429.
   *
   * @param apiToken  - Token de API (campo apiKey da integração)
   * @param startDate - Data inicial no formato YYYY-MM-DD
   * @param endDate   - Data final no formato YYYY-MM-DD
   * @param limit     - Máximo de registros por página (padrão 500)
   * @param offset    - Número de registros a pular
   */
  async getSales(
    apiToken: string,
    startDate: string,
    endDate: string,
    limit = 500,
    offset = 0,
  ): Promise<{ sales: L2AutomateSale[]; total: number }> {
    const params: L2AutomateSalesQueryParams = { startDate, endDate, limit, offset };

    for (let attempt = 1; attempt <= MAX_RETRIES_ON_429 + 1; attempt++) {
      try {
        this.logger.log(
          `Buscando vendas L2 Automate de ${startDate} até ${endDate} (offset: ${offset}, tentativa: ${attempt})`,
        );

        const response = await firstValueFrom(
          this.httpService
            .get<L2AutomateSalesResponse>(`${this.baseUrl}/api/v1/sales`, {
              params,
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

        const data = response.data;

        if (!data.success) {
          this.logger.warn(`API L2 Automate retornou success=false`);
          return { sales: [], total: 0 };
        }

        this.logger.log(
          `Retornadas ${data.sales?.length ?? 0} de ${data.pagination?.total ?? 0} vendas L2 Automate`,
        );

        return {
          sales: data.sales ?? [],
          total: data.pagination?.total ?? 0,
        };
      } catch (error) {
        const status: number | undefined = error?.response?.status ?? error?.status;

        if (status === 429) {
          const retryAfterMs = this.parseRetryAfterMs(
            error?.response?.headers?.['retry-after'],
          );
          const waitSeconds = Math.ceil(retryAfterMs / 1000);

          if (attempt <= MAX_RETRIES_ON_429) {
            this.logger.warn(
              `HTTP 429 recebido da API L2 Automate. Aguardando ${waitSeconds}s antes da tentativa ${attempt + 1}/${MAX_RETRIES_ON_429 + 1}…`,
            );
            await this.sleep(retryAfterMs);
            continue;
          }

          this.logger.error(
            `HTTP 429 persistente após ${MAX_RETRIES_ON_429} retentativas. Abortando.`,
          );
        }

        const errorMessage = formatError(error);
        this.logger.error(
          `Não foi possível buscar as vendas L2 Automate: ${errorMessage}`,
        );
        throw new Error(
          `Não foi possível buscar as vendas L2 Automate: ${errorMessage}`,
        );
      }
    }

    throw new Error('Não foi possível buscar as vendas L2 Automate: limite de tentativas esgotado');
  }

  /**
   * Busca TODAS as vendas de um período percorrendo todas as páginas.
   * Respeita o rate-limit com um delay de ~9s entre requisições de paginação.
   *
   * @param apiToken  - Token de API
   * @param startDate - Data inicial no formato YYYY-MM-DD
   * @param endDate   - Data final no formato YYYY-MM-DD
   */
  async getAllSales(
    apiToken: string,
    startDate: string,
    endDate: string,
  ): Promise<L2AutomateSale[]> {
    const pageSize = 500;
    let offset = 0;
    let allSales: L2AutomateSale[] = [];

    const firstPage = await this.getSales(apiToken, startDate, endDate, pageSize, 0);
    allSales = [...firstPage.sales];

    const total = firstPage.total;
    offset += pageSize;

    while (offset < total) {
      this.logger.debug(
        `Aguardando ${INTER_REQUEST_DELAY_MS}ms antes da próxima página (rate-limit L2 Automate)`,
      );
      await this.sleep(INTER_REQUEST_DELAY_MS);

      const page = await this.getSales(apiToken, startDate, endDate, pageSize, offset);
      allSales = [...allSales, ...page.sales];
      offset += pageSize;
    }

    this.logger.log(
      `Total de ${allSales.length} vendas L2 Automate buscadas para o período ${startDate} - ${endDate}`,
    );

    return allSales;
  }

  /**
   * Busca todas as vendas do dia para uma loja L2 Automate.
   *
   * @param apiToken - Token de API
   * @param date     - Data no formato YYYY-MM-DD
   */
  async getDailySales(apiToken: string, date: string): Promise<L2AutomateSale[]> {
    return this.getAllSales(apiToken, date, date);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import { SwlPermanentHttpError } from './swl-http.error';
import {
  SwlAtendimento,
  SwlCliente,
  SwlClienteExcluido,
  SwlLavanderia,
  SwlPaginated,
} from './swl.types';

const DEFAULT_BASE_URL =
  'https://api.sistemaswl.com.br/parceiros/lavperform/v1';
const PAGE_LIMIT = 100;
const MAX_PAGES = 5000;

type QueryParams = Record<string, string | number | undefined>;

export interface SwlClientesQuery {
  updatedSince?: string;
  cursor?: string;
}

export interface SwlAtendimentosQuery {
  updatedSince?: string;
  dataInicio?: string;
  dataFim?: string;
  cursor?: string;
}

@Injectable()
export class SwlService {
  private readonly logger = new Logger(SwlService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = (process.env.SWL_API_URL || DEFAULT_BASE_URL).replace(
      /\/+$/,
      '',
    );
  }

  getLavanderia(token: string): Promise<SwlLavanderia> {
    return this.get<SwlLavanderia>(token, '/lavanderia');
  }

  listClientes(
    token: string,
    query: SwlClientesQuery,
  ): Promise<SwlPaginated<SwlCliente>> {
    return this.get(token, '/clientes', { limit: PAGE_LIMIT, ...query });
  }

  listExcluidos(
    token: string,
    query: SwlClientesQuery,
  ): Promise<SwlPaginated<SwlClienteExcluido>> {
    return this.get(token, '/clientes/excluidos', {
      limit: PAGE_LIMIT,
      ...query,
    });
  }

  listAtendimentos(
    token: string,
    query: SwlAtendimentosQuery,
  ): Promise<SwlPaginated<SwlAtendimento>> {
    return this.get(token, '/atendimentos', { limit: PAGE_LIMIT, ...query });
  }

  /**
   * Percorre a lista até `nextCursor` nulo. Cursor repetido lança erro.
   * Um 400 com cursor enviado recomeça a lista uma vez, sem cursor; o
   * segundo 400 é permanente.
   */
  async listAll<T>(
    fetchPage: (cursor?: string) => Promise<SwlPaginated<T>>,
  ): Promise<T[]> {
    let restarted = false;
    let items: T[] = [];
    let seen = new Set<string>();
    let cursor: string | undefined;

    for (let pages = 0; pages < MAX_PAGES; pages += 1) {
      let result: SwlPaginated<T>;
      try {
        result = await fetchPage(cursor);
      } catch (error) {
        if (cursor === undefined || restarted || !isBadRequest(error)) {
          throw isBadRequest(error) ? toPermanent400(error) : error;
        }
        restarted = true;
        this.logger.warn('SWL recusou o cursor (400); recomeçando a lista');
        items = [];
        seen = new Set();
        cursor = undefined;
        continue;
      }

      items.push(...(result.data ?? []));
      const next = result.pagination?.nextCursor ?? null;
      if (next === null || next === '') {
        return items;
      }
      if (seen.has(next)) {
        throw new Error(`SWL devolveu o cursor repetido "${next}"`);
      }
      seen.add(next);
      cursor = next;
      await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    }
    throw new Error(`SWL excedeu ${MAX_PAGES} páginas na mesma lista`);
  }

  private async get<T>(
    token: string,
    path: string,
    query?: QueryParams,
  ): Promise<T> {
    const params = query ? compact(query) : undefined;
    try {
      const response = await with429Retry(
        () =>
          firstValueFrom(
            this.httpService.get<T>(`${this.baseUrl}${path}`, {
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}`,
              },
              params,
            }),
          ),
        {
          logger: this.logger,
          sleep: (ms) => sleep(ms),
          retryStatuses: [429, 503],
        },
      );
      return response.data;
    } catch (error) {
      const status = httpStatus(error);
      if (status === 400 || status === 401 || status === 403) {
        throw new SwlPermanentHttpError(status, `SWL ${path}: HTTP ${status}`);
      }
      throw error;
    }
  }
}

function compact(query: QueryParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      out[key] = value;
    }
  }
  return out;
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  return (error as { response?: { status?: number } }).response?.status;
}

function isBadRequest(error: unknown): boolean {
  if (error instanceof SwlPermanentHttpError) {
    return error.status === 400;
  }
  return httpStatus(error) === 400;
}

function toPermanent400(error: unknown): SwlPermanentHttpError {
  return error instanceof SwlPermanentHttpError
    ? error
    : new SwlPermanentHttpError(400);
}

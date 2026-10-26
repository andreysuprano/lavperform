import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import {
  WindelCredentials,
  WindelListResponse,
  WindelLoginResponse,
  WindelPerson,
  WindelServiceOrderDetail,
  WindelServiceOrderSummary,
} from './windel.types';

const DEFAULT_BASE_URL = 'https://new-winback-prod.windel.com.br/api';
export const WINDEL_DOC_PATH = 'v1/docs/service-order';
export const WINDEL_ATTENDED = 'Atendido';
const PAGE_SIZE = 25;

export class WindelMfaRequiredError extends Error {
  constructor() {
    super('Windel exigiu verificação em duas etapas');
    this.name = 'WindelMfaRequiredError';
  }
}

@Injectable()
export class WindelService {
  private readonly logger = new Logger(WindelService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = (process.env.WINDEL_API_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      '',
    );
  }

  async listAttendedOrders(
    credentials: WindelCredentials,
    date: string,
  ): Promise<WindelServiceOrderSummary[]> {
    return this.withSession(credentials, async (token) => {
      const orders: WindelServiceOrderSummary[] = [];
      let page = 1;
      let count = 0;
      do {
        const response = await this.get<WindelListResponse>(
          token,
          `/${WINDEL_DOC_PATH}`,
          {
            situacao: WINDEL_ATTENDED,
            'createdAt[gte]': `${date}T00:00:00.000Z`,
            'createdAt[lte]': `${date}T23:59:59.999Z`,
            sort: 'createdAt',
            sortOrder: 'desc',
            page,
            pageSize: PAGE_SIZE,
          },
        );
        count = response.count ?? 0;
        orders.push(...(response.list ?? []));
        page += 1;
        if ((response.list ?? []).length >= PAGE_SIZE && orders.length < count) {
          await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
        }
      } while (orders.length < count && page < 1000);
      return orders;
    });
  }

  async getOrder(
    credentials: WindelCredentials,
    id: number,
  ): Promise<WindelServiceOrderDetail> {
    return this.withSession(credentials, (token) =>
      this.get<WindelServiceOrderDetail>(token, `/${WINDEL_DOC_PATH}/${id}`),
    );
  }

  async getPerson(
    credentials: WindelCredentials,
    pessoaId: number,
  ): Promise<WindelPerson> {
    return this.withSession(credentials, (token) =>
      this.get<WindelPerson>(token, `/v1/people/${pessoaId}`),
    );
  }

  private async withSession<T>(
    credentials: WindelCredentials,
    run: (token: string) => Promise<T>,
  ): Promise<T> {
    let token = await this.login(credentials);
    try {
      return await run(token);
    } catch (error) {
      if (!isHttp401(error)) {
        throw error;
      }
      token = await this.login(credentials);
      return run(token);
    }
  }

  private async login(credentials: WindelCredentials): Promise<string> {
    const response = await with429Retry(
      () =>
        firstValueFrom(
          this.httpService
            .post<WindelLoginResponse>(
              `${this.baseUrl}/v1/auth/login/`,
              { email: credentials.email, password: credentials.password },
              {
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              },
            )
            .pipe(catchError((error) => { throw error; })),
        ),
      { logger: this.logger },
    );
    if (response.data?.mfaObrigatorio) {
      throw new WindelMfaRequiredError();
    }
    const token = response.data?.token;
    if (!token) {
      throw new Error('Login Windel não devolveu token');
    }
    return token;
  }

  private async get<T>(
    token: string,
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    const response = await with429Retry(
      () =>
        firstValueFrom(
          this.httpService
            .get<T>(`${this.baseUrl}${path}`, {
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}`,
              },
              params,
            })
            .pipe(catchError((error) => { throw error; })),
        ),
      { logger: this.logger },
    );
    return response.data;
  }
}

function isHttp401(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

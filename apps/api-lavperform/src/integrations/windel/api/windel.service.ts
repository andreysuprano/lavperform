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

export class WindelLoginRejectedError extends Error {
  constructor() {
    super('Windel recusou o login');
    this.name = 'WindelLoginRejectedError';
  }
}

export interface WindelApiSession {
  listAttendedOrders(date: string): Promise<WindelServiceOrderSummary[]>;
  getOrder(id: number): Promise<WindelServiceOrderDetail>;
  getPerson(pessoaId: number): Promise<WindelPerson>;
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

  async openSession(credentials: WindelCredentials): Promise<WindelApiSession> {
    const state = { token: await this.login(credentials) };
    const run = <T>(operation: (token: string) => Promise<T>) =>
      this.runWithToken(credentials, state, operation);
    return {
      listAttendedOrders: (date) =>
        run((token) => this.listWithToken(token, date)),
      getOrder: (id) =>
        run((token) =>
          this.get<WindelServiceOrderDetail>(token, `/${WINDEL_DOC_PATH}/${id}`),
        ),
      getPerson: (pessoaId) =>
        run((token) => this.get<WindelPerson>(token, `/v1/people/${pessoaId}`)),
    };
  }

  async listAttendedOrders(
    credentials: WindelCredentials,
    date: string,
  ): Promise<WindelServiceOrderSummary[]> {
    return this.withSession(credentials, (token) =>
      this.listWithToken(token, date),
    );
  }

  private async listWithToken(
    token: string,
    date: string,
  ): Promise<WindelServiceOrderSummary[]> {
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
    if (page >= 1000 && orders.length < count) {
      this.logger.warn(
        `Listagem Windel parou em 1000 páginas com ${orders.length} de ${count} ordens`,
      );
    }
    return orders;
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
    const state = { token: await this.login(credentials) };
    return this.runWithToken(credentials, state, run);
  }

  private async runWithToken<T>(
    credentials: WindelCredentials,
    state: { token: string },
    run: (token: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await run(state.token);
    } catch (error) {
      if (!isHttp401(error)) {
        throw error;
      }
      state.token = await this.login(credentials);
      return run(state.token);
    }
  }

  private async login(credentials: WindelCredentials): Promise<string> {
    let response: { data?: WindelLoginResponse };
    try {
      response = await with429Retry(
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
    } catch (error) {
      if (isHttp401(error) || isHttp403(error)) {
        throw new WindelLoginRejectedError();
      }
      throw error;
    }
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

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  return (error as { response?: { status?: number } }).response?.status;
}

function isHttp401(error: unknown): boolean {
  return httpStatus(error) === 401;
}

function isHttp403(error: unknown): boolean {
  return httpStatus(error) === 403;
}

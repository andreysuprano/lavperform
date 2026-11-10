import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import {
  WaymoneyBranch,
  WaymoneyClient,
  WaymoneyCredentials,
  WaymoneyLoginResponse,
  WaymoneyPackagePurchase,
  WaymoneyPackagePurchasesResponse,
  WaymoneyPayment,
  WaymoneyPaymentsResponse,
} from './waymoney.types';

const DEFAULT_BASE_URL =
  'https://dash-api-999919885157.southamerica-east1.run.app';
const PAGE_LIMIT = 50;
const MAX_PAGES = 1000;

export class WaymoneyLoginRejectedError extends Error {
  constructor() {
    super('WayMoney recusou o login');
    this.name = 'WaymoneyLoginRejectedError';
  }
}

export class WaymoneyIncompleteListError extends Error {
  constructor(resource: string, received: number, total: number) {
    super(
      `WayMoney devolveu ${received} de ${total} registros em ${resource}`,
    );
    this.name = 'WaymoneyIncompleteListError';
  }
}

export interface WaymoneyApiSession {
  listBranches(): Promise<WaymoneyBranch[]>;
  listPayments(
    branchId: string,
    startDate: string,
    endDate: string,
  ): Promise<WaymoneyPayment[]>;
  listPackagePurchases(
    branchId: string,
    startDate: string,
    endDate: string,
  ): Promise<WaymoneyPackagePurchase[]>;
  getClient(clientId: string): Promise<WaymoneyClient | null>;
}

type TokenState = { token: string };

@Injectable()
export class WaymoneyService {
  private readonly logger = new Logger(WaymoneyService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = (process.env.WAYMONEY_API_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      '',
    );
  }

  async openSession(
    credentials: WaymoneyCredentials,
  ): Promise<WaymoneyApiSession> {
    const state: TokenState = { token: await this.login(credentials) };
    return {
      listBranches: () => this.listBranches(credentials, state),
      listPayments: (branchId, startDate, endDate) =>
        this.listPayments(credentials, state, branchId, startDate, endDate),
      listPackagePurchases: (branchId, startDate, endDate) =>
        this.listPackagePurchases(
          credentials,
          state,
          branchId,
          startDate,
          endDate,
        ),
      getClient: (clientId) => this.getClient(credentials, state, clientId),
    };
  }

  private async listBranches(
    credentials: WaymoneyCredentials,
    state: TokenState,
  ): Promise<WaymoneyBranch[]> {
    const data = await this.authorized(credentials, state, (token) =>
      this.get<WaymoneyBranch[]>(token, '/api/branches'),
    );
    return Array.isArray(data) ? data : [];
  }

  private async listPayments(
    credentials: WaymoneyCredentials,
    state: TokenState,
    branchId: string,
    startDate: string,
    endDate: string,
  ): Promise<WaymoneyPayment[]> {
    const payments: WaymoneyPayment[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    while (payments.length < total && page <= MAX_PAGES) {
      const response = await this.authorized(credentials, state, (token) =>
        this.get<WaymoneyPaymentsResponse>(token, '/api/payments', {
          branchId,
          startDate,
          endDate,
          page,
          limit: PAGE_LIMIT,
        }),
      );
      total = response.total ?? 0;
      const batch = response.payments ?? [];
      payments.push(...batch);
      if (payments.length >= total) {
        return payments;
      }
      if (batch.length < PAGE_LIMIT) {
        throw new WaymoneyIncompleteListError(
          'payments',
          payments.length,
          total,
        );
      }
      page += 1;
      await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
    }
    throw new WaymoneyIncompleteListError('payments', payments.length, total);
  }

  private async listPackagePurchases(
    credentials: WaymoneyCredentials,
    state: TokenState,
    branchId: string,
    startDate: string,
    endDate: string,
  ): Promise<WaymoneyPackagePurchase[]> {
    const response = await this.authorized(credentials, state, (token) =>
      this.get<WaymoneyPackagePurchasesResponse>(
        token,
        '/api/package-purchases',
        { branchId, startDate, endDate },
      ),
    );
    const purchases = response.packagePurchases ?? [];
    const total = response.total ?? purchases.length;
    if (total > purchases.length) {
      throw new WaymoneyIncompleteListError(
        'package-purchases',
        purchases.length,
        total,
      );
    }
    return purchases;
  }

  private async getClient(
    credentials: WaymoneyCredentials,
    state: TokenState,
    clientId: string,
  ): Promise<WaymoneyClient | null> {
    try {
      return await this.authorized(credentials, state, (token) =>
        this.get<WaymoneyClient>(
          token,
          `/api/clients/${encodeURIComponent(clientId)}`,
        ),
      );
    } catch (error) {
      if (isHttp404(error)) {
        return null;
      }
      throw error;
    }
  }

  private async authorized<T>(
    credentials: WaymoneyCredentials,
    state: TokenState,
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

  private async login(credentials: WaymoneyCredentials): Promise<string> {
    let response: { data?: WaymoneyLoginResponse };
    try {
      response = await with429Retry(
        () =>
          firstValueFrom(
            this.httpService
              .post<WaymoneyLoginResponse>(
                `${this.baseUrl}/api/auth/login`,
                { email: credentials.email, password: credentials.password },
                {
                  headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                },
              )
              .pipe(
                catchError((error) => {
                  throw error;
                }),
              ),
          ),
        { logger: this.logger },
      );
    } catch (error) {
      if (isHttp401(error)) {
        throw new WaymoneyLoginRejectedError();
      }
      throw error;
    }
    const token = response.data?.token;
    if (!token) {
      throw new Error('Login WayMoney não devolveu token');
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
            .pipe(
              catchError((error) => {
                throw error;
              }),
            ),
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

function isHttp404(error: unknown): boolean {
  return httpStatus(error) === 404;
}

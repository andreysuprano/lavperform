import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  CiccloSale,
  CiccloSalesQueryParams,
  CiccloSalesResponse,
} from './cicclo.types';

@Injectable()
export class CiccloService {
  private readonly logger = new Logger(CiccloService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env.CICCLO_API_URL ?? '';
  }

  /**
   * Busca vendas em um período específico na API Cicclo
   * @param email - Código da loja (campo merchantId da integração)
   * @param password - Senha da API (campo apiKey da integração)
   * @param dateFrom - Data inicial no formato YYYY-MM-DD
   * @param dateTo - Data final no formato YYYY-MM-DD
   */
  async getSales(
    email: string,
    password: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<CiccloSale[]> {
    try {
      this.logger.log(
        `Buscando vendas Cicclo de ${dateFrom} até ${dateTo} para loja ${email}`,
      );

      const body: CiccloSalesQueryParams = {
        email,
        password,
        dateFrom,
        dateTo,
      };

      const response = await firstValueFrom(
        this.httpService
          .post<CiccloSalesResponse>(`${this.baseUrl}/api/sales/query`, body, {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error) => {
              const errorMessage = formatError(error);
              this.logger.error(`Erro ao buscar vendas Cicclo: ${errorMessage}`);
              throw error;
            }),
          ),
      );

      const data = response.data;

      if (!data.success) {
        this.logger.warn(`API Cicclo retornou success=false para loja ${email}`);
        return [];
      }

      this.logger.log(
        `Encontradas ${data.sales?.length ?? 0} vendas Cicclo`,
      );

      return data.sales ?? [];
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(
        `Não foi possível buscar as vendas Cicclo: ${errorMessage}`,
      );
      throw new Error(`Não foi possível buscar as vendas Cicclo: ${errorMessage}`);
    }
  }

  /**
   * Busca todas as vendas do dia para uma loja Cicclo
   * @param email - Código da loja
   * @param password - Senha da API
   * @param date - Data no formato YYYY-MM-DD
   */
  async getDailySales(
    email: string,
    password: string,
    date: string,
  ): Promise<CiccloSale[]> {
    return this.getSales(email, password, date, date);
  }
}

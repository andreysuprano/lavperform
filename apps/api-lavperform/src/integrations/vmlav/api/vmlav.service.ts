import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { formatError } from '../../../common/utils/formatters';
import {
  VmLavSale,
  GetSalesParams,
  VmLavSalesResponse,
  GetCustomerParams,
  VmLavCustomersResponse,
  VmLavCustomerDetail,
} from './vmlav.types';

@Injectable()
export class VmLavService {
  private readonly logger = new Logger(VmLavService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.VMLAV_API_URL || 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1';
  }

  private getHeaders(apiKey: string) {
    return {
      'accept': 'application/json',
      'x-api-key': apiKey,
    };
  }

  /**
   * Busca as vendas em um período específico
   * @param apiKey - Chave de API da empresa
   * @param params - Parâmetros de busca (data início, fim, CNPJ, paginação)
   * @returns Array de vendas
   */
  async getSales(apiKey: string, params: GetSalesParams): Promise<VmLavSalesResponse> {
    try {
      this.logger.log(`Buscando vendas de ${params.dataInicio} até ${params.dataTermino} para CNPJ ${params.cnpj}`);
      
      const queryParams = {
        dataInicio: params.dataInicio,
        dataTermino: params.dataTermino,
        somenteSucesso: params.somenteSucesso ?? true,
        cnpj: params.cnpj,
        pagina: params.pagina ?? 0,
        quantidade: params.quantidade ?? 100,
      };

      const response = await firstValueFrom(
        this.httpService.get<VmLavSalesResponse>(
          `${this.baseUrl}/vendas`,
          {
            headers: this.getHeaders(apiKey),
            params: queryParams,
          }
        ).pipe(
          catchError((error) => {
            const errorMessage = formatError(error);
            this.logger.error(`Erro ao buscar vendas: ${errorMessage}`);
            throw error;
          })
        )
      );

      this.logger.log(`Encontradas ${response.data?.length || 0} vendas`);
      return response.data;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Não foi possível buscar as vendas: ${errorMessage}`);
      throw new Error(`Não foi possível buscar as vendas: ${errorMessage}`);
    }
  }

  /**
   * Busca todas as vendas do dia para uma empresa
   * @param apiKey - Chave de API da empresa
   * @param cnpj - CNPJ da empresa
   * @param date - Data das vendas (formato ISO: YYYY-MM-DD)
   * @returns Array com todas as vendas do dia
   */
  async getDailySales(apiKey: string, cnpj: string, date: string): Promise<VmLavSale[]> {
    try {
      this.logger.log(`Buscando vendas do dia ${date} para CNPJ ${cnpj}`);
      
      // Define período do dia inteiro
      const dataInicio = `${date}T00:00:00Z`;
      const dataTermino = `${date}T23:59:59Z`;

      // A API retorna array direto, sem paginação
      const sales = await this.getSales(apiKey, {
        dataInicio,
        dataTermino,
        cnpj,
        somenteSucesso: true,
        pagina: 0,
        quantidade: 1000, // Buscar grande quantidade de uma vez
      });

      this.logger.log(`Total de ${sales.length} vendas encontradas para o dia ${date}`);
      return sales;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Não foi possível buscar as vendas do dia: ${errorMessage}`);
      throw new Error(`Não foi possível buscar as vendas do dia: ${errorMessage}`);
    }
  }

  /**
   * Busca dados detalhados de um cliente pelo CPF
   * @param apiKey - Chave de API da empresa
   * @param cpf - CPF do cliente (com ou sem formatação)
   * @returns Dados detalhados do cliente ou null se não encontrado
   */
  async getCustomerByCpf(apiKey: string, cpf: string): Promise<VmLavCustomerDetail | null> {
    try {
      if (!cpf) {
        return null;
      }

      // Remove formatação do CPF (pontos e hífen)
      const cpfClean = cpf.replace(/[^\d]/g, '');
      
      this.logger.log(`Buscando dados do cliente com CPF ${cpfClean} na API VM Lav`);
      
      const queryParams: GetCustomerParams = {
        CPF: cpfClean,
        pagina: 0,
        quantidade: 1,
        campoOrdenacao: 'dataCadastro',
        direcaoOrdenacao: 'desc',
      };

      const response = await firstValueFrom(
        this.httpService.get<VmLavCustomersResponse>(
          `${this.baseUrl}/clientes`,
          {
            headers: this.getHeaders(apiKey),
            params: queryParams,
          }
        ).pipe(
          catchError((error) => {
            const errorMessage = formatError(error);
            this.logger.error(`Erro ao buscar cliente: ${errorMessage}`);
            throw error;
          })
        )
      );

      const customers = response.data;
      
      if (!customers || customers.length === 0) {
        this.logger.log(`Nenhum cliente encontrado com CPF ${cpfClean}`);
        return null;
      }

      const customer = customers[0];
      this.logger.log(`Cliente encontrado: ${customer.nome} (ID: ${customer.id})`);
      
      return customer;
    } catch (error) {
      const errorMessage = formatError(error);
      this.logger.error(`Não foi possível buscar dados do cliente: ${errorMessage}`);
      // Retorna null ao invés de lançar erro, para permitir que o fluxo continue com os dados da venda
      return null;
    }
  }
}

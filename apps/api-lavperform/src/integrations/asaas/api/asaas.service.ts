import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PutCardDto } from '../dto/put-card.dto';
import { BadRequestException } from '@nestjs/common';
import {
  AsaasCustomerResponse,
  AsaasPaymentResponse,
  CreatePaymentDto,
  CreateSubscriptionDto,
  CreateCustomerDto,
  UpdateSubscriptionDto,
  UpdatePaymentDto,
  ReceivePaymentInCashDto,
  RefundPaymentDto,
} from './asaas.types';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.ASAAS_BASE_URL || '';
    this.apiKey = process.env.ASAAS_API_KEY || '';
  }

  private getHeaders() {
    return {
      access_token: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private getErrorDetails(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: unknown } }).response;
      if (response?.data) {
        return JSON.stringify(response.data);
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível obter os detalhes da assinatura:\n${error}`,
      );
    }
  }

  async getSubscriptionPayments(subscriptionId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}/payments`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível obter os detalhes dos pagamentos da assinatura:\n${error}`,
      );
    }
  }

  async getPaymentBarCode(paymentId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v3/payments/${paymentId}/identificationField`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível obter os detalhes dos pagamentos da assinatura:\n${error}`,
      );
    }
  }

  async getPaymentPixQrCode(paymentId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v3/payments/${paymentId}/pixQrCode`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível obter os detalhes dos pagamentos da assinatura:\n${error}`,
      );
    }
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/payments/${paymentId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível obter os detalhes do pagamento:\n${error}`,
      );
    }
  }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<AsaasPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v3/payments`, createPaymentDto, {
          headers: this.getHeaders(),
        }),
      );
      return response.data as AsaasPaymentResponse;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível criar a cobrança:\n${details}`,
      );
    }
  }

  async putCreditCardInSubscription(
    subscriptionId: string,
    putCardDto: PutCardDto,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}/creditCard`,
          putCardDto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível adicionar o cartão de crédito à assinatura:\n${error}`,
      );
    }
  }

  async putSubscriptionBillingType(
    subscriptionId: string,
    billingType: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}`,
          { billingType },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível alterar o tipo de faturamento da assinatura:\n${error}`,
      );
    }
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v3/subscriptions`,
          createSubscriptionDto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      console.log(error);
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível criar a assinatura:\n${details}`,
      );
    }
  }

  async createCustomer(
    createCustomerDto: CreateCustomerDto,
  ): Promise<AsaasCustomerResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v3/customers`,
          createCustomerDto,
          { headers: this.getHeaders() },
        ),
      );
      console.log(response.data);
      return response.data as AsaasCustomerResponse;
    } catch (error) {
      console.log(this.getErrorDetails(error));
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível criar o cliente:\n${details}`,
      );
    }
  }

  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}`,
          dto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível atualizar a assinatura:\n${details}`,
      );
    }
  }

  async deleteSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/v3/subscriptions/${subscriptionId}`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível remover a assinatura:\n${details}`,
      );
    }
  }

  async receivePaymentInCash(
    paymentId: string,
    dto: ReceivePaymentInCashDto,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v3/payments/${paymentId}/receiveInCash`,
          dto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível confirmar recebimento em dinheiro:\n${details}`,
      );
    }
  }

  async deletePayment(paymentId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/v3/payments/${paymentId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível excluir a cobrança:\n${details}`,
      );
    }
  }

  async refundPayment(paymentId: string, dto: RefundPaymentDto): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v3/payments/${paymentId}/refund`,
          dto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível estornar a cobrança:\n${details}`,
      );
    }
  }

  async updatePayment(paymentId: string, dto: UpdatePaymentDto): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.baseUrl}/v3/payments/${paymentId}`, dto, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new BadRequestException(
        `Não foi possível atualizar a cobrança:\n${details}`,
      );
    }
  }
}

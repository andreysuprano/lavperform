import type { PaymentDetails, PaymentResponse, Subscription } from '@/types'

import { client } from './client'

export const subscriptionService = {
  async listSubscriptions(companyId: string) {
    const response = await client.get<Subscription>(
      `/companies/${companyId}/subscription`
    )
    return response
  },
}

export const subscriptionPaymentService = {
  async listSubscriptions(companyId: string) {
    return await client.get<Subscription[]>(
      `/companies/${companyId}/subscription`
    )
  },

  async listSubscriptionPayments(companyId: string) {
    return await client.get<PaymentResponse>(
      `/companies/${companyId}/subscription/payments`
    )
  },

  async addCreditCard(
    companyId: string,
    payload: {
      creditCard: {
        name: string
        number: string
        expiryMonth: string
        expiryYear: string
        ccv: string
      }
      creditCardHolderInfo: {
        name: string
        email: string
        cpfCnpj: string
        postalCode: string
        addressNumber: string
        phone: string
      }
    }
  ) {
    return await client.put(
      `/companies/${companyId}/subscription/credit-card`,
      payload
    )
  },

  async removeCreditCard(companyId: string) {
    return await client.delete(
      `/companies/${companyId}/subscription/credit-card`
    )
  },
}

export const paymentService = {
  async listSubscriptionPayments(companyId: string) {
    const response = await client.get<PaymentResponse>(
      `/companies/${companyId}/subscription/payments`
    )
    return response
  },

  async getPaymentDetails(
    companyId: string,
    paymentId: string
  ): Promise<PaymentDetails> {
    const response = await client.get<PaymentDetails>(
      `/companies/${companyId}/subscription/payments/${paymentId}`
    )
    return response.data
  },
}

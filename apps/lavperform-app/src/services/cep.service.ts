import axios from 'axios'

import { CepResponse } from '@/types'

const brasilApiClient = axios.create({
  baseURL: 'https://brasilapi.com.br/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const cepService = {
  getAddressByCep: async (cep: string): Promise<CepResponse> => {
    const cleanCep = cep.replace(/\D/g, '')
    const response = await brasilApiClient.get<CepResponse>(
      `/cep/v1/${cleanCep}`
    )
    return response.data
  },
}

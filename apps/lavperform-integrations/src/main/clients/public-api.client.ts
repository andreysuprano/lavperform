import axios, { AxiosInstance } from 'axios'
import type { IngestOrderDto } from '../mappers/ingest-order.types'

export type IngestResult = 'queued' | 'already_received' | 'skipped' | 'error'

export interface IngestOutcome {
  result: IngestResult
  message?: string
}

export function createPublicApiClient(baseUrl: string, apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: baseUrl.replace(/\/$/, ''),
    timeout: 60_000,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    validateStatus: (status) => status >= 200 && status < 300,
  })
}

export function formatAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return String(error)
  }
  const status = error.response?.status
  const statusText = error.response?.statusText
  const body = error.response?.data ?? error.message
  const statusLabel = status
    ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}`
    : 'sem status HTTP'
  return `${statusLabel}: ${
    typeof body === 'string' ? body : JSON.stringify(body)
  }`
}

/**
 * Envia um pedido para a API aberta (POST /v1/orders).
 * A API exige telefone OU cpf no cliente; caso contrário o pedido é ignorado.
 */
export async function ingestOrder(
  client: AxiosInstance,
  payload: IngestOrderDto,
  dryRun: boolean,
): Promise<IngestOutcome> {
  if (!payload.customer.phone && !payload.customer.cpf) {
    return { result: 'skipped', message: 'sem telefone/cpf' }
  }

  if (dryRun) {
    return { result: 'queued' }
  }

  try {
    const response = await client.post('/v1/orders', payload)
    if (response.status === 200 && response.data?.status === 'already_received') {
      return { result: 'already_received' }
    }
    return { result: 'queued' }
  } catch (error) {
    return { result: 'error', message: formatAxiosError(error) }
  }
}

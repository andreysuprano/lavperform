import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { client, setActiveCompanyId } from './client'

describe('client X-Company-Id', () => {
  let sent: InternalAxiosRequestConfig | undefined
  const originalAdapter = client.defaults.adapter

  beforeEach(() => {
    sent = undefined
    const adapter: AxiosAdapter = async (config) => {
      sent = config
      return { data: null, status: 200, statusText: 'OK', headers: {}, config }
    }
    client.defaults.adapter = adapter
  })

  afterEach(() => {
    client.defaults.adapter = originalAdapter
    setActiveCompanyId(null)
  })

  it('envia a empresa selecionada nesta aba', async () => {
    setActiveCompanyId('cabistani')

    await client.get('/ai-agents/agente-1')

    expect(sent?.headers.get('X-Company-Id')).toBe('cabistani')
  })

  it('acompanha a troca de empresa', async () => {
    setActiveCompanyId('cabistani')
    setActiveCompanyId('borbulha')

    await client.patch('/ai-agents/agente-1/persona', {})

    expect(sent?.headers.get('X-Company-Id')).toBe('borbulha')
  })

  it('não envia o header sem empresa selecionada', async () => {
    await client.get('/ai-agents/agente-1')

    expect(sent?.headers.has('X-Company-Id')).toBe(false)
  })
})

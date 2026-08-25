import Papa from 'papaparse'

import type { ImportCustomSendListCustomer } from '@/types'
import { ClientTypes } from '@/utils/constants/clientType'

type CsvRow = Record<string, string>

const optional = (value?: string) => value?.trim() || undefined

const validateIsoDate = (
  value: string | undefined,
  field: string,
  line: number,
) => {
  if (!value) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Linha ${line}: ${field} deve usar o formato AAAA-MM-DD.`)
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    !parsed.toISOString().startsWith(value)
  ) {
    throw new Error(`Linha ${line}: ${field} contém uma data inválida.`)
  }
}

export async function parseCustomSendListCsv(
  file: File,
): Promise<ImportCustomSendListCustomer[]> {
  const result = Papa.parse<CsvRow>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      header.replace(/^\uFEFF/, '').trim().toLowerCase(),
  })

  if (result.errors.length > 0) {
    const firstError = result.errors[0]
    throw new Error(
      `Erro na linha ${(firstError.row ?? 0) + 2}: ${firstError.message}`,
    )
  }

  if (result.data.length === 0) {
    throw new Error('O arquivo CSV está vazio.')
  }

  const headers = result.meta.fields ?? []
  const missingFields = ['nome', 'telefone'].filter(
    (field) => !headers.includes(field),
  )

  if (missingFields.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${missingFields.join(', ')}.`,
    )
  }

  return result.data.map((row, index) => {
    const name = optional(row.nome)
    const phone = optional(row.telefone)

    if (!name || !phone) {
      throw new Error(
        `Linha ${index + 2}: nome e telefone devem estar preenchidos.`,
      )
    }

    const ticket = optional(row.valor_medio_ticket)
    const birthDate = optional(row.data_nascimento)
    const firstOrderDate = optional(
      row.data_primeira_venda || row.data_primeiro_pedido,
    )
    const gender = optional(row.genero)
    validateIsoDate(birthDate, 'data_nascimento', index + 2)
    validateIsoDate(firstOrderDate, 'data_primeira_venda', index + 2)
    if (gender && !['M', 'F', 'Outro'].includes(gender)) {
      throw new Error(
        `Linha ${index + 2}: genero deve ser M, F ou Outro.`,
      )
    }
    const address = {
      street: optional(row.rua),
      number: optional(row.numero),
      complement: optional(row.complemento),
      neighborhood: optional(row.bairro),
      city: optional(row.cidade),
      state: optional(row.estado),
      zipCode: optional(row.cep),
    }
    const hasAddress = Object.values(address).some(Boolean)
    const averageTicket = ticket
      ? Number(ticket.replace(',', '.'))
      : undefined

    if (averageTicket !== undefined && !Number.isFinite(averageTicket)) {
      throw new Error(`Linha ${index + 2}: valor_medio_ticket inválido.`)
    }

    return {
      name,
      phone,
      email: optional(row.email),
      birthDate,
      firstOrderDate,
      rfvClassification: ClientTypes.Novo,
      gender,
      observations: optional(row.observacoes),
      whatsappOptin: true,
      averageTicket,
      address: hasAddress ? address : undefined,
    }
  })
}

export function downloadCustomSendListCsvTemplate() {
  const content =
    'nome,telefone,email,data_nascimento,data_primeira_venda,genero,observacoes,valor_medio_ticket,rua,numero,complemento,bairro,cidade,estado,cep\nJoão Silva,(11) 99999-9999,joao@exemplo.com,1990-01-01,2023-01-01,M,Cliente importado,50.00,Av. Paulista,1000,Apto 123,Bela Vista,São Paulo,SP,01310-100'
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo_lista_personalizada.csv'
  link.click()
  URL.revokeObjectURL(url)
}

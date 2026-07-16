import * as yup from 'yup'

import { MIN_DAILY_SENDS } from './constants'

/**
 * Campo Yup compartilhado entre os passos Detalhes (criar / editar campanha automática).
 * `originalValue` é o valor bruto antes do cast (ex.: string vazia no input number).
 */
export const maxDailySendsYupField = yup
  .number()
  .transform((value, originalValue) => {
    if (
      originalValue === '' ||
      originalValue === null ||
      originalValue === undefined
    ) {
      return undefined
    }
    if (Number.isNaN(value)) {
      return undefined
    }
    return value
  })
  .typeError('Informe um número válido')
  .integer('Use apenas números inteiros')
  .min(MIN_DAILY_SENDS, `O mínimo é ${MIN_DAILY_SENDS} envio por dia`)
  .required('Informe o limite diário de envios')

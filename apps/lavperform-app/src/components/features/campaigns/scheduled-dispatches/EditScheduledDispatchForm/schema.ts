import * as yup from 'yup'

import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_IN_MB,
} from '../ScheduledDispatchList/constants'

const schema = yup.object({
  name: yup.string().required('Informe o título do disparo'),
  scheduledDate: yup
    .string()
    .nullable()
    .required('Informe a data e hora do disparo')
    .test('is-valid-date', 'A data e hora são inválidas', (value) => {
      if (!value) {
        return true
      }

      const date = new Date(value)

      const isValidDate = !isNaN(date.getTime())

      return isValidDate
    })
    .test(
      'is-valid-future-date',
      'A data e hora não podem ser no passado',
      (value) => {
        if (!value) {
          return true
        }

        const date = new Date(value)

        const isFutureDate = date.getTime() >= new Date().getTime()

        return isFutureDate
      }
    ),
  messageText: yup.string().required('Informe a mensagem do disparo'),
  imageUrl: yup.string(),
  newImageUrl: yup
    .mixed()
    .nullable()
    .test('required', 'Informe a imagem do disparo', (value: any) => {
      if (value === null || value === undefined || value.length === 0) {
        return true
      }

      return value && value.length > 0
    })
    .test(
      'fileSize',
      `A imagem esta com mais de ${MAX_FILE_SIZE}MB`,
      (value: any) => {
        if (value === null || value === undefined || value.length === 0) {
          return true
        }

        return value && value.length > 0 && value[0].size <= MAX_FILE_SIZE_IN_MB
      }
    )
    .test('fileType', 'Formato não suportado', (value: any) => {
      if (value === null || value === undefined || value.length === 0) {
        return true
      }

      return value && ['image/jpeg', 'image/png'].includes(value[0].type)
    }),
  modifiedByAI: yup.boolean(),
  targetingMode: yup
    .mixed<'RFV' | 'AUDIENCE' | 'CUSTOMER_LIST'>()
    .oneOf(['RFV', 'AUDIENCE', 'CUSTOMER_LIST'])
    .default('RFV'),
  segmentation: yup.array().when('targetingMode', {
    is: (mode: string) => mode === 'RFV',
    then: (schema) =>
      schema.min(1, 'Informe ao menos 1 segmento').required('Informe os segmentos do disparo'),
    otherwise: (schema) => schema.optional(),
  }),
  audienceId: yup.string().when('targetingMode', {
    is: (mode: string) => mode === 'AUDIENCE',
    then: (schema) => schema.required('Selecione uma audiência'),
    otherwise: (schema) => schema.nullable().optional(),
  }),
  customSendListId: yup.string().when('targetingMode', {
    is: (mode: string) => mode === 'CUSTOMER_LIST',
    then: (schema) => schema.required('Selecione uma lista personalizada'),
    otherwise: (schema) => schema.nullable().optional(),
  }),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }

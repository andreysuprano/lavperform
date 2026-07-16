import * as yup from 'yup'

import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_IN_MB,
} from '../ScheduledDispatchList/constants'

const schema = yup.object({
  name: yup.string().required('Informe o título do disparo'),
  scheduledDate: yup
    .date()
    .min(new Date(), 'A data não pode ser no passado')
    .required('Informe a data e hora do disparo'),
  messageText: yup.string().required('Informe a mensagem do disparo'),
  imageUrl: yup
    .mixed()
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
  segmentation: yup
    .array()
    .min(1, 'Informe ao menos 1 segmento')
    .required('Informe os segmentos do disparo'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }

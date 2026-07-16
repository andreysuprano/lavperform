import * as yup from 'yup'

import { timeRegex } from '@/utils/regex/time'

const dayScheduleSchema = yup.object().shape({
  dayOfWeek: yup.string().required(),
  isOpen: yup.boolean().required(),
  openTime: yup.string().when('isOpen', {
    is: true,
    then: (schema) =>
      schema
        .required('Obrigatório')
        .matches(timeRegex, 'HH:MM inválido')
        .max(5, 'Máx. 5'),
    otherwise: (schema) => schema.notRequired().nullable(),
  }),
  closeTime: yup.string().when('isOpen', {
    is: true,
    then: (schema) =>
      schema
        .required('Obrigatório')
        .matches(timeRegex, 'HH:MM inválido')
        .max(5, 'Máx. 5')
        .test(
          'is-after-start',
          'O fim deve ser após o início',
          function (value) {
            const { openTime, isOpen } = this.parent
            if (
              !isOpen ||
              !openTime ||
              !value ||
              !timeRegex.test(openTime) ||
              !timeRegex.test(value)
            ) {
              return true
            }
            return value > openTime
          }
        ),
    otherwise: (schema) => schema.notRequired().nullable(),
  }),
})

const schema = yup.object().shape({
  operatingDays: yup.array().of(dayScheduleSchema).required(),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }

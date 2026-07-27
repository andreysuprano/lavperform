import * as yup from 'yup'

import type { SendScheduleMode } from './sendSchedule.utils'

const HH_MM_OR_HH_MM_SS = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

function isValidTimeInput(value?: string | null): boolean {
  if (!value || !String(value).trim()) return false
  return HH_MM_OR_HH_MM_SS.test(String(value).trim())
}

export const sendScheduleModeYupField = yup
  .mixed<SendScheduleMode>()
  .oneOf(['establishment', 'fixed', 'range'])
  .default('establishment')

export const sendTimeStartYupField = yup.string().when('sendScheduleMode', {
  is: (mode: SendScheduleMode) => mode === 'fixed' || mode === 'range',
  then: (schema) =>
    schema
      .required('Informe o horário de início')
      .test(
        'is-hhmm',
        'Informe o horário no formato HH:mm',
        (value) => isValidTimeInput(value),
      ),
  otherwise: (schema) => schema.optional(),
})

export const sendTimeEndYupField = yup.string().when('sendScheduleMode', {
  is: (mode: SendScheduleMode) => mode === 'range',
  then: (schema) =>
    schema
      .required('Informe o horário de fim')
      .test(
        'is-hhmm',
        'Informe o horário no formato HH:mm',
        (value) => isValidTimeInput(value),
      )
      .test(
        'is-valid-range',
        'O horário de fim deve ser diferente do horário de início',
        function (value) {
          const { sendTimeStart, sendScheduleMode } = this.parent as {
            sendTimeStart?: string
            sendScheduleMode?: SendScheduleMode
          }

          if (sendScheduleMode !== 'range' || !sendTimeStart || !value) {
            return true
          }

          return value.slice(0, 5) !== sendTimeStart.slice(0, 5)
        },
      ),
  otherwise: (schema) => schema.optional(),
})

export const sendScheduleYupFields = {
  sendScheduleMode: sendScheduleModeYupField,
  sendTimeStart: sendTimeStartYupField,
  sendTimeEnd: sendTimeEndYupField,
}

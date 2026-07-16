import * as yup from 'yup'

import type { SendScheduleMode } from './sendSchedule.utils'

export const sendScheduleModeYupField = yup
  .mixed<SendScheduleMode>()
  .oneOf(['establishment', 'fixed', 'range'])
  .default('establishment')

export const sendTimeStartYupField = yup.string().when('sendScheduleMode', {
  is: (mode: SendScheduleMode) => mode === 'fixed' || mode === 'range',
  then: (schema) => schema.required('Informe o horário de início'),
  otherwise: (schema) => schema.optional(),
})

export const sendTimeEndYupField = yup.string().when('sendScheduleMode', {
  is: (mode: SendScheduleMode) => mode === 'range',
  then: (schema) =>
    schema
      .required('Informe o horário de fim')
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

          return value !== sendTimeStart
        },
      ),
  otherwise: (schema) => schema.optional(),
})

export const sendScheduleYupFields = {
  sendScheduleMode: sendScheduleModeYupField,
  sendTimeStart: sendTimeStartYupField,
  sendTimeEnd: sendTimeEndYupField,
}

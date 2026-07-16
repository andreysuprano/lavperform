import * as yup from 'yup'

export const couponTypeValues = ['desconto', 'frete'] as const
export const discountUnitValues = ['reais', 'porcentagem'] as const
export const shippingUnitValues = ['km'] as const

const todayStart = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const baseShape = {
  code: yup
    .string()
    .required('Informe o código do cupom')
    .trim()
    .max(64, 'Código muito longo'),
  description: yup
    .string()
    .required('Informe a descrição')
    .trim()
    .max(500, 'Descrição muito longa'),
  type: yup
    .string()
    .oneOf(couponTypeValues, 'Selecione o tipo de benefício')
    .required(),
  unit: yup
    .string()
    .required('Selecione a unidade')
    .when('type', {
      is: 'desconto',
      then: (s) => s.oneOf(discountUnitValues, 'Unidade inválida para desconto'),
      otherwise: (s) => s.oneOf(shippingUnitValues, 'Unidade inválida para frete'),
    }),
  value: yup
    .number()
    .transform((v, o) =>
      o === '' || o == null || Number.isNaN(Number(v)) ? undefined : Number(v)
    )
    .required('Informe o valor')
    .test('by-unit', 'Valor inválido', function (v) {
      if (v == null || Number.isNaN(v)) return false
      const { unit } = this.parent
      if (unit === 'porcentagem' && (v < 1 || v > 100)) {
        return this.createError({ message: 'Informe entre 1% e 100%' })
      }
      if (unit === 'reais' && v < 0.01) {
        return this.createError({ message: 'Mínimo R$ 0,01' })
      }
      if (unit === 'km' && (!Number.isInteger(v) || v < 1)) {
        return this.createError({ message: 'Mínimo 1 km (número inteiro)' })
      }
      return true
    }),
  active: yup.boolean().default(true).required(),
}

export const schema = yup.object().shape({
  ...baseShape,
  validUntil: yup
    .string()
    .required('Informe a data de término da validade')
    .test('not-past', 'A data de término não pode ser no passado', (val) => {
      if (!val) return false
      return new Date(`${val}T00:00:00`).getTime() >= todayStart()
    }),
})

/** Schema para edição: não revalida se a data está no passado (cupom já existe). */
export const editSchema = yup.object().shape({
  ...baseShape,
  validUntil: yup.string().required('Informe a data de término da validade'),
})

export type FormData = yup.InferType<typeof schema>

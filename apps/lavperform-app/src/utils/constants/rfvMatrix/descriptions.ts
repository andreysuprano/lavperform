import type { RfvMatrixData } from '@/types'

export const RFV_SEGMENT_DESCRIPTIONS: Record<keyof RfvMatrixData, string> = {
  campeao:
    'Clientes com alta recência, alta frequência e alto valor monetário. São seus melhores clientes e merecem atenção especial.',
  fiel:
    'Clientes com alta frequência e alto valor, mas recência média. Mantêm relacionamento constante com seu negócio.',
  em_potencial:
    'Clientes com frequência e valor médios, mas com potencial de crescimento. Podem se tornar fiéis com estratégias adequadas.',
  novo:
    'Clientes novos com pouca frequência ainda, mas com potencial. Requerem ações de onboarding e engajamento.',
  promissor:
    'Clientes com baixa recência mas com potencial de valor. Podem se tornar importantes com ações de reativação.',
  precisa_de_atencao:
    'Clientes que estão diminuindo sua frequência ou valor. Requerem ações preventivas para evitar perda.',
  quase_dormente:
    'Clientes que estão quase inativos, com baixa frequência e recência. Necessitam de campanhas de reativação urgentes.',
  nao_posso_perder:
    'Clientes de alto valor que estão em risco de sair. Requerem ações imediatas de retenção.',
  em_risco:
    'Clientes que estão diminuindo seu engajamento. Precisam de atenção para evitar perda total.',
  hibernando:
    'Clientes inativos há muito tempo, mas que ainda podem ser recuperados com estratégias adequadas.',
  perdido:
    'Clientes que provavelmente não retornarão. Podem ser alvos de campanhas de reativação, mas com expectativas baixas.',
  lead:
    'Clientes cadastrados que ainda não realizaram nenhuma venda. Requerem ações de conversão e primeiro contato.',
}

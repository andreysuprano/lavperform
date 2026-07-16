import { createListCollection } from '@chakra-ui/react'

export enum ClientTypes {
  Campeao = 'campeao',
  EmPotencial = 'em_potencial',
  EmRisco = 'em_risco',
  Fiel = 'fiel',
  Hibernando = 'hibernando',
  NaoPossoPerder = 'nao_posso_perder',
  Novo = 'novo',
  Perdido = 'perdido',
  PrecisaDeAtencao = 'precisa_de_atencao',
  Promissor = 'promissor',
  QuaseDormente = 'quase_dormente',
}

export const clientTypesOptions = createListCollection({
  items: [
    { value: ClientTypes.Campeao, label: 'Campeão' },
    { value: ClientTypes.EmPotencial, label: 'Em Potencial' },
    { value: ClientTypes.EmRisco, label: 'Em Risco' },
    { value: ClientTypes.Fiel, label: 'Fiel' },
    { value: ClientTypes.Hibernando, label: 'Hibernando' },
    { value: ClientTypes.NaoPossoPerder, label: 'Não Posso Perder' },
    { value: ClientTypes.Novo, label: 'Novo' },
    { value: ClientTypes.Perdido, label: 'Perdido' },
    { value: ClientTypes.PrecisaDeAtencao, label: 'Precisa de Atenção' },
    { value: ClientTypes.Promissor, label: 'Promissor' },
    { value: ClientTypes.QuaseDormente, label: 'Quase Dormente' },
  ],
})

export enum ClientTypes {
    Campeao = 'campeao',
    Fiel = 'fiel',
    EmPotencial = 'em_potencial',
    Novo = 'novo',
    Promissor = 'promissor',
    PrecisaDeAtencao = 'precisa_de_atencao',
    QuaseDormente = 'quase_dormente',
    NaoPossoPerder = 'nao_posso_perder',
    EmRisco = 'em_risco',
    Hibernando = 'hibernando',
    Perdido = 'perdido',
}

/** Todas as classificações da matriz RFV (uma configuração por segmento). */
/** Categoria virtual para clientes sem pedidos (fora da matriz RFV). */
export const LEAD_SEGMENTATION = 'lead';
export const LEAD_LABEL = 'Leads';
export const LEAD_ICON = '📋';

export const ALL_RFV_CLASSIFICATIONS: ClientTypes[] = [
    ClientTypes.Campeao,
    ClientTypes.Fiel,
    ClientTypes.EmPotencial,
    ClientTypes.Novo,
    ClientTypes.Promissor,
    ClientTypes.PrecisaDeAtencao,
    ClientTypes.QuaseDormente,
    ClientTypes.NaoPossoPerder,
    ClientTypes.EmRisco,
    ClientTypes.Hibernando,
    ClientTypes.Perdido,
];

export const DEFAULT_CONVERSION_WINDOW_DAYS = 7;

export const ClientLabels: Record<ClientTypes, string> = {
    [ClientTypes.Campeao]: 'Campeões',
    [ClientTypes.Fiel]: 'Clientes Fiéis',
    [ClientTypes.EmPotencial]: 'Fiéis em Potencial',
    [ClientTypes.Novo]: 'Novos Clientes',
    [ClientTypes.Promissor]: 'Clientes Promissores',
    [ClientTypes.PrecisaDeAtencao]: 'Precisam de Atenção',
    [ClientTypes.QuaseDormente]: 'Quase Dormentes',
    [ClientTypes.NaoPossoPerder]: 'Não Posso Perder',
    [ClientTypes.EmRisco]: 'Em Risco',
    [ClientTypes.Hibernando]: 'Hibernando',
    [ClientTypes.Perdido]: 'Perdidos',
};

export enum ClientIcons {
    'campeao' = '🏆',
    'fiel' = '🤝',
    'em_potencial' = '🚀',
    'novo' = '🆕',
    'promissor' = '🌟',
    'precisa_de_atencao' = '👀',
    'quase_dormente' = '😴',
    'nao_posso_perder' = '❤️',
    'em_risco' = '⚠️',
    'hibernando' = '🐻',
    'perdido' = '💔',
}

export function getIconBySegmentation(segmentation: ClientTypes) {
    return ClientIcons[segmentation];
}

export function getLabelBySegmentation(segmentation: ClientTypes) {
    return ClientLabels[segmentation];
}

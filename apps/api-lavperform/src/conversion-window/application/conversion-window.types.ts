/** Mapa classificação RFV (chaves em camelCase) → dias de janela de conversão (threshold). */
export type ConversionWindowThresholdMap = Record<string, number>;

export type ConversionWindowSegmentDto = {
    rfvClassification: string;
    thresholdDays: number;
};

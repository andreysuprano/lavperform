export interface CustomerRfvMetrics {
    daysSinceLastOrder: number;
    totalOrders: number;
    averageTicket: number;
}

export interface CalibratedThresholds {
    recencyThresholds: number[];
    frequencyThresholds: number[];
    monetaryThresholds: number[];
}

const DEFAULT_RECENCY_THRESHOLDS = [14, 30, 60, 90];
const DEFAULT_FREQUENCY_THRESHOLDS = [4, 8, 15, 25];
const DEFAULT_MONETARY_THRESHOLDS = [30, 50, 70, 100];

// Amostra mínima de clientes com pedidos para confiar nos quantis; abaixo disso usa defaults.
const MIN_SAMPLE_SIZE = 5;

// Percentis que dividem a base em 5 faixas de tamanho aproximadamente igual (scores 1-5).
const QUANTILES = [0.2, 0.4, 0.6, 0.8];

function quantile(sortedAsc: number[], q: number): number {
    if (sortedAsc.length === 0) return 0;
    if (sortedAsc.length === 1) return sortedAsc[0];

    const pos = (sortedAsc.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    const next = sortedAsc[base + 1];
    if (next !== undefined) {
        return sortedAsc[base] + rest * (next - sortedAsc[base]);
    }
    return sortedAsc[base];
}

function ensureStrictlyIncreasing(values: number[], integer: boolean): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
        let value = integer
            ? Math.round(values[i])
            : Math.round(values[i] * 100) / 100;

        if (i > 0 && value <= result[i - 1]) {
            value = integer
                ? result[i - 1] + 1
                : Math.round((result[i - 1] + 0.01) * 100) / 100;
        }

        result.push(value);
    }

    return result;
}

function calibrateDimension(
    values: number[],
    defaults: number[],
    integer: boolean,
): number[] {
    const clean = values
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);

    if (clean.length < MIN_SAMPLE_SIZE) {
        return defaults;
    }

    const raw = QUANTILES.map((q) => quantile(clean, q));
    const adjusted = ensureStrictlyIncreasing(raw, integer);

    // Distribuição degenerada (ex.: todos os valores iguais a zero) → mantém defaults.
    if (adjusted.every((value) => value === 0)) {
        return defaults;
    }

    return adjusted;
}

/**
 * Deriva os thresholds RFV a partir da distribuição real dos clientes.
 * Recência usa dias (inteiro), Frequência usa nº de pedidos (inteiro) e
 * Monetário usa ticket médio (decimal, 2 casas).
 */
export function calibrateRfvThresholds(
    metrics: CustomerRfvMetrics[],
): CalibratedThresholds {
    return {
        recencyThresholds: calibrateDimension(
            metrics.map((m) => m.daysSinceLastOrder),
            DEFAULT_RECENCY_THRESHOLDS,
            true,
        ),
        frequencyThresholds: calibrateDimension(
            metrics.map((m) => m.totalOrders),
            DEFAULT_FREQUENCY_THRESHOLDS,
            true,
        ),
        monetaryThresholds: calibrateDimension(
            metrics.map((m) => m.averageTicket),
            DEFAULT_MONETARY_THRESHOLDS,
            false,
        ),
    };
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class RecencyStrategy {
    calculateScore(daysSinceLastOrder: number, thresholds: number[]): number {
        // Se daysSinceLastOrder for null, undefined ou negativo, retorna score mínimo
        if (daysSinceLastOrder == null || daysSinceLastOrder < 0) {
            return 1;
        }

        const sortedThresholds = [...thresholds].sort((a, b) => a - b);

        // Score 5: Muito recente (0 a X dias)
        if (daysSinceLastOrder <= sortedThresholds[0]) {
            return 5;
        } else if (daysSinceLastOrder <= sortedThresholds[1]) {
            return 4;
        } else if (daysSinceLastOrder <= sortedThresholds[2]) {
            return 3;
        } else if (daysSinceLastOrder <= sortedThresholds[3]) {
            return 2;
        } else {
            // Score 1: Inativo (mais de Y dias)
            return 1;
        }
    }
}

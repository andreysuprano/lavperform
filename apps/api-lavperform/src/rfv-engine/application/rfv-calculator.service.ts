import { Injectable } from '@nestjs/common';
import { RecencyStrategy } from '../infrastructure/strategies/recency.strategy';
import { FrequencyStrategy } from '../infrastructure/strategies/frequency.strategy';
import { MonetaryStrategy } from '../infrastructure/strategies/monetary.strategy';
import { getSegmentFromRfvKey } from '../infrastructure/strategies/segmentation-matrix';
import { RfvScore } from '../domain/rfv-score.entity';
import { IRfvCalculation } from '../domain/rfv-calculation.interface';

@Injectable()
export class RfvCalculatorService implements IRfvCalculation {
    constructor(
        private readonly recencyStrategy: RecencyStrategy,
        private readonly frequencyStrategy: FrequencyStrategy,
        private readonly monetaryStrategy: MonetaryStrategy,
    ) {}

    calculateRecencyScore(daysSinceLastOrder: number, thresholds: number[]): number {
        return this.recencyStrategy.calculateScore(daysSinceLastOrder, thresholds);
    }

    calculateFrequencyScore(totalOrders: number, thresholds: number[]): number {
        return this.frequencyStrategy.calculateScore(totalOrders, thresholds);
    }

    calculateMonetaryScore(averageTicket: number, thresholds: number[]): number {
        return this.monetaryStrategy.calculateScore(averageTicket, thresholds);
    }

    determineSegment(rfvScore: RfvScore): string {
        const rfvKey = rfvScore.getRfvKey();
        return getSegmentFromRfvKey(rfvKey);
    }
}

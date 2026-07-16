import { RfvScore } from './rfv-score.entity';
import { RfvConfiguration } from './rfv-configuration.entity';

export interface IRfvCalculation {
    calculateRecencyScore(daysSinceLastOrder: number, thresholds: number[]): number;
    calculateFrequencyScore(totalOrders: number, thresholds: number[]): number;
    calculateMonetaryScore(averageTicket: number, thresholds: number[]): number;
    determineSegment(rfvScore: RfvScore): string;
}

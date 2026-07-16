import { Injectable } from '@nestjs/common';

@Injectable()
export class MonetaryStrategy {
    calculateScore(averageTicket: number, thresholds: number[]): number {
        if (!averageTicket || averageTicket < 0) {
            return 1;
        }

        const sortedThresholds = [...thresholds].sort((a, b) => a - b);

        if (averageTicket >= sortedThresholds[3]) {
            return 5;
        } else if (averageTicket >= sortedThresholds[2]) {
            return 4;
        } else if (averageTicket >= sortedThresholds[1]) {
            return 3;
        } else if (averageTicket >= sortedThresholds[0]) {
            return 2;
        } else {
            return 1;
        }
    }
}

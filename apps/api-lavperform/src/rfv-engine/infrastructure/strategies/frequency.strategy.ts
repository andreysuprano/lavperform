import { Injectable } from '@nestjs/common';

@Injectable()
export class FrequencyStrategy {
    calculateScore(totalOrders: number, thresholds: number[]): number {
        if (!totalOrders || totalOrders < 0) {
            return 1;
        }

        const sortedThresholds = [...thresholds].sort((a, b) => a - b);

        if (totalOrders >= sortedThresholds[3]) {
            return 5;
        } else if (totalOrders >= sortedThresholds[2]) {
            return 4;
        } else if (totalOrders >= sortedThresholds[1]) {
            return 3;
        } else if (totalOrders >= sortedThresholds[0]) {
            return 2;
        } else {
            return 1;
        }
    }
}

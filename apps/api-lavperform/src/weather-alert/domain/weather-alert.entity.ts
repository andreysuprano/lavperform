import { WeatherAlertMessages } from './weather-alert-messages.constants';

export enum WeatherCondition {
    SUNNY = 'SUNNY',
    CLOUDY = 'CLOUDY',
    RAINING = 'RAINING',
    COLD = 'COLD',
}

export class WeatherAlert {
    id: string;
    companyId: string;
    condition: WeatherCondition;
    daysOfWeek: string[];
    dailyAlerts: number;
    giftId?: string;
    messages?: Partial<WeatherAlertMessages>;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    company?: any;

    constructor(partial: Partial<WeatherAlert>) {
        Object.assign(this, partial);
    }
}

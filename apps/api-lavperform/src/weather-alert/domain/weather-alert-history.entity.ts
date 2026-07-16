import { WeatherCondition } from './weather-alert.entity';

export class WeatherAlertHistory {
    id: string;
    companyId: string;
    condition: WeatherCondition;
    tempC: number;
    tempF: number;
    messagesSent: number;
    sentAt: Date;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    company?: any;
    messages?: any[];

    constructor(partial: Partial<WeatherAlertHistory>) {
        Object.assign(this, partial);
    }
}

export class WeatherData {
    id: string;
    cityName: string;
    
    // Location data
    region: string;
    country: string;
    lat: number;
    lon: number;
    tzId: string;
    localtimeEpoch: number;
    localtime: string;
    
    // Current weather data
    lastUpdatedEpoch: number;
    lastUpdated: string;
    tempC: number;
    tempF: number;
    isDay: number;
    
    // Condition
    conditionText: string;
    conditionIcon: string;
    conditionCode: number;
    
    // Wind
    windMph: number;
    windKph: number;
    windDegree: number;
    windDir: string;
    
    // Pressure and precipitation
    pressureMb: number;
    pressureIn: number;
    precipMm: number;
    precipIn: number;
    
    // Other metrics
    humidity: number;
    cloud: number;
    feelslikeC: number;
    feelslikeF: number;
    windchillC: number;
    windchillF: number;
    heatindexC: number;
    heatindexF: number;
    dewpointC: number;
    dewpointF: number;
    visKm: number;
    visMiles: number;
    uv: number;
    gustMph: number;
    gustKph: number;
    shortRad: number;
    diffRad: number;
    dni: number;
    gti: number;
    
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<WeatherData>) {
        Object.assign(this, partial);
    }
}

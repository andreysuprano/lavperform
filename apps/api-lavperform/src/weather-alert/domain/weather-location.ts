import { normalizeString } from '../../common/utils/normalize-string';

export type WeatherLocationInput = {
    city: string;
    state?: string | null;
    zipCode?: string | null;
};

function emptyToUndefined(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function buildLocationKey(city: string, state?: string | null): string {
    const cityKey = normalizeString(city).toLowerCase();
    const stateKey = emptyToUndefined(state)
        ? normalizeString(state as string).toLowerCase()
        : '';
    return `${cityKey}|${stateKey}`;
}

export function buildTextWeatherQuery(input: WeatherLocationInput): string {
    const city = normalizeString(input.city);
    const state = emptyToUndefined(input.state)
        ? normalizeString(input.state as string).toUpperCase()
        : undefined;

    if (!state) {
        return city;
    }

    return `${city}, ${state}, Brazil`;
}

export function buildCoordinateQuery(lat: number, lon: number): string {
    return `${lat},${lon}`;
}

export function digitsOnlyCep(zipCode?: string | null): string {
    return (zipCode ?? '').replace(/\D/g, '');
}

export function isValidBrazilianCep(zipCode?: string | null): boolean {
    return digitsOnlyCep(zipCode).length === 8;
}

export function collectUniqueWeatherLocations(
    addresses: Array<{ city?: string | null; state?: string | null; zipCode?: string | null }>,
): WeatherLocationInput[] {
    const locations = new Map<string, WeatherLocationInput>();

    for (const address of addresses) {
        const city = address.city?.trim();
        if (!city) {
            continue;
        }

        const state = address.state ?? null;
        const zipCode = isValidBrazilianCep(address.zipCode) ? address.zipCode : null;
        const locationKey = buildLocationKey(city, state);
        const existing = locations.get(locationKey);

        if (!existing) {
            locations.set(locationKey, { city, state, zipCode });
            continue;
        }

        if (!existing.zipCode && zipCode) {
            existing.zipCode = zipCode;
        }
    }

    return Array.from(locations.values());
}

export function parseBrasilApiCoordinates(payload: unknown): { lat: number; lon: number } | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const location = (payload as { location?: { coordinates?: unknown } }).location;
    const coordinates = location?.coordinates;
    if (!coordinates) {
        return null;
    }

    if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const lon = Number(coordinates[0]);
        const lat = Number(coordinates[1]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon };
        }
        return null;
    }

    if (typeof coordinates === 'object') {
        const lon = Number((coordinates as { longitude?: unknown }).longitude);
        const lat = Number((coordinates as { latitude?: unknown }).latitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon };
        }
    }

    return null;
}

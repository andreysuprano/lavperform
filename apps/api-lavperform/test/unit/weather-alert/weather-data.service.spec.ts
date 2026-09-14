import { WeatherDataService } from 'src/weather-alert/application/weather-data.service';

describe('WeatherDataService', () => {
  const weatherDataRepository = {
    upsertByLocationKey: jest.fn(),
    findByLocationKey: jest.fn(),
  };
  const weatherApiService = {
    getCurrentWeather: jest.fn(),
  };
  const cepGeocodeService = {
    resolveCoordinates: jest.fn(),
  };

  let service: WeatherDataService;

  const apiResponse = {
    location: {
      name: 'Parnaiba',
      region: 'Piaui',
      country: 'Brazil',
      lat: -2.9,
      lon: -41.77,
      tz_id: 'America/Fortaleza',
      localtime_epoch: 1,
      localtime: '2026-09-14 10:00',
    },
    current: {
      last_updated_epoch: 1,
      last_updated: '2026-09-14 10:00',
      temp_c: 32,
      temp_f: 90,
      is_day: 1,
      condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/sunny.png', code: 1000 },
      wind_mph: 1,
      wind_kph: 2,
      wind_degree: 90,
      wind_dir: 'E',
      pressure_mb: 1010,
      pressure_in: 30,
      precip_mm: 0,
      precip_in: 0,
      humidity: 50,
      cloud: 10,
      feelslike_c: 33,
      feelslike_f: 91,
      windchill_c: 32,
      windchill_f: 90,
      heatindex_c: 34,
      heatindex_f: 93,
      dewpoint_c: 20,
      dewpoint_f: 68,
      vis_km: 10,
      vis_miles: 6,
      uv: 8,
      gust_mph: 3,
      gust_kph: 5,
      short_rad: 0,
      diff_rad: 0,
      dni: 0,
      gti: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    weatherApiService.getCurrentWeather.mockResolvedValue(apiResponse);
    weatherDataRepository.upsertByLocationKey.mockResolvedValue({});
    service = new WeatherDataService(
      weatherDataRepository as any,
      weatherApiService as any,
      cepGeocodeService as any,
    );
  });

  it('consulta WeatherAPI por lat,lon quando o CEP geocodifica', async () => {
    cepGeocodeService.resolveCoordinates.mockResolvedValue({ lat: -2.9, lon: -41.77 });

    await service.fetchAndUpdateWeatherData({
      city: 'Parnaíba',
      state: 'PI',
      zipCode: '64200-000',
    });

    expect(cepGeocodeService.resolveCoordinates).toHaveBeenCalledWith('64200-000');
    expect(weatherApiService.getCurrentWeather).toHaveBeenCalledWith('-2.9,-41.77');
    expect(weatherApiService.getCurrentWeather).not.toHaveBeenCalledWith(
      expect.stringContaining('64200'),
    );
    expect(weatherDataRepository.upsertByLocationKey).toHaveBeenCalledWith(
      'parnaiba|pi',
      expect.objectContaining({
        locationKey: 'parnaiba|pi',
        cityName: 'Parnaiba',
        state: 'PI',
      }),
    );
  });

  it('usa query textual quando o geocode do CEP falha', async () => {
    cepGeocodeService.resolveCoordinates.mockResolvedValue(null);

    await service.fetchAndUpdateWeatherData({
      city: 'Parnaíba',
      state: 'PI',
      zipCode: '64200-000',
    });

    expect(weatherApiService.getCurrentWeather).toHaveBeenCalledWith('Parnaiba, PI, Brazil');
  });

  it('cai para cidade, UF quando a query por coordenada falha', async () => {
    cepGeocodeService.resolveCoordinates.mockResolvedValue({ lat: -2.9, lon: -41.77 });
    weatherApiService.getCurrentWeather
      .mockRejectedValueOnce(new Error('coord fail'))
      .mockResolvedValueOnce(apiResponse);

    await service.fetchAndUpdateWeatherData({
      city: 'Parnaíba',
      state: 'PI',
      zipCode: '64200-000',
    });

    expect(weatherApiService.getCurrentWeather).toHaveBeenNthCalledWith(1, '-2.9,-41.77');
    expect(weatherApiService.getCurrentWeather).toHaveBeenNthCalledWith(
      2,
      'Parnaiba, PI, Brazil',
    );
  });
});

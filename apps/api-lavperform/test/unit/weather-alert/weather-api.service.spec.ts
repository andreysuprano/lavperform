import { of } from 'rxjs';
import { WeatherApiService } from 'src/weather-alert/infrastructure/api/weather-api.service';

describe('WeatherApiService', () => {
  const httpService = {
    get: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'WEATHER_API_KEY') return 'test-key';
      if (key === 'WEATHER_API_URL') return 'https://api.weatherapi.com/v1';
      return '';
    }),
  };

  let service: WeatherApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    httpService.get.mockReturnValue(of({ data: { location: { name: 'Parnaiba' } } }));
    service = new WeatherApiService(httpService as any, configService as any);
  });

  it('envia a query montada sem tratar CEP como q', async () => {
    await service.getCurrentWeather('-2.9,-41.77');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.weatherapi.com/v1/current.json',
      { params: { q: '-2.9,-41.77', key: 'test-key' } },
    );
  });

  it('envia query textual cidade, UF, Brazil', async () => {
    await service.getCurrentWeather('Parnaiba, PI, Brazil');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.weatherapi.com/v1/current.json',
      { params: { q: 'Parnaiba, PI, Brazil', key: 'test-key' } },
    );
  });
});

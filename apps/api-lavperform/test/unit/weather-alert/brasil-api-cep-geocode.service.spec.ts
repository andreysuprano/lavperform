import { of, throwError } from 'rxjs';
import { BrasilApiCepGeocodeService } from 'src/weather-alert/infrastructure/api/brasil-api-cep-geocode.service';

describe('BrasilApiCepGeocodeService', () => {
  const httpService = {
    get: jest.fn(),
  };

  let service: BrasilApiCepGeocodeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrasilApiCepGeocodeService(httpService as any);
  });

  it('retorna coordenadas no sucesso da BrasilAPI v2', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          location: {
            coordinates: { longitude: '-41.7767', latitude: '-2.9058' },
          },
        },
      }),
    );

    await expect(service.resolveCoordinates('64200-000')).resolves.toEqual({
      lat: -2.9058,
      lon: -41.7767,
    });
    expect(httpService.get).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cep/v2/64200000',
    );
  });

  it('retorna null em 404', async () => {
    httpService.get.mockReturnValue(throwError(() => ({ status: 404, message: 'not found' })));

    await expect(service.resolveCoordinates('00000000')).resolves.toBeNull();
  });

  it('retorna null sem coordinates no payload', async () => {
    httpService.get.mockReturnValue(of({ data: { city: 'Parnaíba' } }));

    await expect(service.resolveCoordinates('64200000')).resolves.toBeNull();
  });

  it('não chama a API quando o CEP é inválido', async () => {
    await expect(service.resolveCoordinates('123')).resolves.toBeNull();
    expect(httpService.get).not.toHaveBeenCalled();
  });
});

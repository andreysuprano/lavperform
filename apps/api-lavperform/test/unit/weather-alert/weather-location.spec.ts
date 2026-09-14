import {
  buildCoordinateQuery,
  buildLocationKey,
  buildTextWeatherQuery,
  collectUniqueWeatherLocations,
  parseBrasilApiCoordinates,
} from 'src/weather-alert/domain/weather-location';

describe('weather-location', () => {
  describe('buildLocationKey', () => {
    it('normaliza cidade e UF em minúsculas sem acento', () => {
      expect(buildLocationKey('Parnaíba', 'pi')).toBe('parnaiba|pi');
      expect(buildLocationKey('PARNAIBA', 'PI')).toBe('parnaiba|pi');
      expect(buildLocationKey('parnaíba', 'Pi')).toBe('parnaiba|pi');
    });

    it('mantém chave só com cidade quando UF está vazia', () => {
      expect(buildLocationKey('Parnaíba', null)).toBe('parnaiba|');
      expect(buildLocationKey('Parnaíba', '  ')).toBe('parnaiba|');
    });
  });

  describe('buildTextWeatherQuery', () => {
    it('monta query com cidade, UF e Brazil', () => {
      expect(buildTextWeatherQuery({ city: 'Parnaíba', state: 'pi' })).toBe(
        'Parnaiba, PI, Brazil',
      );
    });

    it('usa só a cidade quando não há UF', () => {
      expect(buildTextWeatherQuery({ city: 'Parnaíba' })).toBe('Parnaiba');
      expect(buildTextWeatherQuery({ city: 'Parnaíba', state: null })).toBe(
        'Parnaiba',
      );
    });

    it('não inclui CEP brasileiro na query da WeatherAPI', () => {
      const query = buildTextWeatherQuery({
        city: 'Parnaíba',
        state: 'PI',
        zipCode: '64200-000',
      });

      expect(query).toBe('Parnaiba, PI, Brazil');
      expect(query).not.toContain('64200');
      expect(query).not.toContain('64200000');
    });
  });

  describe('buildCoordinateQuery', () => {
    it('monta q de coordenadas lat,lon', () => {
      expect(buildCoordinateQuery(-2.9, -41.77)).toBe('-2.9,-41.77');
    });
  });

  describe('parseBrasilApiCoordinates', () => {
    it('lê longitude/latitude em objeto', () => {
      expect(
        parseBrasilApiCoordinates({
          location: {
            coordinates: { longitude: '-41.7767', latitude: '-2.9058' },
          },
        }),
      ).toEqual({ lat: -2.9058, lon: -41.7767 });
    });

    it('lê array GeoJSON [lon, lat]', () => {
      expect(
        parseBrasilApiCoordinates({
          location: { coordinates: [-41.77, -2.9] },
        }),
      ).toEqual({ lat: -2.9, lon: -41.77 });
    });

    it('retorna null sem coordinates', () => {
      expect(parseBrasilApiCoordinates({})).toBeNull();
      expect(parseBrasilApiCoordinates({ location: {} })).toBeNull();
    });
  });

  describe('collectUniqueWeatherLocations', () => {
    it('agrupa por cidade+UF e reaproveita o primeiro CEP válido', () => {
      expect(
        collectUniqueWeatherLocations([
          { city: 'Parnaíba', state: 'PI', zipCode: '64200-000' },
          { city: 'Parnaiba', state: 'pi', zipCode: null },
          { city: 'Salvador', state: 'BA', zipCode: '40020-000' },
        ]),
      ).toEqual([
        { city: 'Parnaíba', state: 'PI', zipCode: '64200-000' },
        { city: 'Salvador', state: 'BA', zipCode: '40020-000' },
      ]);
    });

    it('preenche CEP depois se o primeiro endereço do grupo não tiver', () => {
      expect(
        collectUniqueWeatherLocations([
          { city: 'Parnaíba', state: 'PI', zipCode: null },
          { city: 'Parnaíba', state: 'PI', zipCode: '64200-000' },
        ]),
      ).toEqual([{ city: 'Parnaíba', state: 'PI', zipCode: '64200-000' }]);
    });
  });
});

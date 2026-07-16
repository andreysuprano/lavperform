import { resolveSendTimeWindow, normalizeSendScheduleFields } from 'src/automatic-campaign/application/campaign-send-schedule.utils';

describe('campaign-send-schedule.utils', () => {
  describe('resolveSendTimeWindow', () => {
    it('usa horário de funcionamento quando sendTimeStart não está definido', () => {
      const result = resolveSendTimeWindow(
        { sendTimeStart: null, sendTimeEnd: null },
        { openTime: '10:00', closeTime: '18:00', isOpen: true } as any,
      );

      expect(result).toEqual({
        openTime: '10:00',
        closeTime: '18:00',
        mode: 'random',
      });
    });

    it('retorna null quando estabelecimento está fechado e não há horário customizado', () => {
      const result = resolveSendTimeWindow(
        { sendTimeStart: null, sendTimeEnd: null },
        { openTime: '10:00', closeTime: '18:00', isOpen: false } as any,
      );

      expect(result).toBeNull();
    });

    it('retorna null quando não há horário de funcionamento e não há horário customizado', () => {
      expect(resolveSendTimeWindow({ sendTimeStart: null }, null)).toBeNull();
    });

    it('usa horário fixo quando apenas sendTimeStart está definido', () => {
      const result = resolveSendTimeWindow(
        { sendTimeStart: '14:00', sendTimeEnd: null },
        { isOpen: false } as any,
      );

      expect(result).toEqual({
        openTime: '14:00',
        closeTime: '14:00',
        mode: 'fixed',
      });
    });

    it('usa intervalo quando sendTimeStart e sendTimeEnd estão definidos', () => {
      const result = resolveSendTimeWindow(
        { sendTimeStart: '10:00', sendTimeEnd: '12:00' },
        null,
      );

      expect(result).toEqual({
        openTime: '10:00',
        closeTime: '12:00',
        mode: 'random',
      });
    });
  });

  describe('normalizeSendScheduleFields', () => {
    it('limpa ambos quando sendTimeStart ausente', () => {
      expect(normalizeSendScheduleFields(null, '12:00')).toEqual({
        sendTimeStart: null,
        sendTimeEnd: null,
      });
    });

    it('mantém sendTimeStart e normaliza sendTimeEnd para null', () => {
      expect(normalizeSendScheduleFields('14:00', undefined)).toEqual({
        sendTimeStart: '14:00',
        sendTimeEnd: null,
      });
    });
  });
});

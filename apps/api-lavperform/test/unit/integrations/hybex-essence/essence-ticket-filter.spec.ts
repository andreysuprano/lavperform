import {
  essenceTicketDateOnly,
  filterEssenceTicketsByDateRange,
} from '../../../../src/integrations/hybex-essence/api/essence-ticket-filter';
import { EssenceTicket } from '../../../../src/integrations/hybex-essence/api/essence.types';

describe('essence-ticket-filter', () => {
  it('filtra tickets pelo intervalo de datas', () => {
    const tickets: EssenceTicket[] = [
      { Sequencia: 1, DataCriacao: '2026-11-10 12:00:00.000000' },
      { Sequencia: 2, DataCriacao: '2026-11-11 08:00:00.000000' },
      { Sequencia: 3, DataCriacao: '2026-10-28 08:00:00.000000' },
    ];

    const filtered = filterEssenceTicketsByDateRange(
      tickets,
      '2026-11-01',
      '2026-11-16',
    );

    expect(filtered.map((t) => t.Sequencia)).toEqual([1, 2]);
    expect(essenceTicketDateOnly(tickets[0])).toBe('2026-11-10');
  });
});
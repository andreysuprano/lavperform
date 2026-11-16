import { EssenceTicket } from './essence.types';

export function essenceTicketDateOnly(ticket: EssenceTicket): string | null {
  const raw = ticket.DataCriacao?.trim();
  if (!raw || raw.length < 10) return null;
  return raw.slice(0, 10);
}

export function filterEssenceTicketsByDateRange(
  tickets: EssenceTicket[],
  startDate: string,
  endDate: string,
): EssenceTicket[] {
  return tickets.filter((ticket) => {
    const day = essenceTicketDateOnly(ticket);
    if (!day) return false;
    return day >= startDate && day <= endDate;
  });
}
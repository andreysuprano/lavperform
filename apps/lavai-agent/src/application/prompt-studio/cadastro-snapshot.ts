import { CADASTRO_KEYS } from './sheet-script';

export type OpeningHourRow = {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

export type CadastroSnapshot = {
  name: string | null;
  phone: string | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  openingHours: OpeningHourRow[];
};

export type CadastroPrompt = {
  key: string;
  mode: 'confirm' | 'ask';
  shownValue: string | null;
};

const HOURS_KEY_DAY: Record<string, { short: string; name: string }> = {
  hours_seg: { short: 'seg', name: 'segunda' },
  hours_ter: { short: 'ter', name: 'terca' },
  hours_qua: { short: 'qua', name: 'quarta' },
  hours_qui: { short: 'qui', name: 'quinta' },
  hours_sex: { short: 'sex', name: 'sexta' },
  hours_sab: { short: 'sab', name: 'sabado' },
  hours_dom: { short: 'dom', name: 'domingo' },
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

function formatAddress(address: CadastroSnapshot['address']): string | null {
  const parts: string[] = [];
  const streetParts = [address.street, address.number].filter((part) => !isBlank(part));
  if (streetParts.length > 0) {
    parts.push(streetParts.map((part) => part!.trim()).join(', '));
  }
  if (!isBlank(address.complement)) {
    parts.push(address.complement!.trim());
  }
  if (!isBlank(address.neighborhood)) {
    parts.push(address.neighborhood!.trim());
  }
  const city = !isBlank(address.city) ? address.city!.trim() : '';
  const state = !isBlank(address.state) ? address.state!.trim() : '';
  const cityState = [city, state].filter(Boolean).join(' - ');
  if (cityState) {
    parts.push(cityState);
  }
  if (!isBlank(address.zipCode)) {
    parts.push(address.zipCode!.trim());
  }
  return parts.length === 0 ? null : parts.join(', ');
}

function findOpeningHour(
  openingHours: OpeningHourRow[],
  short: string,
  name: string,
): OpeningHourRow | undefined {
  return openingHours.find((row) => {
    const normalized = stripAccents(row.dayOfWeek.toLowerCase().trim());
    return normalized.startsWith(short) || normalized.startsWith(name);
  });
}

function promptForKey(key: (typeof CADASTRO_KEYS)[number], snapshot: CadastroSnapshot): CadastroPrompt {
  if (key === 'name') {
    if (isBlank(snapshot.name)) {
      return { key, mode: 'ask', shownValue: null };
    }
    return { key, mode: 'confirm', shownValue: snapshot.name!.trim() };
  }
  if (key === 'phone') {
    if (isBlank(snapshot.phone)) {
      return { key, mode: 'ask', shownValue: null };
    }
    return { key, mode: 'confirm', shownValue: snapshot.phone!.trim() };
  }
  if (key === 'address') {
    const shownValue = formatAddress(snapshot.address);
    if (shownValue === null) {
      return { key, mode: 'ask', shownValue: null };
    }
    return { key, mode: 'confirm', shownValue };
  }

  const day = HOURS_KEY_DAY[key];
  if (!day) {
    return { key, mode: 'ask', shownValue: null };
  }
  const row = findOpeningHour(snapshot.openingHours, day.short, day.name);
  if (!row) {
    return { key, mode: 'ask', shownValue: null };
  }
  if (!row.isOpen) {
    return { key, mode: 'confirm', shownValue: 'Fechado' };
  }
  return { key, mode: 'confirm', shownValue: `${row.openTime} às ${row.closeTime}` };
}

export function cadastroPrompts(snapshot: CadastroSnapshot): CadastroPrompt[] {
  return CADASTRO_KEYS.map((key) => promptForKey(key, snapshot));
}

export function applyCadastroAnswer(
  current: string | null,
  answer: { kind: 'confirm' } | { kind: 'correct'; value: string },
): string {
  if (answer.kind === 'confirm') {
    return (current ?? '').trim();
  }
  return answer.value.trim();
}

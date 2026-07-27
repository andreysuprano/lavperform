import { OpeningHours } from '@prisma/client';
import {
  getFixedTimeInRange,
  getRandomTimeInRangeForOpeningHours,
} from '../../common/utils/date.utils';

export type SendTimeWindow = {
  openTime: string;
  closeTime: string;
  mode: 'fixed' | 'random';
};

export type CampaignSendScheduleInput = {
  sendTimeStart?: string | null;
  sendTimeEnd?: string | null;
};

export function resolveSendTimeWindow(
  campaign: CampaignSendScheduleInput,
  openingHours?: OpeningHours | null,
): SendTimeWindow | null {
  const { sendTimeStart, sendTimeEnd } = campaign;

  if (sendTimeStart) {
    if (sendTimeEnd) {
      return {
        openTime: sendTimeStart,
        closeTime: sendTimeEnd,
        mode: 'random',
      };
    }

    return {
      openTime: sendTimeStart,
      closeTime: sendTimeStart,
      mode: 'fixed',
    };
  }

  if (!openingHours || !openingHours.isOpen) {
    return null;
  }

  return {
    openTime: openingHours.openTime,
    closeTime: openingHours.closeTime,
    mode: 'random',
  };
}

/** Normaliza HH:mm ou HH:mm:ss para HH:mm. Retorna null se vazio. */
export function normalizeTimeToHHmm(value?: string | null): string | null {
  if (value == null || String(value).trim() === '') {
    return null;
  }

  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
  }

  return `${match[1]}:${match[2]}`;
}

export function normalizeSendScheduleFields(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null,
): { sendTimeStart: string | null; sendTimeEnd: string | null } {
  const normalizedStart = normalizeTimeToHHmm(sendTimeStart);

  if (!normalizedStart) {
    return { sendTimeStart: null, sendTimeEnd: null };
  }

  return {
    sendTimeStart: normalizedStart,
    sendTimeEnd: normalizeTimeToHHmm(sendTimeEnd),
  };
}

export function getScheduleDateForSendWindow(
  sendTimeWindow: SendTimeWindow,
  options?: { smsCutoff?: string },
): Date {
  let { openTime, closeTime, mode } = sendTimeWindow;

  if (options?.smsCutoff && closeTime > options.smsCutoff) {
    closeTime = options.smsCutoff;
  }

  if (mode === 'fixed') {
    return getFixedTimeInRange(openTime);
  }

  return getRandomTimeInRangeForOpeningHours(openTime, closeTime);
}

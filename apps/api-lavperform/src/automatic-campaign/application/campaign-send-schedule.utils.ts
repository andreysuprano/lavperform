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

export function normalizeSendScheduleFields(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null,
): { sendTimeStart: string | null; sendTimeEnd: string | null } {
  if (!sendTimeStart) {
    return { sendTimeStart: null, sendTimeEnd: null };
  }

  return {
    sendTimeStart,
    sendTimeEnd: sendTimeEnd ?? null,
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

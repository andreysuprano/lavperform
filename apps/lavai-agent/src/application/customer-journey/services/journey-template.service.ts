import { Injectable } from '@nestjs/common';

@Injectable()
export class JourneyTemplateService {
  render(
    template: string,
    vars: { nome?: string; telefone?: string },
  ): string {
    return template
      .replace(/\{nome\}/gi, vars.nome ?? 'Cliente')
      .replace(/\{telefone\}/gi, vars.telefone ?? '');
  }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function matchesHelpKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
    const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(lower);
  });
}

export function computeStepDelayMs(
  steps: Array<{ id: string; delayMinutes: number; delayFrom: string; active: boolean }>,
  stepIndex: number,
  journeyStartedAt: Date,
): number {
  const step = steps[stepIndex];
  if (!step?.active) return -1;

  let targetMs: number;
  if (step.delayFrom === 'JOURNEY_START') {
    targetMs = journeyStartedAt.getTime() + step.delayMinutes * 60_000;
  } else {
    let accumulated = journeyStartedAt.getTime();
    for (let i = 0; i <= stepIndex; i++) {
      const s = steps[i];
      if (!s?.active) continue;
      if (s.delayFrom === 'JOURNEY_START') {
        accumulated = journeyStartedAt.getTime() + s.delayMinutes * 60_000;
      } else {
        accumulated += s.delayMinutes * 60_000;
      }
    }
    targetMs = accumulated;
  }

  const delay = targetMs - Date.now();
  return Math.max(delay, 0);
}

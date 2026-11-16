export const PLAYGROUND_CHAT_PREFIX = 'playground:';
export const PLAYGROUND_PHONE = 'playground';
export const PLAYGROUND_UNAVAILABLE = 'O teste não está disponível.';
export const PLAYGROUND_FAILED = 'A resposta falhou.';
export const PLAYGROUND_HANDOFF =
  'Vou te encaminhar para um atendente. Em instantes alguém da equipe continua o atendimento com você.';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlaygroundSessionId(value: string): boolean {
  return UUID.test(value);
}

export function excludePlaygroundChats<T extends Record<string, unknown>>(where: T) {
  return {
    ...where,
    NOT: { chatId: { startsWith: PLAYGROUND_CHAT_PREFIX } },
  };
}

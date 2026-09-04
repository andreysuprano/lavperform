type ConnectionStateLike = {
  instance?: { owner?: string | null } | null;
  status?: { jid?: string | null } | null;
} | null;

/** Converte um JID da UAZAPI (`5511999990000:12@s.whatsapp.net`) nos dígitos do telefone. */
export function extractPhoneNumberFromJid(
  value?: string | null,
): string | null {
  if (!value) return null;

  const digits = value.split('@')[0].split(':')[0].replace(/\D/g, '');

  return digits.length > 0 ? digits : null;
}

/** Número da sessão conectada: `status.jid` e, na ausência dele, `instance.owner`. */
export function resolveConnectedPhoneNumber(
  state?: ConnectionStateLike,
): string | null {
  if (!state) return null;

  return (
    extractPhoneNumberFromJid(state.status?.jid) ??
    extractPhoneNumberFromJid(state.instance?.owner)
  );
}

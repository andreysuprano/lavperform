import Store from 'electron-store';
import { ClientSettings, DEFAULT_SETTINGS, DefaultSoundId } from '../shared/types';

const store = new Store<{ settings: ClientSettings }>({
  defaults: { settings: DEFAULT_SETTINGS },
});

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  );
}

export function normalizeApiUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '');
  normalized = normalized.replace(/\/attendant$/i, '');
  normalized = normalized.replace(/\/agents\/[0-9a-f-]+(?:\/help-requests.*)?$/i, '');
  normalized = normalized.replace(/\/help-requests.*$/i, '');

  if (!normalized) return normalized;

  try {
    const withProtocol =
      normalized.includes('://') ? normalized : `https://${normalized}`;
    const parsed = new URL(withProtocol);

    if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
      parsed.protocol = 'https:';
    }

    const path = parsed.pathname.replace(/\/+$/, '');
    normalized = path && path !== '/' ? `${parsed.origin}${path}` : parsed.origin;
  } catch {
    // mantém normalização por string se a URL for inválida
  }

  return normalized;
}

export function getSettings(): ClientSettings {
  const stored = store.get('settings');
  return { ...DEFAULT_SETTINGS, ...stored, apiUrl: normalizeApiUrl(stored.apiUrl ?? DEFAULT_SETTINGS.apiUrl) };
}

export function saveSettings(partial: Partial<ClientSettings>): ClientSettings {
  const current = getSettings();
  const next = {
    ...current,
    ...partial,
    ...(partial.apiUrl !== undefined ? { apiUrl: normalizeApiUrl(partial.apiUrl) } : {}),
  };
  store.set('settings', next);
  return next;
}

const DEFAULT_SOUND_FILES: Record<DefaultSoundId, string> = {
  default: 'notification-default.wav',
  soft: 'notification-soft.wav',
  'cliente-com-fome': 'cliente-com-fome.wav',
};

export function getDefaultSoundPath(name: DefaultSoundId): string {
  const { app } = require('electron') as typeof import('electron');
  const file = DEFAULT_SOUND_FILES[name];
  if (app.isPackaged) {
    return require('path').join(process.resourcesPath, 'sounds', file);
  }
  return require('path').join(app.getAppPath(), 'assets/sounds', file);
}

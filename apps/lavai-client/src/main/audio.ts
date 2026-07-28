import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';
import { Logger } from './logger';
import { getDefaultSoundPath, getSettings } from './settings-store';

const logger = new Logger('Audio');

const DEBOUNCE_MS = 2000;
const LOOP_INTERVAL_MS = 1000;

let lastPlayedAt = 0;
let loopActive = false;
let loopTimer: ReturnType<typeof setTimeout> | null = null;

export function resolveSoundPath(): string | null {
  const settings = getSettings();
  if (settings.useDefaultSound) {
    return getDefaultSoundPath(settings.selectedDefaultSound);
  }
  if (settings.customSoundPath && existsSync(settings.customSoundPath)) {
    return settings.customSoundPath;
  }
  logger.warn('Arquivo de som customizado não encontrado — usando padrão');
  return getDefaultSoundPath('default');
}

function playSoundFile(onComplete?: () => void): void {
  const settings = getSettings();
  if (!settings.soundEnabled || settings.soundVolume <= 0) {
    onComplete?.();
    return;
  }

  const path = resolveSoundPath();
  if (!path || !existsSync(path)) {
    logger.warn(`Arquivo de som não encontrado: ${path ?? 'null'}`);
    onComplete?.();
    return;
  }

  const vol = Math.min(1, Math.max(0, settings.soundVolume));
  const done = (): void => onComplete?.();

  if (platform() === 'darwin') {
    execFile('afplay', ['-v', String(vol), path], (err) => {
      if (err) logger.error('afplay falhou', err.message);
      done();
    });
    return;
  }

  if (platform() === 'win32') {
    const ps = `(New-Object Media.SoundPlayer '${path.replace(/'/g, "''")}').PlaySync()`;
    execFile('powershell.exe', ['-c', ps], (err) => {
      if (err) logger.error('powershell sound falhou', err.message);
      done();
    });
    return;
  }

  execFile('paplay', [path], (err) => {
    if (err) logger.error('paplay falhou', err.message);
    done();
  });
}

export function playNotificationSound(force = false): void {
  const settings = getSettings();
  if (!settings.soundEnabled) return;

  if (settings.soundVolume <= 0) {
    logger.warn('Volume em 0 — som não reproduzido');
    return;
  }

  const now = Date.now();
  if (!force && now - lastPlayedAt < DEBOUNCE_MS) return;
  lastPlayedAt = now;

  playSoundFile();
}

function playLoopIteration(): void {
  if (!loopActive) return;

  const settings = getSettings();
  if (!settings.soundEnabled || settings.soundVolume <= 0) {
    stopAlertSoundLoop();
    return;
  }

  playSoundFile(() => {
    if (!loopActive) return;
    loopTimer = setTimeout(() => playLoopIteration(), LOOP_INTERVAL_MS);
  });
}

export function startAlertSoundLoop(): void {
  if (loopActive) return;

  const settings = getSettings();
  if (!settings.soundEnabled || settings.soundVolume <= 0) return;

  loopActive = true;
  playLoopIteration();
}

export function stopAlertSoundLoop(): void {
  loopActive = false;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

export function syncAlertSoundLoop(hasPendingAlerts: boolean): void {
  if (hasPendingAlerts) {
    startAlertSoundLoop();
  } else {
    stopAlertSoundLoop();
  }
}

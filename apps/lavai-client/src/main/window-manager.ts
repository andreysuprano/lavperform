import { BrowserWindow, Notification, shell } from 'electron';
import { join } from 'path';
import { alertQueue } from './alert-queue';
import { syncAlertSoundLoop } from './audio';
import { getAppIcon } from './app-icon';
import { Logger } from './logger';
import { getSettings } from './settings-store';
import { HelpAlert } from '../shared/types';

const logger = new Logger('WindowManager');

const WINDOW_BG = '#000000';

let alertWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js');
}

function attachWindowHandlers(win: BrowserWindow, label: string): void {
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    logger.error(`Falha ao carregar ${label} (${url}): ${code} ${description}`);
  });
}

function loadRenderer(win: BrowserWindow, view: 'alerts' | 'settings'): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=${view}`);
    return;
  }

  void win.loadFile(join(__dirname, '../renderer/index.html'), {
    query: { view },
  });
}

function presentWindow(win: BrowserWindow): void {
  const show = (): void => {
    if (win.isDestroyed()) return;
    win.show();
    win.center();
    win.focus();
  };

  if (win.webContents.isLoading()) {
    win.once('ready-to-show', show);
  } else {
    show();
  }
}

export function createAlertWindow(): BrowserWindow {
  if (alertWindow && !alertWindow.isDestroyed()) {
    return alertWindow;
  }

  alertWindow = new BrowserWindow({
    width: 420,
    height: 520,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: WINDOW_BG,
    title: 'LavAI — Alertas',
    icon: getAppIcon(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachWindowHandlers(alertWindow, 'alertas');
  loadRenderer(alertWindow, 'alerts');

  alertWindow.on('closed', () => {
    alertWindow = null;
  });

  return alertWindow;
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    presentWindow(settingsWindow);
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 480,
    height: 640,
    show: false,
    backgroundColor: WINDOW_BG,
    title: 'LavAI — Configurações',
    icon: getAppIcon(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachWindowHandlers(settingsWindow, 'configurações');
  loadRenderer(settingsWindow, 'settings');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  presentWindow(settingsWindow);
  return settingsWindow;
}

export function showAlertWindow(): void {
  presentWindow(createAlertWindow());
}

export function showInitialWindow(): void {
  const settings = getSettings();
  if (!settings.agentId?.trim()) {
    createSettingsWindow();
    return;
  }

  showAlertWindow();
}

export function broadcastAlerts(): void {
  const alerts = alertQueue.getAll();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('alerts:updated', alerts);
  }
}

export function handleNewAlert(alert: HelpAlert): void {
  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Cliente solicitou ajuda',
      body: `${alert.userName} — ${alert.userPhone}`,
      icon: getAppIcon(),
    });
    n.on('click', () => showAlertWindow());
    n.show();
  }

  if (getSettings().autoOpenWindow) {
    showAlertWindow();
  }

  broadcastAlerts();
}

export function openWhatsApp(phone: string): void {
  const digits = phone.replace(/\D/g, '');
  void shell.openExternal(`https://wa.me/${digits}`);
}

export function setupWindowIpc(): void {
  alertQueue.onChange((alerts) => {
    syncAlertSoundLoop(alerts.length > 0);
    broadcastAlerts();
  });
  logger.log('Window manager pronto');
}

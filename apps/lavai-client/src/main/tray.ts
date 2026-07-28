import { Menu, Tray, nativeImage, app } from 'electron';
import { alertQueue } from './alert-queue';
import { getAppIconPath } from './app-icon';
import { connectSocket, onConnectionChange } from './socket-client';
import { createSettingsWindow, showAlertWindow } from './window-manager';
import { Logger } from './logger';

const logger = new Logger('Tray');

let tray: Tray | null = null;

function buildIcon(alertCount: number, connected: boolean): Electron.NativeImage {
  const size = 16;
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="8" cy="8" r="7" fill="${connected ? '#22c55e' : '#ef4444'}"/>
      ${alertCount > 0 ? '<circle cx="12" cy="4" r="3" fill="#f59e0b"/>' : ''}
    </svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`,
  );
}

function refreshTrayIcon(connected: boolean): void {
  if (!tray) return;
  const count = alertQueue.getAll().length;
  tray.setImage(buildIcon(count, connected));
  tray.setToolTip(
    connected
      ? `LavAI Client — ${count} alerta(s)`
      : 'LavAI Client — desconectado',
  );
}

export function setupTray(): Tray {
  tray = new Tray(buildIcon(0, false));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Ver alertas',
        click: () => showAlertWindow(),
      },
      {
        label: 'Configurações',
        click: () => createSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => app.quit(),
      },
    ]),
  );

  tray.on('click', () => showAlertWindow());

  alertQueue.onChange(() => {
    onConnectionChange((connected) => refreshTrayIcon(connected));
  });

  onConnectionChange((connected) => refreshTrayIcon(connected));

  logger.log('Tray inicializado');
  return tray;
}

export function getTrayIconPath(): string {
  return getAppIconPath();
}

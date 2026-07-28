import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { getAppIcon } from './app-icon';
import { setupTray } from './tray';
import { connectSocket, disconnectSocket, claimHelpRequest, dismissHelpRequest } from './socket-client';
import {
  setupWindowIpc,
  showAlertWindow,
  showInitialWindow,
  openWhatsApp,
  createSettingsWindow,
} from './window-manager';
import { getSettings, saveSettings, getDefaultSoundPath } from './settings-store';
import { playNotificationSound, stopAlertSoundLoop } from './audio';
import { alertQueue } from './alert-queue';
import { Logger } from './logger';

const logger = new Logger('Main');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.whenReady().then(() => {
  setupWindowIpc();
  setupTray();

  showInitialWindow();
  connectSocket();

  if (process.platform === 'darwin') {
    app.dock?.setIcon(getAppIcon());
    app.dock.setMenu(
      Menu.buildFromTemplate([
        { label: 'Ver alertas', click: () => showAlertWindow() },
        { label: 'Configurações', click: () => createSettingsWindow() },
      ]),
    );
  }

  if (getSettings().launchAtStartup) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:save', (_e, partial) => {
    const next = saveSettings(partial);
    connectSocket();
    return next;
  });
  ipcMain.handle('settings:pick-sound', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Escolher som de notificação',
      filters: [{ name: 'Áudio', extensions: ['mp3', 'wav', 'ogg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('settings:test-sound', () => {
    playNotificationSound(true);
  });
  ipcMain.handle('settings:list-default-sounds', () => [
    { id: 'default', label: 'Padrão', path: getDefaultSoundPath('default') },
    { id: 'soft', label: 'Suave', path: getDefaultSoundPath('soft') },
    { id: 'cliente-com-fome', label: 'Cliente com fome', path: getDefaultSoundPath('cliente-com-fome') },
  ]);

  ipcMain.handle('alerts:get', () => alertQueue.getAll());
  ipcMain.handle('alerts:open-whatsapp', (_e, phone: string) => openWhatsApp(phone));
  ipcMain.handle('alerts:dismiss', async (_e, id: string) => {
    const { apiUrl } = getSettings();
    await dismissHelpRequest(apiUrl, id);
  });
  ipcMain.handle('alerts:claim', async (_e, id: string) => {
    const { apiUrl } = getSettings();
    await claimHelpRequest(apiUrl, id);
  });
  ipcMain.handle('window:open-settings', () => createSettingsWindow());
  ipcMain.handle('window:show-alerts', () => showAlertWindow());

  logger.log('LavAI Client iniciado');
});

app.on('second-instance', () => {
  showAlertWindow();
});

app.on('activate', () => {
  const windows = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  if (windows.length === 0) {
    showInitialWindow();
    return;
  }

  const win = windows[0];
  win.show();
  win.focus();
});

app.on('window-all-closed', () => {
  // tray app — não encerra no macOS
});

app.on('before-quit', () => {
  stopAlertSoundLoop();
  disconnectSocket();
});

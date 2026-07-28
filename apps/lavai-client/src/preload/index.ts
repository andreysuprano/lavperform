import { contextBridge, ipcRenderer } from 'electron';
import type { ClientSettings, HelpAlert } from '../shared/types';

const lavaiApi = {
  settings: {
    get: (): Promise<ClientSettings> => ipcRenderer.invoke('settings:get'),
    save: (data: Partial<ClientSettings>): Promise<ClientSettings> =>
      ipcRenderer.invoke('settings:save', data),
    pickSoundFile: (): Promise<string | null> => ipcRenderer.invoke('settings:pick-sound'),
    testSound: (): Promise<void> => ipcRenderer.invoke('settings:test-sound'),
    listDefaultSounds: (): Promise<Array<{ id: string; label: string; path: string }>> =>
      ipcRenderer.invoke('settings:list-default-sounds'),
  },
  alerts: {
    get: (): Promise<HelpAlert[]> => ipcRenderer.invoke('alerts:get'),
    openWhatsApp: (phone: string): Promise<void> => ipcRenderer.invoke('alerts:open-whatsapp', phone),
    dismiss: (id: string): Promise<void> => ipcRenderer.invoke('alerts:dismiss', id),
    claim: (id: string): Promise<void> => ipcRenderer.invoke('alerts:claim', id),
    onUpdated: (cb: (alerts: HelpAlert[]) => void) => {
      const handler = (_: unknown, alerts: HelpAlert[]) => cb(alerts);
      ipcRenderer.on('alerts:updated', handler);
      return () => ipcRenderer.removeListener('alerts:updated', handler);
    },
  },
  window: {
    openSettings: (): Promise<void> => ipcRenderer.invoke('window:open-settings'),
  },
};

contextBridge.exposeInMainWorld('lavai', lavaiApi);
/** @deprecated use window.lavai */
contextBridge.exposeInMainWorld('foodAi', lavaiApi);

export type LavAiApi = typeof lavaiApi;

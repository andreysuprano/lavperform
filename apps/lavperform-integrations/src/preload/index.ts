import { contextBridge, ipcRenderer } from 'electron'
import type { ImportConfig, ImportEvent } from '@shared/types'
import { IPC } from '@shared/ipc'

const api = {
  startImport: (config: ImportConfig): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.startImport, config),
  cancelImport: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.cancelImport),
  onImportEvent: (callback: (event: ImportEvent) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: ImportEvent): void =>
      callback(payload)
    ipcRenderer.on(IPC.importEvent, listener)
    return () => ipcRenderer.removeListener(IPC.importEvent, listener)
  },
}

export type LavPerformApi = typeof api

contextBridge.exposeInMainWorld('api', api)

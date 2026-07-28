import { app, nativeImage } from 'electron';
import { join } from 'path';

export function getAppIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.png');
  }
  return join(app.getAppPath(), 'assets/icon.png');
}

export function getAppIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(getAppIconPath());
}

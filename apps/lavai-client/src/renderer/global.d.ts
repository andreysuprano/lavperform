import { ClientSettings, HelpAlert } from '../shared/types';

declare global {
  interface Window {
    lavai: {
      settings: {
        get(): Promise<ClientSettings>;
        save(data: Partial<ClientSettings>): Promise<ClientSettings>;
        pickSoundFile(): Promise<string | null>;
        testSound(): Promise<void>;
        listDefaultSounds(): Promise<Array<{ id: string; label: string; path: string }>>;
      };
      alerts: {
        get(): Promise<HelpAlert[]>;
        openWhatsApp(phone: string): Promise<void>;
        dismiss(id: string): Promise<void>;
        claim(id: string): Promise<void>;
        onUpdated(cb: (alerts: HelpAlert[]) => void): () => void;
      };
      window: {
        openSettings(): Promise<void>;
      };
    };
    /** @deprecated use window.lavai */
    foodAi: Window['lavai'];
  }
}

export {};

export type DefaultSoundId = 'default' | 'soft' | 'cliente-com-fome';

export interface ClientSettings {
  apiUrl: string;
  agentId: string;
  apiKey?: string;
  soundEnabled: boolean;
  soundVolume: number;
  useDefaultSound: boolean;
  selectedDefaultSound: DefaultSoundId;
  customSoundPath?: string;
  autoOpenWindow: boolean;
  launchAtStartup: boolean;
}

export const DEFAULT_SETTINGS: ClientSettings = {
  apiUrl: 'http://localhost:3000',
  agentId: '',
  soundEnabled: true,
  soundVolume: 0.8,
  useDefaultSound: true,
  selectedDefaultSound: 'default',
  autoOpenWindow: true,
  launchAtStartup: false,
};

export interface HelpAlert {
  helpRequestId: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  userName: string;
  userPhone: string;
  chatId: string;
  lastMessage: string | null;
  requestedAt: string;
}

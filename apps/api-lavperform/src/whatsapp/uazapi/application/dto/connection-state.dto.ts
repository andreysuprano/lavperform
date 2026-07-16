export class ConnectionStateDto {
  instance: {
    id: string;
    token: string;
    status: string;
    paircode: string;
    qrcode: string;
    name: string;
    profileName: string;
    profilePicUrl: string;
    isBusiness: boolean;
    plataform: string;
    systemName: string;
    owner: string;
    lastDisconnect: string;
    lastDisconnectReason: string;
    adminField01: string;
    openai_apikey: string;
    chatbot_enabled: boolean;
    chatbot_ignoreGroups: boolean;
    chatbot_stopConversation: string;
    chatbot_stopMinutes: number;
    created: string;
    updated: string;
    currentPresence: string;
  };
  status: {
    connected: boolean;
    loggedIn: boolean;
    jid: string;
  }
}
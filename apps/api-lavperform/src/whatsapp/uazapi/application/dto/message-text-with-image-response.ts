export class Key {
    remoteJid: string;
    fromMe: boolean;
    id: string;
}

export class ImageMessage {
    url: string;
    mimetype: string;
    caption: string;
    fileSha256: string;
    fileLength: string;
    height: number;
    width: number;
    mediaKey: string;
    fileEncSha256: string;
    directPath: string;
    mediaKeyTimestamp: string;
    jpegThumbnail: string;
    contextInfo: any;
}

export class MessageTextWithImageResponse {
    key: Key;
    message: {
      imageMessage: ImageMessage;
    };
    messageTimestamp: number;
    status: string;
  }
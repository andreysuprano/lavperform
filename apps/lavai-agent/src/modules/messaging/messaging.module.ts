import { Module } from '@nestjs/common';
import { MESSAGE_SENDER_PORT } from '../../application/agent-runner/ports/message-sender.port';
import { UazapiMessageSender } from '../../infrastructure/providers/uazapi/uazapi-message.sender';

@Module({
  providers: [
    UazapiMessageSender,
    { provide: MESSAGE_SENDER_PORT, useExisting: UazapiMessageSender },
  ],
  exports: [MESSAGE_SENDER_PORT],
})
export class MessagingModule {}

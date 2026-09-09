import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WHATSAPP_EVENTS } from 'src/whatsapp/events/whatsapp.events';
import { PrismaService } from 'src/prisma/prisma.service';

describe('WhatsApp Webhook (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dbCleaner: DatabaseCleaner;

  const eventEmitterMock = {
    emit: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup((builder) =>
      builder.overrideProvider(EventEmitter2).useValue(eventEmitterMock),
    );
    dbCleaner = new DatabaseCleaner(testApp.getModule().get(PrismaService));
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
    jest.clearAllMocks();
  });

  describe('POST /whatsapp/webhook', () => {
    it('should handle connection update event (CONNECTED)', async () => {
      const payload = {
        EventType: 'connection',
        instanceName: 'test-instance',
        token: 'tok-123',
        instance: {
          name: 'test-instance',
          status: 'connected',
          qrcode: '',
        },
      };

      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(payload)
        .expect(204);

      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        WHATSAPP_EVENTS.CONNECTION_UPDATED,
        expect.objectContaining({
          instance: 'test-instance',
          token: 'tok-123',
          status: 'CONNECTED',
        }),
      );
    });

    it('should handle connection update event (DISCONNECTED)', async () => {
      const payload = {
        EventType: 'connection',
        instanceName: 'test-instance',
        token: 'tok-123',
        instance: {
          name: 'test-instance',
          status: 'disconnected',
          qrcode: '',
        },
      };

      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(payload)
        .expect(204);

      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        WHATSAPP_EVENTS.CONNECTION_UPDATED,
        expect.objectContaining({
          instance: 'test-instance',
          token: 'tok-123',
          status: 'DISCONNECTED',
        }),
      );
    });

    it('should handle message received event', async () => {
      const payload = {
        EventType: 'messages',
        instanceName: 'test-instance',
        token: 'tok-123',
        data: {
          key: { remoteJid: '123456789@s.whatsapp.net' },
          message: { conversation: 'Hello' },
        },
      };

      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(payload)
        .expect(204);

      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'whatsapp.message.received',
        payload.data,
      );
    });

    it('should ignore unknown events', async () => {
      const payload = {
        EventType: 'unknown',
        instanceName: 'test-instance',
        data: {},
      };

      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(payload)
        .expect(204);

      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });
  });
});

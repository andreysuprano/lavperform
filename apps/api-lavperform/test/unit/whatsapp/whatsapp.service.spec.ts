import { NotFoundException } from '@nestjs/common';
import { WhatsappInstanceStatus } from '@prisma/client';
import { WhatsappService } from 'src/whatsapp/application/whatsapp.service';

describe('WhatsappService', () => {
  const uazapiClient: any = {
    createInstance: jest.fn(),
    connectInstance: jest.fn(),
    getConnectionState: jest.fn(),
    deleteInstance: jest.fn(),
    sendMessageWithImage: jest.fn(),
    sendTextMessage: jest.fn(),
    sendTyping: jest.fn(),
    setWebhook: jest.fn(),
    checkNumbers: jest.fn(),
  };

  const whatsappInstanceRepository: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCompanyId: jest.fn(),
    findActiveByCompanyId: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const companyRepository: any = {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const aiAgentService: any = {
    ensureActiveAgentWebhook: jest.fn(),
  };

  const checkInstancePool: any = {
    getConnectedInstances: jest.fn(),
    nextIndex: jest.fn(),
    invalidate: jest.fn(),
  };

  let service: WhatsappService;
  const originalUazapiToken = process.env.UAZAPI_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.UAZAPI_TOKEN;
    service = new WhatsappService(
      uazapiClient,
      whatsappInstanceRepository,
      companyRepository,
      aiAgentService,
      checkInstancePool,
    );
  });

  afterAll(() => {
    if (originalUazapiToken === undefined) {
      delete process.env.UAZAPI_TOKEN;
    } else {
      process.env.UAZAPI_TOKEN = originalUazapiToken;
    }
  });

  describe('createCompanyInstance', () => {
    it('throws when company is missing', async () => {
      companyRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(service.createCompanyInstance('comp1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns connection info for an existing connected instance', async () => {
      companyRepository.findById = jest.fn().mockResolvedValue({ id: 'comp1', name: 'Comp X' });
      whatsappInstanceRepository.findActiveByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok1',
        status: WhatsappInstanceStatus.CONNECTED,
      });

      const result = await service.createCompanyInstance('comp1');

      expect(result).toEqual({
        instanceId: 'inst1',
        qrcode: '',
        pairingCode: '',
        code: '',
        status: WhatsappInstanceStatus.CONNECTED,
        message: '',
      });
      expect(uazapiClient.connectInstance).not.toHaveBeenCalled();
    });

    it('reuses pending instance and requests a new connection', async () => {
      companyRepository.findById = jest.fn().mockResolvedValue({ id: 'comp1', name: 'Comp X' });
      whatsappInstanceRepository.findActiveByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok1',
        status: WhatsappInstanceStatus.PENDING,
      });
      uazapiClient.connectInstance = jest.fn().mockResolvedValue({
        instance: { qrcode: 'qr', paircode: 'pair' },
      });

      const result = await service.createCompanyInstance('comp1');

      expect(uazapiClient.connectInstance).toHaveBeenCalledWith('tok1');
      expect(result).toEqual({
        instanceId: 'inst1',
        qrcode: 'qr',
        pairingCode: 'pair',
        code: 'qr',
        status: WhatsappInstanceStatus.PENDING,
        message: '',
      });
    });

    it('creates instance and returns connection info', async () => {
      companyRepository.findById = jest.fn().mockResolvedValue({ id: 'comp1', name: 'Comp X' });
      whatsappInstanceRepository.findActiveByCompanyId = jest.fn().mockResolvedValue(null);
      uazapiClient.createInstance = jest
        .fn()
        .mockResolvedValue({ token: 'new-tok', info: 'scan' });
      uazapiClient.setWebhook = jest.fn().mockResolvedValue(undefined);
      whatsappInstanceRepository.create = jest.fn().mockResolvedValue({
        id: 'inst1',
        name: 'comp-x',
        status: WhatsappInstanceStatus.PENDING,
      });
      uazapiClient.connectInstance = jest.fn().mockResolvedValue({
        instance: { qrcode: 'qr', paircode: 'pair' },
      });

      const result = await service.createCompanyInstance('comp1');

      expect(uazapiClient.createInstance).toHaveBeenCalled();
      expect(uazapiClient.setWebhook).toHaveBeenCalledWith('new-tok', expect.any(String), ['connection']);
      expect(uazapiClient.connectInstance).toHaveBeenCalledWith('new-tok');
      expect(result).toEqual({
        instanceId: 'inst1',
        qrcode: 'qr',
        pairingCode: 'pair',
        code: 'qr',
        status: WhatsappInstanceStatus.PENDING,
        message: 'scan',
      });
    });

    it('rethrows error from Uazapi client', async () => {
      companyRepository.findById = jest.fn().mockResolvedValue({ id: 'comp1', name: 'Comp X' });
      whatsappInstanceRepository.findActiveByCompanyId = jest.fn().mockResolvedValue(null);
      uazapiClient.createInstance = jest.fn().mockRejectedValue(new Error('uz-fail'));

      await expect(service.createCompanyInstance('comp1')).rejects.toThrow('uz-fail');
    });
  });

  describe('getInstanceConnection', () => {
    it('returns disconnected when instance is absent', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue(null);

      const result = await service.getInstanceConnection('comp1');

      expect(result).toEqual({ status: WhatsappInstanceStatus.DISCONNECTED });
    });

    it('reuses existing connection info when already connected', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst1', token: 'tok', status: WhatsappInstanceStatus.CONNECTED });

      const result = await service.getInstanceConnection('comp1');

      expect(result).toEqual({
        status: WhatsappInstanceStatus.CONNECTED,
        message: 'Instância já está conectada',
      });
      expect(uazapiClient.connectInstance).not.toHaveBeenCalled();
    });

    it('connects pending instance and updates status', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst2', token: 'tok2', status: WhatsappInstanceStatus.PENDING });
      uazapiClient.connectInstance = jest
        .fn()
        .mockResolvedValue({ instance: { qrcode: 'qr2', paircode: 'pair2' } });
      whatsappInstanceRepository.updateStatus = jest.fn().mockResolvedValue({ id: 'inst2' });

      const result = await service.getInstanceConnection('comp1');

      expect(uazapiClient.connectInstance).toHaveBeenCalledWith('tok2');
      expect(whatsappInstanceRepository.updateStatus).toHaveBeenCalledWith('inst2', WhatsappInstanceStatus.PENDING);
      expect(result).toEqual({
        qrcode: 'qr2',
        pairingCode: 'pair2',
        code: 'qr2',
        status: WhatsappInstanceStatus.PENDING,
        message: 'Escaneie o QR Code para conectar a instância',
      });
    });
  });

  describe('getInstanceStatus', () => {
    it('maps uazapi status and updates when changed', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst1', token: 'tok', companyId: 'comp1', status: WhatsappInstanceStatus.PENDING });
      uazapiClient.getConnectionState = jest
        .fn()
        .mockResolvedValue({ instance: { status: 'connected', name: 'comp-x' } });
      whatsappInstanceRepository.updateStatus = jest
        .fn()
        .mockResolvedValue({ id: 'inst1', status: WhatsappInstanceStatus.CONNECTED });

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.updateStatus).toHaveBeenCalledWith('inst1', WhatsappInstanceStatus.CONNECTED);
      expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('comp1');
      expect(result).toEqual({
        status: WhatsappInstanceStatus.CONNECTED,
        message: 'Instância comp-x está connected',
        phoneNumber: null,
      });
    });

    it('does not ensure agent webhook when transitioning to a non-connected status', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst3', token: 'tok', companyId: 'comp1', status: WhatsappInstanceStatus.CONNECTED });
      uazapiClient.getConnectionState = jest
        .fn()
        .mockResolvedValue({ instance: { status: 'connecting', name: 'inst' } });
      whatsappInstanceRepository.updateStatus = jest.fn().mockResolvedValue({});

      await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.updateStatus).toHaveBeenCalledWith('inst3', WhatsappInstanceStatus.PENDING);
      expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
    });

    it('returns disconnected when uazapi state is disconnected', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst2', token: 'tok', status: WhatsappInstanceStatus.DISCONNECTED });
      uazapiClient.getConnectionState = jest
        .fn()
        .mockResolvedValue({ instance: { status: 'disconnected', name: 'inst' } });
      whatsappInstanceRepository.updateStatus = jest.fn();

      const result = await service.getInstanceStatus('comp1');

      expect(result.status).toBe(WhatsappInstanceStatus.DISCONNECTED);
      expect(whatsappInstanceRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('returns disconnected when instance does not exist', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue(null);

      const result = await service.getInstanceStatus('comp1');

      expect(result).toEqual({
        status: WhatsappInstanceStatus.DISCONNECTED,
        phoneNumber: null,
      });
    });

    it('persists the connected phone number taken from the session jid', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.PENDING,
        phoneNumber: null,
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'connected', name: 'comp-x' },
        status: { jid: '5511999990000@s.whatsapp.net' },
      });
      whatsappInstanceRepository.updateStatus = jest.fn().mockResolvedValue({});
      whatsappInstanceRepository.update = jest.fn().mockResolvedValue({});

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.update).toHaveBeenCalledWith('inst1', {
        phoneNumber: '5511999990000',
      });
      expect(result.phoneNumber).toBe('5511999990000');
    });

    it('falls back to the instance owner when the jid is missing', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '',
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'connected', name: 'comp-x', owner: '5511888880000' },
        status: { jid: '' },
      });
      whatsappInstanceRepository.update = jest.fn().mockResolvedValue({});

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.update).toHaveBeenCalledWith('inst1', {
        phoneNumber: '5511888880000',
      });
      expect(result.phoneNumber).toBe('5511888880000');
    });

    it('keeps the last known number when uazapi returns no jid or owner', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '5511999990000',
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'connected', name: 'comp-x' },
        status: {},
      });
      whatsappInstanceRepository.update = jest.fn().mockResolvedValue({});

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.update).not.toHaveBeenCalled();
      expect(result.phoneNumber).toBe('5511999990000');
    });

    it('does not rewrite the number when it did not change', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '5511999990000',
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'connected', name: 'comp-x' },
        status: { jid: '5511999990000:12@s.whatsapp.net' },
      });
      whatsappInstanceRepository.update = jest.fn().mockResolvedValue({});

      await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.update).not.toHaveBeenCalled();
    });

    it('returns the last known number while disconnected without clearing it', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.CONNECTED,
        phoneNumber: '5511999990000',
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'disconnected', name: 'comp-x' },
        status: {},
      });
      whatsappInstanceRepository.updateStatus = jest.fn().mockResolvedValue({});
      whatsappInstanceRepository.update = jest.fn().mockResolvedValue({});

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe(WhatsappInstanceStatus.DISCONNECTED);
      expect(result.phoneNumber).toBe('5511999990000');
    });

    it('reports an empty stored number as null', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({
        id: 'inst1',
        token: 'tok',
        companyId: 'comp1',
        status: WhatsappInstanceStatus.DISCONNECTED,
        phoneNumber: '',
      });
      uazapiClient.getConnectionState = jest.fn().mockResolvedValue({
        instance: { status: 'disconnected', name: 'comp-x' },
        status: {},
      });

      const result = await service.getInstanceStatus('comp1');

      expect(result.phoneNumber).toBeNull();
    });

    it('maps unknown states to pending and updates when different', async () => {
      whatsappInstanceRepository.findByCompanyId = jest
        .fn()
        .mockResolvedValue({ id: 'inst3', token: 'tok', status: WhatsappInstanceStatus.CONNECTED });
      uazapiClient.getConnectionState = jest
        .fn()
        .mockResolvedValue({ instance: { status: 'connecting', name: 'inst' } });
      whatsappInstanceRepository.updateStatus = jest.fn().mockResolvedValue({});

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.updateStatus).toHaveBeenCalledWith('inst3', WhatsappInstanceStatus.PENDING);
      expect(result.status).toBe(WhatsappInstanceStatus.PENDING);
    });
  });

  describe('deleteInstance', () => {
    it('throws when no instance exists', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue(null);

      await expect(service.deleteInstance('comp1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes instance remotely and locally', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({ id: 'inst1', token: 'tok' });
      uazapiClient.deleteInstance = jest.fn().mockResolvedValue(undefined);
      whatsappInstanceRepository.delete = jest.fn().mockResolvedValue({ id: 'inst1' });

      await service.deleteInstance('comp1');

      expect(uazapiClient.deleteInstance).toHaveBeenCalledWith('tok');
      expect(whatsappInstanceRepository.delete).toHaveBeenCalledWith('inst1');
    });

    it('propagates errors when deletion fails', async () => {
      whatsappInstanceRepository.findByCompanyId = jest.fn().mockResolvedValue({ id: 'inst1', token: 'tok' });
      uazapiClient.deleteInstance = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(service.deleteInstance('comp1')).rejects.toThrow('Erro ao deletar instância: fail');
    });
  });

  describe('sendMessageWithImage', () => {
    it('propagates errors from client', async () => {
      uazapiClient.sendMessageWithImage = jest.fn().mockRejectedValue(new Error('provider fail'));

      await expect(service.sendMessageWithImage('1', 'msg', 'url', 'tok')).rejects.toThrow(
        'Erro ao enviar mensagem com imagem',
      );
    });
  });

  describe('sendTyping', () => {
    it('forwards typing event', async () => {
      uazapiClient.sendTyping = jest.fn().mockResolvedValue(undefined);

      await service.sendTyping('5511', 'tok');

      expect(uazapiClient.sendTyping).toHaveBeenCalledWith('5511', 'tok');
    });
  });

  describe('checkWhatsappNumber', () => {
    it('uses the rotated instance token instead of UAZAPI_TOKEN', async () => {
      process.env.UAZAPI_TOKEN = 'global-token';
      checkInstancePool.getConnectedInstances.mockResolvedValue([
        { name: 'a', token: 'tok-a' },
        { name: 'b', token: 'tok-b' },
      ]);
      checkInstancePool.nextIndex.mockReturnValue(0);
      uazapiClient.checkNumbers.mockResolvedValue([{ phone: '5511999999999', exists: true }]);

      const result = await service.checkWhatsappNumber('5511999999999');

      expect(result).toBe(true);
      expect(uazapiClient.checkNumbers).toHaveBeenCalledWith(['5511999999999'], 'tok-a');
      expect(uazapiClient.checkNumbers).not.toHaveBeenCalledWith(
        expect.anything(),
        'global-token',
      );
    });

    it('tries the next instance when the first check fails', async () => {
      checkInstancePool.getConnectedInstances.mockResolvedValue([
        { name: 'a', token: 'tok-a' },
        { name: 'b', token: 'tok-b' },
      ]);
      checkInstancePool.nextIndex.mockReturnValue(0);
      uazapiClient.checkNumbers
        .mockRejectedValueOnce(new Error('instance down'))
        .mockResolvedValueOnce([{ phone: '5511999999999', exists: false }]);

      const result = await service.checkWhatsappNumber('5511999999999');

      expect(result).toBe(false);
      expect(uazapiClient.checkNumbers).toHaveBeenNthCalledWith(1, ['5511999999999'], 'tok-a');
      expect(uazapiClient.checkNumbers).toHaveBeenNthCalledWith(2, ['5511999999999'], 'tok-b');
      expect(checkInstancePool.invalidate).toHaveBeenCalled();
    });

    it('throws when the pool is empty and there is no fallback token', async () => {
      checkInstancePool.getConnectedInstances.mockResolvedValue([]);

      await expect(service.checkWhatsappNumber('5511999999999')).rejects.toThrow(
        'Nenhuma instância Uazapi conectada para validação',
      );
      expect(uazapiClient.checkNumbers).not.toHaveBeenCalled();
    });

    it('falls back to UAZAPI_TOKEN when the pool is empty', async () => {
      process.env.UAZAPI_TOKEN = 'fallback-tok';
      checkInstancePool.getConnectedInstances.mockResolvedValue([]);
      uazapiClient.checkNumbers.mockResolvedValue([{ phone: '5511999999999', exists: true }]);

      const result = await service.checkWhatsappNumber('5511999999999');

      expect(result).toBe(true);
      expect(uazapiClient.checkNumbers).toHaveBeenCalledWith(['5511999999999'], 'fallback-tok');
    });

    it('throws when every connected instance fails', async () => {
      checkInstancePool.getConnectedInstances.mockResolvedValue([
        { name: 'a', token: 'tok-a' },
      ]);
      checkInstancePool.nextIndex.mockReturnValue(0);
      uazapiClient.checkNumbers.mockRejectedValue(new Error('down'));

      await expect(service.checkWhatsappNumber('5511999999999')).rejects.toThrow('down');
      expect(checkInstancePool.invalidate).toHaveBeenCalled();
    });

    it('starts at nextIndex and wraps around the ring', async () => {
      checkInstancePool.getConnectedInstances.mockResolvedValue([
        { name: 'a', token: 'tok-a' },
        { name: 'b', token: 'tok-b' },
        { name: 'c', token: 'tok-c' },
      ]);
      checkInstancePool.nextIndex.mockReturnValue(1);
      uazapiClient.checkNumbers
        .mockRejectedValueOnce(new Error('b down'))
        .mockRejectedValueOnce(new Error('c down'))
        .mockResolvedValueOnce([{ phone: '5511999999999', exists: true }]);

      const result = await service.checkWhatsappNumber('5511999999999');

      expect(result).toBe(true);
      expect(uazapiClient.checkNumbers).toHaveBeenNthCalledWith(1, ['5511999999999'], 'tok-b');
      expect(uazapiClient.checkNumbers).toHaveBeenNthCalledWith(2, ['5511999999999'], 'tok-c');
      expect(uazapiClient.checkNumbers).toHaveBeenNthCalledWith(3, ['5511999999999'], 'tok-a');
    });

    it('returns false when the provider responds with an empty list', async () => {
      checkInstancePool.getConnectedInstances.mockResolvedValue([
        { name: 'a', token: 'tok-a' },
      ]);
      checkInstancePool.nextIndex.mockReturnValue(0);
      uazapiClient.checkNumbers.mockResolvedValue([]);

      await expect(service.checkWhatsappNumber('5511999999999')).resolves.toBe(false);
    });
  });
});

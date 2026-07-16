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

  let service: WhatsappService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappService(uazapiClient, whatsappInstanceRepository, companyRepository);
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
        .mockResolvedValue({ id: 'inst1', token: 'tok', status: WhatsappInstanceStatus.PENDING });
      uazapiClient.getConnectionState = jest
        .fn()
        .mockResolvedValue({ instance: { status: 'connected', name: 'comp-x' } });
      whatsappInstanceRepository.updateStatus = jest
        .fn()
        .mockResolvedValue({ id: 'inst1', status: WhatsappInstanceStatus.CONNECTED });

      const result = await service.getInstanceStatus('comp1');

      expect(whatsappInstanceRepository.updateStatus).toHaveBeenCalledWith('inst1', WhatsappInstanceStatus.CONNECTED);
      expect(result).toEqual({
        status: WhatsappInstanceStatus.CONNECTED,
        message: 'Instância comp-x está connected',
      });
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

      expect(result).toEqual({ status: WhatsappInstanceStatus.DISCONNECTED });
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
});

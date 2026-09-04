import { Injectable, ConflictException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { CreateCompanyInstanceResponseDto } from './dto/create-company-instance-response.dto';
import { InstanceConnectionResponseDto } from './dto/instance-connection-response.dto';
import { InstanceStatusResponseDto } from './dto/instance-status-response.dto';
import { WhatsappInstanceStatus } from '@prisma/client';
import { MessageTextWithImageResponse } from './dto/message-text-with-image-response';
import { IWhatsappInstanceRepository } from '../domain/whatsapp-instance.repository.interface';
import { ICompanyRepository } from '../../companies/domain/company.repository.interface';
import { UazapiClient } from '../uazapi/uazapi.client';
import { UazapiCheckInstancePool } from '../uazapi/uazapi-check-instance-pool.service';
import { resolveConnectedPhoneNumber } from './whatsapp-phone.util';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly uazapiClient: UazapiClient,
    @Inject('IWhatsappInstanceRepository')
    private readonly whatsappInstanceRepository: IWhatsappInstanceRepository,
    @Inject('ICompanyRepository')
    private readonly companyRepository: ICompanyRepository,
    @Inject(forwardRef(() => AiAgentService))
    private readonly aiAgentService: AiAgentService,
    private readonly checkInstancePool: UazapiCheckInstancePool,
  ) { }

  private generateInstanceName(companyName: string): string {
    return companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createCompanyInstance(companyId: string): Promise<CreateCompanyInstanceResponseDto> {
    // Busca os dados da empresa
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Verifica se já existe uma instância ativa para a empresa
    const existingInstance = await this.whatsappInstanceRepository.findActiveByCompanyId(companyId);

    if (existingInstance) {
      if (existingInstance.status === WhatsappInstanceStatus.CONNECTED) {
        return {
          instanceId: existingInstance.id,
          qrcode: "",
          pairingCode: "",
          code: "",
          status: existingInstance.status,
          message: ''
        };
      }
      const connectionInfo = await this.uazapiClient.connectInstance(existingInstance.token);

      return {
        instanceId: existingInstance.id,
        qrcode: connectionInfo.instance.qrcode,
        pairingCode: connectionInfo.instance.paircode,
        code: connectionInfo.instance.qrcode,
        status: existingInstance.status,
        message: ''
      };
    }

    // Gera o nome da instância baseado no nome da empresa
    const instanceName = this.generateInstanceName(company.name);

    // Cria a instância na Evolution API
    const uazapiInstance = await this.uazapiClient.createInstance({
      name: instanceName,
      systemName: process.env.WHITELABEL == 'foodcrm' ? 'FoodCRM' : 'LavPerform',
      adminField01: company.name,
      adminField02: company.id,
      browser: 'chrome',
    });

    await this.uazapiClient.setWebhook(
      uazapiInstance.token, 
      `${process.env.WEBHOOK_URL}`, 
      ['connection']
    );

    // Salva a instância no banco de dados
    const instance = await this.whatsappInstanceRepository.create({
      name: instanceName,
      status: WhatsappInstanceStatus.PENDING,
      token: uazapiInstance.token,
      phoneNumber: '',
      companyId: companyId
    });

    // Busca os dados de conexão
    const connectionInfo = await this.uazapiClient.connectInstance(uazapiInstance.token);

    return {
      instanceId: instance.id,
      qrcode: connectionInfo.instance.qrcode,
      pairingCode: connectionInfo.instance.paircode,
      code: connectionInfo.instance.qrcode,
      status: instance.status,
      message: uazapiInstance.info
    };
  }

  async getInstanceConnection(companyId: string): Promise<InstanceConnectionResponseDto> {
    // Busca a instância no banco de dados
    const instance = await this.whatsappInstanceRepository.findByCompanyId(companyId);

    if (!instance) {
      return {
        status: WhatsappInstanceStatus.DISCONNECTED,
      }
    }

    // Se a instância estiver conectada, retorna apenas o status
    if (instance.status === WhatsappInstanceStatus.CONNECTED) {
      return {
        status: instance.status,
        message: 'Instância já está conectada'
      };
    }

    // Busca os dados de conexão na Evolution API
    const connectionInfo = await this.uazapiClient.connectInstance(instance.token);

    // Atualiza o status da instância no banco de dados
    await this.whatsappInstanceRepository.updateStatus(instance.id, WhatsappInstanceStatus.PENDING);

    return {
      qrcode: connectionInfo.instance.qrcode,
      pairingCode: connectionInfo.instance.paircode,
      code: connectionInfo.instance.qrcode,
      status: WhatsappInstanceStatus.PENDING,
      message: 'Escaneie o QR Code para conectar a instância'
    };
  }

  async getInstanceStatus(companyId: string): Promise<InstanceStatusResponseDto> {
    // Busca a instância no banco de dados
    const instance = await this.whatsappInstanceRepository.findByCompanyId(companyId);

    if (!instance) {
      return {
        status: WhatsappInstanceStatus.DISCONNECTED,
        phoneNumber: null,
      }
    }

    // Busca o status atual na Evolution API
    const connectionState = await this.uazapiClient.getConnectionState(instance.token);

    // Mapeia o status da Evolution para nosso enum
    let mappedStatus: WhatsappInstanceStatus;
    if (connectionState.instance.status === 'connected') {
      mappedStatus = WhatsappInstanceStatus.CONNECTED;
    } else if (connectionState.instance.status === 'disconnected') {
      mappedStatus = WhatsappInstanceStatus.DISCONNECTED;
    } else {
      mappedStatus = WhatsappInstanceStatus.PENDING;
    }

    // Se o status for diferente, atualiza no banco
    if (mappedStatus !== instance.status) {
      await this.whatsappInstanceRepository.updateStatus(instance.id, mappedStatus);

      // Na transição para CONNECTED, garante o webhook do agente ativo mesmo
      // que o evento `connection` da UAZAPI não tenha sido entregue.
      if (mappedStatus === WhatsappInstanceStatus.CONNECTED) {
        try {
          await this.aiAgentService.ensureActiveAgentWebhook(instance.companyId);
        } catch (error: any) {
          this.logger.error(
            `Falha ao garantir webhook do agente para company ${instance.companyId}: ${error?.message}`,
          );
        }
      }
    }

    // O número só é confiável enquanto a sessão está conectada; fora disso
    // mantemos o último conhecido.
    const lastKnownPhone = instance.phoneNumber || null;
    const connectedPhone =
      mappedStatus === WhatsappInstanceStatus.CONNECTED
        ? resolveConnectedPhoneNumber(connectionState)
        : null;

    if (connectedPhone && connectedPhone !== lastKnownPhone) {
      await this.whatsappInstanceRepository.update(instance.id, {
        phoneNumber: connectedPhone,
      });
    }

    return {
      status: mappedStatus,
      message: `Instância ${connectionState.instance.name} está ${mappedStatus.toLowerCase()}`,
      phoneNumber: connectedPhone ?? lastKnownPhone,
    };
  }

  async deleteInstance(companyId: string): Promise<void> {
    // Busca a instância no banco de dados
    const instance = await this.whatsappInstanceRepository.findByCompanyId(companyId);

    if (!instance) {
      throw new NotFoundException('Instância não encontrada para esta empresa');
    }

    try {
      // Deleta a instância na Evolution API
      await this.uazapiClient.deleteInstance(instance.token);

      // Deleta a instância no banco de dados
      await this.whatsappInstanceRepository.delete(instance.id);
    } catch (error: any) {
      throw new Error(`Erro ao deletar instância: ${error.message}`);
    }
  }

  async sendTextMessage(phone: string, text: string, token: string): Promise<any> {
    try {
      return await this.uazapiClient.sendTextMessage(phone, text, token);
    } catch (error: any) {
      throw new Error(`Erro ao enviar mensagem de texto: ${error.message}`);
    }
  }

  async sendMessageWithImage(phone: string, message: string, imageUrl: string, token: string): Promise<MessageTextWithImageResponse> {
    try {
      return await this.uazapiClient.sendMessageWithImage(phone, message, imageUrl, token);
    } catch (error: any) {
      throw new Error(`Erro ao enviar mensagem com imagem: ${error.message}`);
    }
  }

  async getContactsFromCompany(companyId: string): Promise<any> {
    try {
      const instance = await this.whatsappInstanceRepository.findByCompanyId(companyId);

      if (!instance) {
        throw new NotFoundException('Instância não encontrada para esta empresa');
      }

      const instanceStatus = await this.uazapiClient.getConnectionState(instance.token);
      
      const contacts = await this.uazapiClient.getContactsFromCompany(instance.token);

      return {
        phoneNumber: instanceStatus.status.jid.split('@')[0],
        profilePic: instanceStatus.instance.profilePicUrl,
        profileName: instanceStatus.instance.profileName,
        numberOfContacts: contacts.length,
        contacts: contacts.map(contact => ({
          name: contact.contact_name ? contact.contact_name : 'Sem nome',
          phone: contact.jid.split('@')[0],
        })),
      }
      return contacts;
    } catch (error: any) {
      throw new Error(`Erro ao obter contatos da empresa: ${error.message}`);
    }
  }

  async getAllConversationContactsFromCompany(companyId: string): Promise<any> {
    try {
      const instance = await this.whatsappInstanceRepository.findByCompanyId(companyId);

      if (!instance) {
        throw new NotFoundException('Instância não encontrada para esta empresa');
      }

      const instanceStatus = await this.uazapiClient.getConnectionState(instance.token);
      
      const conversations = await this.uazapiClient.getConversationContactsFromCompany(instance.token);

      const contacts = await this.uazapiClient.getContactsFromCompany(instance.token);

      const contactsList = await Promise.all(contacts.map(async contact => ({
        name: contact.contact_name ? contact.contact_name : 'Sem nome',
        phone: contact.jid.split('@')[0],
      })));

      const conversationsList = conversations.chats
        .filter(contact => contact.phone || (contact.jid && contact.jid.split('@')[0]))
        .map(contact => {
          const phone = contact.phone ? contact.phone : (contact.jid ? contact.jid.split('@')[0] : null);
          return {
            name: contact.name ? contact.name : (contact.wa_name ? contact.wa_name : 'Sem nome'),
            phone: phone,
          };
        })
        .filter(contact => contact && contact.phone);

      const response = {
        phoneNumber: instanceStatus.status.jid.split('@')[0],
        profilePic: instanceStatus.instance.profilePicUrl,
        profileName: instanceStatus.instance.profileName,
        numberOfContacts: conversations.length,
        contacts: [...conversationsList, ...contactsList]
      }
      return response;
    } catch (error: any) {
      throw new Error(`Erro ao obter contatos da empresa: ${error.message}`);
    }
  }

  async sendTyping(phone: string, token: string): Promise<void> {
    await this.uazapiClient.sendTyping(phone, token);
  }

  async checkWhatsappNumber(phone: string): Promise<boolean> {
    const instances = await this.checkInstancePool.getConnectedInstances();

    if (instances.length === 0) {
      const fallbackToken = process.env.UAZAPI_TOKEN;
      if (!fallbackToken) {
        throw new Error('Nenhuma instância Uazapi conectada para validação');
      }

      this.logger.warn('Nenhuma instância conectada no pool — usando UAZAPI_TOKEN');
      return this.existsOnWhatsapp(phone, fallbackToken);
    }

    const start = this.checkInstancePool.nextIndex(instances.length);
    let lastError: unknown;

    for (let offset = 0; offset < instances.length; offset++) {
      const instance = instances[(start + offset) % instances.length];

      try {
        this.logger.log(`Validando WhatsApp via instância ${instance.name}`);
        return await this.existsOnWhatsapp(phone, instance.token);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Falha na instância ${instance.name} ao validar WhatsApp: ${
            error instanceof Error ? error.message : error
          }`,
        );
        this.checkInstancePool.invalidate();
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Todas as instâncias falharam na validação');
  }

  private async existsOnWhatsapp(phone: string, token: string): Promise<boolean> {
    const results = await this.uazapiClient.checkNumbers([phone], token);
    return results.length > 0 ? results[0].exists : false;
  }
}

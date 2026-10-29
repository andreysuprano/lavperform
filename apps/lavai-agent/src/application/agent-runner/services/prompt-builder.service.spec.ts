import { AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { IDLE_CLOSE_DEFAULT } from '../../agent/attendance-defaults';
import { PromptBuilderService } from './prompt-builder.service';

function agent(): AgentWithConfigsData {
  return {
    id: 'agent-1',
    companyId: 'company-1',
    name: 'Aria',
    description: null,
    active: true,
    kind: AgentKind.PUBLIC,
    instanceName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    persona: {
      id: 'p-1',
      agentId: 'agent-1',
      personaName: 'Aria',
      personaDescription: null,
      systemPrompt: 'Você atende a lavanderia.',
      behaviorGuidelines: null,
      guardrails: null,
      contextPrompt: null,
      welcomeMessage: null,
      messageSignature: null,
      voiceTone: 'PROFESSIONAL' as never,
      communicationStyle: 'BALANCED' as never,
      language: 'PT_BR' as never,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    modelConfig: { maxTokens: 1024 } as AgentWithConfigsData['modelConfig'],
    memoryConfig: null,
    mediaConfig: null,
    filterConfig: null,
    journeyConfig: null,
    notificationConfig: null,
  };
}

describe('PromptBuilderService', () => {
  const builder = new PromptBuilderService();

  it('não inclui telefone nem chat no turno de plataforma', () => {
    const messages = builder.build(
      agent(),
      [],
      [],
      'Oi',
      undefined,
      { userName: 'Ana', companyName: 'Lavanderia Centro' },
    );
    const system = messages[0].content ?? '';
    expect(system).toContain('## Sessão atual');
    expect(system).toContain('Usuário: Ana');
    expect(system).toContain('Empresa: Lavanderia Centro');
    expect(system).not.toContain('Telefone');
    expect(system).not.toContain('remoteJid');
    expect(system).not.toContain('Chat ID');
  });

  it('inclui os campos de personalização já salvos na persona', () => {
    const source = agent();
    source.persona = {
      ...source.persona!,
      personaName: 'Bia',
      personaDescription: 'Atendente da unidade',
      voiceTone: 'FRIENDLY' as never,
      communicationStyle: 'CONCISE' as never,
      language: 'PT_BR' as never,
      behaviorGuidelines: 'Envie o link combinado.',
    };
    const system = builder.build(source, [], [], 'Oi')[0].content ?? '';
    expect(system).toContain('Bia');
    expect(system).toContain('Atendente da unidade');
    expect(system).toContain('amigável');
    expect(system).toContain('conciso');
    expect(system).toContain('português do Brasil');
    expect(system).toContain('Envie o link combinado.');
  });

  it('mantém telefone e chat no caminho do WhatsApp', () => {
    const messages = builder.build(agent(), [], [], 'Oi', {
      senderName: 'Cliente',
      senderPhone: '5511999999999',
      chatId: '5511999999999@s.whatsapp.net',
      isGroup: false,
    });
    const system = messages[0].content ?? '';
    expect(system).toContain('Telefone: 5511999999999');
    expect(system).toContain('5511999999999@s.whatsapp.net');
    expect(system).not.toContain('## Sessão atual');
  });

  it('exclui saudação de espera do histórico enviado ao modelo', () => {
    const history = [
      {
        id: 'm1',
        conversationId: 'conv-1',
        role: MessageRole.USER,
        content: 'Oi',
        originalType: 'TEXT',
        createdAt: new Date(),
      },
      {
        id: 'm2',
        conversationId: 'conv-1',
        role: MessageRole.ASSISTANT,
        content: 'Um momento.',
        originalType: 'WAITING_ACK',
        createdAt: new Date(),
      },
      {
        id: 'm3',
        conversationId: 'conv-1',
        role: MessageRole.ASSISTANT,
        content: IDLE_CLOSE_DEFAULT,
        originalType: 'IDLE_CLOSE',
        createdAt: new Date(),
      },
    ];

    const messages = builder.build(agent(), history, [], 'Nova mensagem');
    const contents = messages.map((message) => message.content);

    expect(contents).not.toContain('Um momento.');
    expect(contents).toContain(IDLE_CLOSE_DEFAULT);
  });
});

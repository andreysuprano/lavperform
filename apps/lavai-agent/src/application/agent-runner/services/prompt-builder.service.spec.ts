import { AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
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
});

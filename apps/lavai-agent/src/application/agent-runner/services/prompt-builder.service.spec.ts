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
    expect(system).toContain('diga que a unidade não informou isso');
    expect(system).toContain('Não chute um valor parecido.');
  });

  it('não trata trecho parecido como fato confirmado', () => {
    const messages = builder.build(
      agent(),
      [],
      [
        {
          id: 'chunk-1',
          knowledgeBaseId: 'kb',
          companyId: 'company-1',
          content: 'A lavagem custa R$ 20',
          metadata: {},
          embeddingModel: 'm',
          createdAt: new Date(),
          score: 0.71,
        },
      ],
      'Qual o preço?',
      {
        senderName: 'Cliente',
        senderPhone: '5511999999999',
        chatId: '5511999999999@s.whatsapp.net',
        isGroup: false,
      },
    );
    const system = messages[0].content ?? '';
    expect(system).toContain('Estes trechos podem não responder à pergunta.');
    expect(system).toContain('A lavagem custa R$ 20');
    expect(system).not.toContain('contexto relevante');
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

  it('mantém o histórico que cabe no contexto do modelo, mesmo com maxTokens baixo', () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      id: `m${index}`,
      conversationId: 'conv-1',
      role: index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
      content: `mensagem-${index}-${'x'.repeat(500)}`,
      originalType: 'TEXT',
      createdAt: new Date(),
    }));

    const messages = builder.build(agent(), history, [], 'Nova mensagem');
    const contents = messages.map((message) => message.content);

    expect(contents).toContain(history[0].content);
    expect(contents).toContain(history[7].content);
  });

  describe('prioridade das instruções da lavanderia', () => {
    const TITLE = '## Prioridade das instruções da lavanderia';

    function withContext(contextPrompt: string) {
      const source = agent();
      source.persona = { ...source.persona!, guardrails: 'limite fixo', contextPrompt };
      return source;
    }

    it('faz o contexto valer sobre as regras fixas, menos nas proteções', () => {
      const system = builder.build(withContext('Peça o nome antes de tudo.'), [], [], 'Oi')[0].content ?? '';
      expect(system.indexOf(TITLE)).toBeGreaterThan(system.indexOf('Peça o nome antes de tudo.'));
      expect(system).toContain('siga o Contexto do Negócio');
      expect(system).toContain('não invente');
      expect(system).toContain('não peça senha');
      expect(system).toContain('não prometa reembolso');
      expect(system).toContain('não se apresente como funcionário humano');
      expect(system).toContain('não compartilhe dado pessoal de outro cliente');
      expect(system).not.toContain('Que estava salvo');
      expect(system).not.toContain('registro antigo');
    });

    it('mantém o bloco antigo preservado abaixo das regras fixas', () => {
      const legacy = '## Informações já cadastradas desta lavanderia\n\ntexto antigo';
      const system = builder.build(withContext(legacy), [], [], 'Oi')[0].content ?? '';
      expect(system).toContain('registro antigo');
    });

    it('não entra sem contexto nem no turno de plataforma', () => {
      expect(builder.build(agent(), [], [], 'Oi')[0].content).not.toContain(TITLE);
      const platform = builder.build(withContext('algo'), [], [], 'Oi', undefined, {
        userName: 'Ana',
        companyName: 'Lavanderia Centro',
      });
      expect(platform[0].content).not.toContain(TITLE);
    });
  });
});

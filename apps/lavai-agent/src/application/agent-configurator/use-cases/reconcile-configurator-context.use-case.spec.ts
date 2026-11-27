import { AgentKind, AgentLanguage, AgentCommunicationStyle, AgentVoiceTone } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort, AgentPersonaData } from '../../agent/ports/agent.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { ReconcileConfiguratorContextUseCase } from './reconcile-configurator-context.use-case';

function persona(): AgentPersonaData {
  return {
    id: 'p1',
    agentId: 'public-1',
    personaName: 'Lia',
    personaDescription: null,
    systemPrompt: 's',
    behaviorGuidelines: 'b',
    guardrails: 'g',
    contextPrompt: 'contexto antigo',
    welcomeMessage: null,
    messageSignature: null,
    voiceTone: AgentVoiceTone.FRIENDLY,
    communicationStyle: AgentCommunicationStyle.BALANCED,
    language: AgentLanguage.PT_BR,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('ReconcileConfiguratorContextUseCase', () => {
  const agents = {
    findByPlatformCode: jest.fn(),
    findById: jest.fn(),
    updatePersona: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<AgentRepositoryPort, 'findByPlatformCode' | 'findById' | 'updatePersona'>
  >;

  const conversations = {
    listByTarget: jest.fn(),
    listMessagesAscending: jest.fn(),
    updateProposalStatus: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      PlatformConversationRepositoryPort,
      'listByTarget' | 'listMessagesAscending' | 'updateProposalStatus'
    >
  >;

  const useCase = new ReconcileConfiguratorContextUseCase(
    agents as unknown as AgentRepositoryPort,
    conversations as unknown as PlatformConversationRepositoryPort,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    agents.findByPlatformCode.mockResolvedValue({
      id: 'cfg',
      companyId: 'c',
      name: 'Config',
      description: null,
      active: true,
      kind: AgentKind.INTERNAL,
      instanceName: null,
      platformCode: 'agent-configurator',
      createdAt: new Date(),
      updatedAt: new Date(),
      persona: null,
      modelConfig: null,
      memoryConfig: null,
      mediaConfig: null,
      filterConfig: null,
      journeyConfig: null,
      notificationConfig: null,
    });
    agents.findById.mockResolvedValue({
      id: 'public-1',
      companyId: 'over-1',
      name: 'Public',
      description: null,
      active: true,
      kind: AgentKind.PUBLIC,
      instanceName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      persona: persona(),
      modelConfig: null,
      memoryConfig: null,
      mediaConfig: null,
      filterConfig: null,
      journeyConfig: null,
      notificationConfig: null,
    });
    agents.updatePersona.mockResolvedValue(persona());
    conversations.listByTarget.mockResolvedValue([{ id: 'conv-1', agentId: 'cfg', contextCompanyId: 'co', platformUserId: 'u', targetAgentId: 'public-1' }]);
    conversations.listMessagesAscending.mockResolvedValue([
      {
        id: 'm1',
        conversationId: 'conv-1',
        role: MessageRole.USER,
        content: 'A saudação de abertura deve ser: Olá Qualito!',
        createdAt: new Date(),
      },
    ]);
  });

  it('reaplica instrução explícita do histórico', async () => {
    const result = await useCase.execute({ contextCompanyId: 'co', targetAgentId: 'public-1' });
    expect(result.appliedDirectInstructions).toBe(1);
    expect(result.contextChanged).toBe(true);
    expect(agents.updatePersona).toHaveBeenCalled();
  });
});
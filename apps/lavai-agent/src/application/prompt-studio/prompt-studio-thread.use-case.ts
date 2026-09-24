import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ProposePromptEditUseCase } from './propose-prompt-edit.use-case';
import { isProposalStale } from './proposal-staleness';
import {
  PROMPT_STUDIO_THREAD_REPOSITORY,
  type PromptStudioMessageRecord,
  type PromptStudioThreadRepository,
} from './prompt-studio-thread.repository.port';
import type { PromptDocument, PromptProposal } from './prompt-studio.types';

const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';

@Injectable()
export class PromptStudioThreadUseCase {
  constructor(
    @Inject(PROMPT_STUDIO_THREAD_REPOSITORY)
    private readonly repo: PromptStudioThreadRepository,
    private readonly propose: ProposePromptEditUseCase,
  ) {}

  async send(
    agentId: string,
    content: string,
    document: PromptDocument,
    currentUpdatedAt: string,
    modelName: string,
  ): Promise<{ messages: PromptStudioMessageRecord[]; proposal: PromptProposal }> {
    const thread = await this.repo.getOrCreate(agentId);
    await this.repo.appendMessage({
      threadId: thread.id,
      role: 'USER',
      content,
      proposalJson: null,
    });

    const proposal = await this.propose.execute({
      document,
      question: '',
      answer: '',
      whatWasWrong: content,
      baseUpdatedAt: currentUpdatedAt,
      currentUpdatedAt,
      draftChanged: false,
      modelName,
    });

    if (isProposalStale(proposal, currentUpdatedAt, false)) {
      throw new ConflictException(STALE_MESSAGE);
    }

    await this.repo.appendMessage({
      threadId: thread.id,
      role: 'SPECIALIST',
      content: proposal.summary,
      proposalJson: JSON.stringify(proposal),
    });

    const messages = await this.repo.listMessages(thread.id);
    return { messages, proposal };
  }

  async discard(agentId: string): Promise<void> {
    const thread = await this.repo.getOrCreate(agentId);
    await this.repo.clearPendingProposal(thread.id);
  }

  async get(agentId: string): Promise<{ messages: PromptStudioMessageRecord[] }> {
    const thread = await this.repo.getOrCreate(agentId);
    const messages = await this.repo.listMessages(thread.id);
    return { messages };
  }
}

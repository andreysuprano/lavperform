import { Injectable } from '@nestjs/common';
import type {
  PromptStudioMessageRecord,
  PromptStudioThreadRecord,
  PromptStudioThreadRepository,
} from '../../../application/prompt-studio/prompt-studio-thread.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaPromptStudioThreadRepository implements PromptStudioThreadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(agentId: string): Promise<PromptStudioThreadRecord> {
    const row = await this.prisma.promptStudioThread.upsert({
      where: { agentId },
      create: { agentId },
      update: {},
    });
    return { id: row.id };
  }

  async listMessages(threadId: string): Promise<PromptStudioMessageRecord[]> {
    const rows = await this.prisma.promptStudioMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      threadId: row.threadId,
      role: row.role,
      content: row.content,
      proposalJson: row.proposalJson,
    }));
  }

  async appendMessage(
    message: PromptStudioMessageRecord & { threadId: string },
  ): Promise<void> {
    await this.prisma.promptStudioMessage.create({
      data: {
        threadId: message.threadId,
        role: message.role,
        content: message.content,
        proposalJson: message.proposalJson,
      },
    });
  }

  async clearPendingProposal(threadId: string): Promise<void> {
    await this.prisma.promptStudioMessage.updateMany({
      where: { threadId, role: 'SPECIALIST' },
      data: { proposalJson: null },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IMetricsUnitOfWork } from '../../domain/metrics-unit-of-work.interface';

@Injectable()
export class PrismaMetricsUnitOfWork implements IMetricsUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async recordMessageClick(token: string): Promise<{ redirectUrl: string }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Step 1: Find message by token
        const message = await tx.message.findFirst({
          where: {
            token: token,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!message) {
          return {
            redirectUrl: 'https://www.google.com',
          };
        }

        // Step 2: Create message interaction record
        await tx.messageInteraction.create({
          data: {
            messageId: message.id,
          },
        });

        // Step 3: Increment campaign metrics
        const campaignFilters: Array<{ campaignId?: string; automaticCampaignId?: string }> = [];

        if (message.campaignId) {
          campaignFilters.push({ campaignId: message.campaignId });
        }

        if (message.automaticCampaignId) {
          campaignFilters.push({ automaticCampaignId: message.automaticCampaignId });
        }

        if (campaignFilters.length > 0) {
          await tx.campaignMetric.updateMany({
            where: {
              OR: campaignFilters,
            },
            data: {
              interactions: { increment: 1 },
            },
          });
        }

        const targetFromMessage = message.redirectUrl?.trim();
        if (targetFromMessage) {
          return { redirectUrl: targetFromMessage };
        }

        const companyIntegration = await tx.digitalMenuIntegration.findFirst({
          where: {
            companyId: message.companyId,
          },
        });

        const targetFromIntegration = companyIntegration?.digitalMenuUrl?.trim();
        return {
          redirectUrl: targetFromIntegration || 'https://www.google.com',
        };
      });
    } catch (error) {
      // Fallback to Google if transaction fails
      return {
        redirectUrl: 'https://www.google.com',
      };
    }
  }
}

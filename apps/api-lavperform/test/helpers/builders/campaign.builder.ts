import { PrismaClient, Campaign, Company, CampaignStatus } from '@prisma/client';
import { CompanyBuilder } from './company.builder';

/**
 * Builder for creating Campaign test data
 */
export class CampaignBuilder {
  private name = 'Test Campaign';
  private messageText = 'Test message for campaign';
  private segmentation = 'all_customers';
  private scheduledDate = new Date(Date.now() + 3600000); // 1 hour from now
  private status: CampaignStatus = 'WAITING';
  private company?: Company;
  private imageUrl?: string;
  private modifiedByAI = false;
  private trakingCode?: string;

  /**
   * Sets the campaign name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the campaign message text
   */
  withMessageText(text: string): this {
    this.messageText = text;
    return this;
  }

  /**
   * Sets the campaign segmentation
   */
  withSegmentation(segmentation: string): this {
    this.segmentation = segmentation;
    return this;
  }

  /**
   * Sets the campaign scheduled date
   */
  withScheduledDate(date: Date): this {
    this.scheduledDate = date;
    return this;
  }

  /**
   * Sets the campaign status
   */
  withStatus(status: CampaignStatus): this {
    this.status = status;
    return this;
  }

  /**
   * Associates the campaign with a company
   */
  withCompany(company: Company): this {
    this.company = company;
    return this;
  }

  /**
   * Sets the campaign image URL
   */
  withImageUrl(url: string): this {
    this.imageUrl = url;
    return this;
  }

  /**
   * Sets whether the campaign was modified by AI
   */
  withModifiedByAI(modified: boolean): this {
    this.modifiedByAI = modified;
    return this;
  }

  /**
   * Sets the tracking code
   */
  withTrakingCode(code: string): this {
    this.trakingCode = code;
    return this;
  }

  /**
   * Builds and persists the campaign to the database
   */
  async build(prisma: PrismaClient): Promise<Campaign> {
    // Create or use existing company
    if (!this.company) {
      this.company = await new CompanyBuilder().build(prisma);
    }

    return prisma.campaign.create({
      data: {
        name: this.name,
        messageText: this.messageText,
        segmentation: this.segmentation,
        scheduledDate: this.scheduledDate,
        status: this.status,
        companyId: this.company.id,
        imageUrl: this.imageUrl,
        modifiedByAI: this.modifiedByAI,
        trakingCode: this.trakingCode || `track-${Date.now()}`,
      },
    });
  }
}

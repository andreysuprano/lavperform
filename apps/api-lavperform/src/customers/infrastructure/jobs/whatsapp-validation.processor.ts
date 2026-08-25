import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsappService } from '../../../whatsapp/application/whatsapp.service';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { WHATSAPP_VALIDATION_CONCURRENCY } from '../../../common/queue/queue-concurrency.config';

type WhatsappValidationJobData = {
  customerId: string;
  companyId: string;
  phone: string;
};

@Processor(QUEUE_NAMES.WHATSAPP_VALIDATION)
export class WhatsappValidationProcessor {
  private readonly logger = new Logger(WhatsappValidationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process({ name: 'validate', concurrency: WHATSAPP_VALIDATION_CONCURRENCY })
  async handleValidate(job: Job<WhatsappValidationJobData>) {
    const { customerId, phone } = job.data;

    try {
      const isValid = await this.whatsappService.checkWhatsappNumber(phone);

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          whatsappVerified: isValid,
          whatsappVerifiedAt: new Date(),
        },
      });

      this.logger.log(
        `Validação WhatsApp concluída: customerId=${customerId}, phone=${phone}, valid=${isValid}`,
      );

      return { success: true, valid: isValid };
    } catch (error: any) {
      this.logger.error(
        `Erro ao validar WhatsApp: customerId=${customerId}, phone=${phone}: ${error?.message || error}`,
      );
      throw error;
    }
  }
}

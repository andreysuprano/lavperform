import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { toDateOnlyString } from '../../../common/utils/date.utils';

@Injectable()
export class VmLavSalesTasks {
  private readonly logger = new Logger(VmLavSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALES_IMPORT)
    private readonly vmLavSalesQueue: Queue,
  ) {}

  /**
   * Cron job que executa a cada 30 minutos
   * Busca todas as empresas com integração VM Lav ativa
   * e adiciona na fila para processamento das vendas do dia
   */
  @Cron('0 */30 * * * *')
  async handleDailySalesImport() {
    this.logger.debug('Iniciando importação de vendas VM Lav');

    try {
      const today = toDateOnlyString(new Date());

      // Busca empresas com integração VM Lav ativa usando o partnerSlug
      const companies = await this.prisma.company.findMany({
        where: {
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: {
                partnerSlug: 'VMLAV',
              },
            },
          },
        },
        include: {
          digitalMenuIntegration: {
            where: {
              active: true,
              partner: {
                partnerSlug: 'VMLAV',
              },
            },
            include: {
              partner: true,
            },
          },
        },
      });

      this.logger.log(
        `Encontradas ${companies.length} empresas com integração VM Lav`,
      );

      // Adiciona cada empresa na fila para processamento
      for (const company of companies) {
        await this.vmLavSalesQueue.add(
          QUEUE_NAMES.VMLAV_SALES_IMPORT,
          {
            companyId: company.id,
            date: today,
          },
          {
            jobId: `vmlav-import:${company.id}:${today}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );

        this.logger.log(
          `Empresa ${company.name} (${company.id}) adicionada à fila de importação`,
        );
      }

      this.logger.log(
        `Total de ${companies.length} empresas adicionadas à fila de importação VM Lav`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar importação de vendas VM Lav:',
        error,
      );
    }
  }
}

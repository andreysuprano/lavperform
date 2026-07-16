import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UazapiClient } from '../uazapi/uazapi.client';
import { PrismaService } from '../../prisma/prisma.service';
import { UazapiInstanceSummaryDto } from '../uazapi/application/dto/instance-list.dto';

@Injectable()
export class WhatsappInstanceCleanupTasks {
  private readonly logger = new Logger(WhatsappInstanceCleanupTasks.name);

  /** Instâncias desconectadas há mais de 1 dia serão removidas */
  private static readonly DISCONNECTED_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly uazapiClient: UazapiClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Executa diariamente à 01:00.
   * 1. Busca todas as instâncias na Uazapi via GET /instance/all
   * 2. Remove do banco registros cujo token não existe mais na Uazapi (apagados pelo cron interno deles)
   * 3. Filtra instâncias desconectadas há mais de 1 dia e remove da Uazapi + banco
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupStaleDisconnectedInstances(): Promise<void> {
    this.logger.log('Iniciando limpeza de instâncias desconectadas');

    let uazapiInstances: UazapiInstanceSummaryDto[];

    try {
      uazapiInstances = await this.uazapiClient.getAllInstances();
    } catch (error) {
      this.logger.error('Não foi possível buscar instâncias na Uazapi', error?.message);
      return;
    }

    this.logger.log(`Total de instâncias encontradas na Uazapi: ${uazapiInstances.length}`);

    await this.removeOrphanedDbInstances(uazapiInstances);

    const stale = this.filterStaleInstances(uazapiInstances);

    if (stale.length === 0) {
      this.logger.log('Nenhuma instância elegível para remoção por inatividade');
      return;
    }

    this.logger.log(`${stale.length} instância(s) desconectada(s) há mais de 1 dia   iniciando remoção`);

    let removed = 0;
    let errors = 0;

    for (const instance of stale) {
      try {
        await this.removeInstance(instance);
        removed++;
      } catch (error) {
        errors++;
        this.logger.error(
          `Falha ao remover instância "${instance.name}" (token: ${instance.token}): ${error?.message}`,
        );
      }
    }

    this.logger.log(
      `Limpeza concluída   removidas por inatividade: ${removed}, erros: ${errors}`,
    );
  }

  /**
   * Remove do banco de dados instâncias cujo token não existe mais na Uazapi.
   * Isso cobre o cenário em que o cron interno da Uazapi apaga instâncias ociosas
   * sem notificar nossa API, deixando registros "fantasma" no banco.
   */
  private async removeOrphanedDbInstances(
    uazapiInstances: UazapiInstanceSummaryDto[],
  ): Promise<void> {
    const uazapiTokens = new Set(uazapiInstances.map((i) => i.token));

    const dbInstances = await this.prisma.whatsappInstance.findMany({
      select: { id: true, token: true, companyId: true, name: true },
    });

    const orphaned = dbInstances.filter((db) => !uazapiTokens.has(db.token));

    if (orphaned.length === 0) {
      this.logger.log('Nenhum registro órfão encontrado no banco de dados');
      return;
    }

    this.logger.warn(
      `${orphaned.length} instância(s) encontrada(s) no banco mas ausente(s) na Uazapi   removendo registros órfãos`,
    );

    for (const orphan of orphaned) {
      try {
        await this.prisma.whatsappInstance.delete({ where: { id: orphan.id } });
        this.logger.log(
          `Registro órfão removido: "${orphan.name}" (id: ${orphan.id}, empresa: ${orphan.companyId}, token: ${orphan.token})`,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao remover registro órfão "${orphan.name}" (id: ${orphan.id}): ${error?.message}`,
        );
      }
    }
  }

  private filterStaleInstances(instances: UazapiInstanceSummaryDto[]): UazapiInstanceSummaryDto[] {
    const cutoff = new Date(Date.now() - WhatsappInstanceCleanupTasks.DISCONNECTED_TTL_MS);

    return instances.filter((instance) => {
      if (instance.status === 'connected') return false;

      const referenceDate = this.resolveDisconnectedAt(instance);
      if (!referenceDate) return false;

      return referenceDate < cutoff;
    });
  }

  /**
   * Resolve o timestamp de referência para avaliar há quanto tempo a instância está desconectada.
   * Usa `lastDisconnect` se disponível, caso contrário usa `updated`.
   */
  private resolveDisconnectedAt(instance: UazapiInstanceSummaryDto): Date | null {
    const raw = instance.lastDisconnect || instance.updated;
    if (!raw) return null;

    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
  }

  private async removeInstance(instance: UazapiInstanceSummaryDto): Promise<void> {
    this.logger.log(
      `Removendo instância "${instance.name}" (status: ${instance.status}, token: ${instance.token})`,
    );

    // 1. Remove na Uazapi
    try {
      await this.uazapiClient.deleteInstance(instance.token);
      this.logger.log(`Instância "${instance.name}" removida da Uazapi`);
    } catch (error) {
      // Loga mas prossegue   a instância pode já não existir na Uazapi
      this.logger.warn(
        `Não foi possível remover "${instance.name}" da Uazapi (pode já ter sido removida): ${error?.message}`,
      );
    }

    // 2. Remove do banco de dados (busca pelo token)
    const dbInstance = await this.prisma.whatsappInstance.findFirst({
      where: { token: instance.token },
    });

    if (dbInstance) {
      await this.prisma.whatsappInstance.delete({ where: { id: dbInstance.id } });
      this.logger.log(
        `Instância "${instance.name}" removida do banco de dados (id: ${dbInstance.id}, empresa: ${dbInstance.companyId})`,
      );
    } else {
      this.logger.warn(
        `Instância "${instance.name}" (token: ${instance.token}) não encontrada no banco de dados   apenas removida da Uazapi`,
      );
    }
  }
}

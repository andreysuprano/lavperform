import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappInstanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UazapiClient } from '../uazapi/uazapi.client';
import { UazapiInstanceSummaryDto } from '../uazapi/application/dto/instance-list.dto';
import {
  WhatsappCompanyConnectionSnapshotService,
} from '../application/whatsapp-company-connection-snapshot.service';

@Injectable()
export class WhatsappConnectionReconcileTasks {
  private readonly logger = new Logger(WhatsappConnectionReconcileTasks.name);

  constructor(
    private readonly uazapiClient: UazapiClient,
    private readonly prisma: PrismaService,
    private readonly snapshotService: WhatsappCompanyConnectionSnapshotService,
  ) {}

  /** A cada 30 minutos alinha snapshot e status do banco com a UAZAPI. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcileConnections(): Promise<void> {
    this.logger.log('Iniciando reconciliação de conexões WhatsApp');

    let uazapiInstances: UazapiInstanceSummaryDto[];
    try {
      uazapiInstances = await this.uazapiClient.getAllInstances();
    } catch (error: any) {
      this.logger.error(
        `Não foi possível buscar instâncias na Uazapi: ${error?.message}`,
      );
      return;
    }

    const byToken = new Map(uazapiInstances.map((i) => [i.token, i]));
    const dbInstances = await this.prisma.whatsappInstance.findMany({
      select: {
        id: true,
        token: true,
        name: true,
        status: true,
        companyId: true,
      },
    });

    let synced = 0;
    let markedAbsent = 0;
    let errors = 0;

    for (const db of dbInstances) {
      try {
        const remote = byToken.get(db.token);
        if (!remote) {
          if (db.status !== WhatsappInstanceStatus.DISCONNECTED) {
            await this.prisma.whatsappInstance.update({
              where: { id: db.id },
              data: { status: WhatsappInstanceStatus.DISCONNECTED },
            });
          }
          await this.snapshotService.markAbsent(db.companyId);
          markedAbsent++;
          continue;
        }

        const snapshotStatus =
          WhatsappCompanyConnectionSnapshotService.mapUazapiStatus(remote.status);
        const dbStatus = this.mapToDbStatus(remote.status);

        if (db.status !== dbStatus) {
          await this.prisma.whatsappInstance.update({
            where: { id: db.id },
            data: { status: dbStatus },
          });
        }

        const hasExplicitDisconnect = Boolean(this.parseDate(remote.lastDisconnect));
        const eventAt =
          snapshotStatus === 'disconnected'
            ? this.parseDate(remote.lastDisconnect) ??
              this.parseDate(remote.updated) ??
              new Date()
            : this.parseDate(remote.updated) ?? new Date();

        await this.snapshotService.upsertFromEvent({
          companyId: db.companyId,
          instanceToken: remote.token,
          instanceName: remote.name,
          systemName: remote.systemName ?? null,
          status: snapshotStatus,
          eventAt,
          reconciled: true,
          touchDisconnectedAt: hasExplicitDisconnect,
        });
        synced++;
      } catch (error: any) {
        errors++;
        this.logger.error(
          `Falha ao reconciliar empresa ${db.companyId}: ${error?.message}`,
        );
      }
    }

    // Snapshots cujo token não está mais no banco (limpeza já removeu WhatsappInstance)
    // mas ainda não estavam absent — marcar a partir da ausência na UAZAPI.
    const snapshots = await this.prisma.whatsappCompanyConnection.findMany({
      where: {
        status: { not: 'absent' },
        OR: [
          { instanceToken: null },
          { instanceToken: { notIn: [...byToken.keys()] } },
        ],
      },
      select: { companyId: true, instanceToken: true },
    });

    for (const snap of snapshots) {
      const stillHasDb = dbInstances.some((d) => d.companyId === snap.companyId);
      if (stillHasDb) continue;
      try {
        await this.snapshotService.markAbsent(snap.companyId);
        markedAbsent++;
      } catch (error: any) {
        errors++;
        this.logger.error(
          `Falha ao marcar absent empresa ${snap.companyId}: ${error?.message}`,
        );
      }
    }

    this.logger.log(
      `Reconciliação concluída — sincronizadas: ${synced}, absent: ${markedAbsent}, erros: ${errors}`,
    );
  }

  private mapToDbStatus(raw: string): WhatsappInstanceStatus {
    const normalized = (raw ?? '').toLowerCase();
    if (normalized === 'connected') return WhatsappInstanceStatus.CONNECTED;
    if (normalized === 'pending' || normalized === 'connecting') {
      return WhatsappInstanceStatus.PENDING;
    }
    return WhatsappInstanceStatus.DISCONNECTED;
  }

  private parseDate(raw: string | null | undefined): Date | null {
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

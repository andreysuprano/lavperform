import { Injectable } from '@nestjs/common';
import {
  WhatsappCompanyConnectionStatus,
  WhatsappInstanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SnapshotStatusInput =
  | WhatsappCompanyConnectionStatus
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'pending'
  | 'absent'
  | string;

export interface UpsertConnectionSnapshotInput {
  companyId: string;
  instanceToken?: string | null;
  instanceName?: string | null;
  systemName?: string | null;
  status: SnapshotStatusInput;
  eventAt?: Date;
  /** Quando true, atualiza lastReconciledAt. */
  reconciled?: boolean;
  /**
   * Quando true, grava lastDisconnectedAt = eventAt mesmo se já estava desconectado.
   * Use no webhook de desconexão ou quando a UAZAPI envia lastDisconnect explícito.
   */
  touchDisconnectedAt?: boolean;
}

@Injectable()
export class WhatsappCompanyConnectionSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  static mapUazapiStatus(raw: string | null | undefined): WhatsappCompanyConnectionStatus {
    const normalized = (raw ?? '').toLowerCase().trim();
    switch (normalized) {
      case 'connected':
        return WhatsappCompanyConnectionStatus.connected;
      case 'connecting':
        return WhatsappCompanyConnectionStatus.connecting;
      case 'pending':
        return WhatsappCompanyConnectionStatus.pending;
      case 'absent':
        return WhatsappCompanyConnectionStatus.absent;
      case 'disconnected':
      default:
        return WhatsappCompanyConnectionStatus.disconnected;
    }
  }

  static mapDbInstanceStatus(
    status: WhatsappInstanceStatus,
  ): WhatsappCompanyConnectionStatus {
    switch (status) {
      case WhatsappInstanceStatus.CONNECTED:
        return WhatsappCompanyConnectionStatus.connected;
      case WhatsappInstanceStatus.PENDING:
        return WhatsappCompanyConnectionStatus.pending;
      case WhatsappInstanceStatus.ERROR:
      case WhatsappInstanceStatus.DISCONNECTED:
      default:
        return WhatsappCompanyConnectionStatus.disconnected;
    }
  }

  async upsertFromEvent(input: UpsertConnectionSnapshotInput) {
    const status = WhatsappCompanyConnectionSnapshotService.mapUazapiStatus(
      typeof input.status === 'string' ? input.status : String(input.status),
    );
    const eventAt = input.eventAt ?? new Date();
    const existing = await this.prisma.whatsappCompanyConnection.findUnique({
      where: { companyId: input.companyId },
    });

    const data: {
      instanceToken?: string | null;
      instanceName?: string | null;
      systemName?: string | null;
      status: WhatsappCompanyConnectionStatus;
      lastDisconnectedAt?: Date | null;
      lastConnectedAt?: Date | null;
      lastReconciledAt?: Date;
    } = { status };

    if (input.instanceToken !== undefined) {
      data.instanceToken = input.instanceToken;
    }
    if (input.instanceName !== undefined) {
      data.instanceName = input.instanceName;
    }
    if (input.systemName !== undefined) {
      data.systemName = input.systemName;
    }
    if (input.reconciled) {
      data.lastReconciledAt = new Date();
    }

    if (status === WhatsappCompanyConnectionStatus.connected) {
      data.lastConnectedAt = eventAt;
    }

    const wasDisconnected =
      existing?.status === WhatsappCompanyConnectionStatus.disconnected ||
      existing?.status === WhatsappCompanyConnectionStatus.absent;

    if (status === WhatsappCompanyConnectionStatus.disconnected) {
      if (!wasDisconnected || input.touchDisconnectedAt || !existing?.lastDisconnectedAt) {
        data.lastDisconnectedAt = eventAt;
      }
    }

    if (status === WhatsappCompanyConnectionStatus.absent) {
      if (!existing?.lastDisconnectedAt) {
        data.lastDisconnectedAt = eventAt;
      }
      // senão preserva lastDisconnectedAt existente (não inclui no update)
    }

    if (existing) {
      return this.prisma.whatsappCompanyConnection.update({
        where: { companyId: input.companyId },
        data,
      });
    }

    return this.prisma.whatsappCompanyConnection.create({
      data: {
        companyId: input.companyId,
        instanceToken: input.instanceToken ?? null,
        instanceName: input.instanceName ?? null,
        systemName: input.systemName ?? null,
        status,
        lastConnectedAt:
          status === WhatsappCompanyConnectionStatus.connected ? eventAt : null,
        lastDisconnectedAt:
          status === WhatsappCompanyConnectionStatus.disconnected ||
          status === WhatsappCompanyConnectionStatus.absent
            ? eventAt
            : null,
        lastReconciledAt: input.reconciled ? new Date() : null,
      },
    });
  }

  async markAbsent(companyId: string) {
    return this.upsertFromEvent({
      companyId,
      instanceToken: null,
      status: WhatsappCompanyConnectionStatus.absent,
      reconciled: true,
    });
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyServiceModel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';

export type PromptSheetSnapshot = {
  name: string | null;
  phone: string | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  openingHours: Array<{
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  }>;
};

export type PromptSheetResponse = {
  serviceModel: CompanyServiceModel;
  snapshot: PromptSheetSnapshot;
  answers: Record<string, string>;
  updatedAt: Date | null;
};

@Injectable()
export class PromptSheetService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string, draftKey = 'draft'): Promise<PromptSheetResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        phone: true,
        serviceModel: true,
        address: {
          select: {
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        openingHours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isOpen: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sheet = await this.prisma.promptSheet.findUnique({
      where: { companyId_draftKey: { companyId, draftKey } },
    });

    const emptyAddress = {
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
    };

    return {
      serviceModel: sheet?.serviceModel ?? company.serviceModel,
      snapshot: {
        name: company.name,
        phone: company.phone,
        address: company.address
          ? {
              street: company.address.street,
              number: company.address.number,
              complement: company.address.complement,
              neighborhood: company.address.neighborhood,
              city: company.address.city,
              state: company.address.state,
              zipCode: company.address.zipCode,
            }
          : emptyAddress,
        openingHours: company.openingHours.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          openTime: row.openTime,
          closeTime: row.closeTime,
          isOpen: row.isOpen,
        })),
      },
      answers: (sheet?.answers as Record<string, string> | null) ?? {},
      updatedAt: sheet?.updatedAt ?? null,
    };
  }

  async putAnswer(
    companyId: string,
    draftKey: string,
    key: string,
    value: string,
  ): Promise<{ serviceModel: CompanyServiceModel; answers: Record<string, string>; updatedAt: Date }> {
    return this.writeAnswer(companyId, draftKey, key, value);
  }

  async assertSheetUnchanged(
    companyId: string,
    draftKey: string,
    expectedSheetUpdatedAt: string,
  ): Promise<void> {
    const existing = await this.prisma.promptSheet.findUnique({
      where: { companyId_draftKey: { companyId, draftKey } },
      select: { updatedAt: true },
    });

    const currentUpdatedAt = existing?.updatedAt?.toISOString() ?? null;
    if (currentUpdatedAt !== expectedSheetUpdatedAt) {
      throw new ConflictException(STALE_MESSAGE);
    }
  }

  async applyAcceptedAnswer(
    companyId: string,
    draftKey: string,
    key: string,
    value: string,
    expectedSheetUpdatedAt: string,
  ): Promise<{ serviceModel: CompanyServiceModel; answers: Record<string, string>; updatedAt: Date }> {
    await this.assertSheetUnchanged(companyId, draftKey, expectedSheetUpdatedAt);
    return this.writeAnswer(companyId, draftKey, key, value);
  }

  private async writeAnswer(
    companyId: string,
    draftKey: string,
    key: string,
    value: string,
  ): Promise<{ serviceModel: CompanyServiceModel; answers: Record<string, string>; updatedAt: Date }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { serviceModel: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.promptSheet.findUnique({
      where: { companyId_draftKey: { companyId, draftKey } },
      select: { answers: true },
    });

    const answers: Record<string, string> = {
      ...((existing?.answers as Record<string, string> | null) ?? {}),
      [key]: value,
    };

    const sheet = await this.prisma.promptSheet.upsert({
      where: { companyId_draftKey: { companyId, draftKey } },
      create: {
        companyId,
        draftKey,
        serviceModel: company.serviceModel,
        answers: answers as Prisma.InputJsonValue,
      },
      update: {
        answers: answers as Prisma.InputJsonValue,
      },
    });

    return {
      serviceModel: sheet.serviceModel,
      answers: sheet.answers as Record<string, string>,
      updatedAt: sheet.updatedAt,
    };
  }

  async adopt(
    companyId: string,
    agentId: string,
  ): Promise<{ serviceModel: CompanyServiceModel; answers: Record<string, string>; updatedAt: Date }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { serviceModel: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const draft = await this.prisma.promptSheet.findUnique({
      where: { companyId_draftKey: { companyId, draftKey: 'draft' } },
    });

    const answers = (draft?.answers as Record<string, string> | null) ?? {};
    const serviceModel = draft?.serviceModel ?? company.serviceModel;

    const sheet = await this.prisma.promptSheet.upsert({
      where: { companyId_draftKey: { companyId, draftKey: agentId } },
      create: {
        companyId,
        draftKey: agentId,
        serviceModel,
        answers: answers as Prisma.InputJsonValue,
      },
      update: {
        serviceModel,
        answers: answers as Prisma.InputJsonValue,
      },
    });

    return {
      serviceModel: sheet.serviceModel,
      answers: sheet.answers as Record<string, string>,
      updatedAt: sheet.updatedAt,
    };
  }
}

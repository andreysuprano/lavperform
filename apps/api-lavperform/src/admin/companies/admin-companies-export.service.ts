import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { buildXlsx } from '../../common/spreadsheet/rows-to-xlsx';
import {
  ADMIN_COMPANIES_CSV_HEADER,
  adminCompaniesCsvHeader,
  adminCompanyCells,
  formatAdminCompaniesCsvChunk,
} from './admin-companies-csv';

const BATCH_SIZE = 500;

@Injectable()
export class AdminCompaniesExportService {
  constructor(private readonly prisma: PrismaService) {}

  createExportStream(): Readable {
    return Readable.from(this.iterateCsvChunks());
  }

  async createXlsx(): Promise<Buffer> {
    const rows = [ADMIN_COMPANIES_CSV_HEADER.split(',')];

    for await (const batch of this.iterateBatches()) {
      rows.push(...batch.map((company) => adminCompanyCells(company)));
    }

    return buildXlsx(rows, 'Lavanderias');
  }

  private async *iterateCsvChunks(): AsyncGenerator<string> {
    yield adminCompaniesCsvHeader();

    for await (const batch of this.iterateBatches()) {
      yield formatAdminCompaniesCsvChunk(batch);
    }
  }

  /**
   * Sem filtro de deletedAt ou state: a planilha traz o cadastro inteiro,
   * inclusive inativas, pendentes e soft-deleted.
   */
  private async *iterateBatches() {
    let cursorId: string | undefined;

    for (;;) {
      const rows = await this.prisma.company.findMany({
        include: {
          address: true,
          businessPartner: { select: { name: true } },
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });

      if (rows.length === 0) break;

      yield rows;
      cursorId = rows[rows.length - 1].id;

      if (rows.length < BATCH_SIZE) break;
    }
  }
}

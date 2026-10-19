import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { buildXlsx } from '../../common/spreadsheet/rows-to-xlsx';
import {
  ADMIN_CUSTOMERS_CSV_HEADER,
  adminCustomerCells,
  adminCustomersCsvHeader,
  formatAdminCustomersCsvChunk,
} from './admin-customers-csv';

const BATCH_SIZE = 500;

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  createExportStream(): Readable {
    return Readable.from(this.iterateCsvChunks());
  }

  async createXlsx(): Promise<Buffer> {
    const rows = [ADMIN_CUSTOMERS_CSV_HEADER.split(',')];

    for await (const batch of this.iterateBatches()) {
      rows.push(...batch.map((customer) => adminCustomerCells(customer)));
    }

    return buildXlsx(rows);
  }

  private async *iterateCsvChunks(): AsyncGenerator<string> {
    yield adminCustomersCsvHeader();

    for await (const batch of this.iterateBatches()) {
      yield formatAdminCustomersCsvChunk(batch);
    }
  }

  private async *iterateBatches() {
    let cursorId: string | undefined;

    for (;;) {
      const rows = await this.prisma.customer.findMany({
        include: {
          address: true,
          company: { select: { name: true } },
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

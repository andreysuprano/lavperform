import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import {
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

  private async *iterateCsvChunks(): AsyncGenerator<string> {
    yield adminCustomersCsvHeader();

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

      yield formatAdminCustomersCsvChunk(rows);
      cursorId = rows[rows.length - 1].id;

      if (rows.length < BATCH_SIZE) break;
    }
  }
}

const connectMock = jest.fn();
const disconnectMock = jest.fn();
const executeRawMock = jest.fn();

class MockPrismaClient {
  $connect = connectMock;
  $disconnect = disconnectMock;
  $executeRaw = executeRawMock;
  constructor(_args?: any) {}
}

const poolInstance = {};

jest.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((pool: any) => ({ pool })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation((_config) => poolInstance),
}));

import { PrismaService } from 'src/prisma/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
    service = new PrismaService();
  });

  it('constructs using pg pool and prisma adapter', () => {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      max: 20,
    });
    expect(PrismaPg).toHaveBeenCalledWith(poolInstance);
  });

  it('connects and disconnects on lifecycle hooks', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connectMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });
});

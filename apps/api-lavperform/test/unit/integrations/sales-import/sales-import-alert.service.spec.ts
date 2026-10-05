import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Smtp } from 'src/common/smtp/smtp';
import { PrismaModule } from 'src/prisma/prisma.module';
import {
  DEFAULT_SALES_IMPORT_ALERT_EMAILS,
  isSalesImportLastAttempt,
  SalesImportAlertService,
  SalesImportFailureAlert,
} from 'src/integrations/sales-import/sales-import-alert.service';
import { SalesImportModule } from 'src/integrations/sales-import/sales-import.module';

const mockSendMail = jest.fn();

jest.mock('src/common/smtp/smtp', () => ({
  Smtp: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

const BRUNO = 'bruno.saibert@overgroup.com.br';

function sentryContext(current: SalesImportFailureAlert) {
  return {
    extra: {
      partner: current.partner,
      companyId: current.companyId,
      date: current.date,
      jobId: current.jobId,
      kind: current.kind,
    },
    tags: {
      partner: current.partner,
      companyId: current.companyId,
      date: current.date ?? '',
      jobId: current.jobId ?? '',
      kind: current.kind,
    },
  };
}

function alert(
  overrides: Partial<SalesImportFailureAlert> = {},
): SalesImportFailureAlert {
  return {
    partner: 'vmlav',
    companyId: 'company-1',
    kind: 'catchup',
    date: '2026-10-01',
    jobId: 'vmlav-import:company-1:2026-10-01:1400',
    attempts: 3,
    failedAt: new Date('2026-10-02T14:10:00.000Z'),
    error: new Error('timeout no parceiro'),
    ...overrides,
  };
}

describe('SalesImportAlertService', () => {
  let service: SalesImportAlertService;

  const mockPrisma = {
    company: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    delete process.env.SALES_IMPORT_ALERT_EMAIL;
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue(undefined);
    (Sentry.captureException as jest.Mock).mockReset();
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'De Praxe',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesImportAlertService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(SalesImportAlertService);
  });

  it('expõe o destinatário padrão Bruno', () => {
    expect(DEFAULT_SALES_IMPORT_ALERT_EMAILS).toEqual([BRUNO]);
  });

  it('envia para Bruno quando a env não está definida', async () => {
    const error = new Error('timeout no parceiro');
    await service.notify(alert({ error }));

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = mockSendMail.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(to).toBe(BRUNO);
    expect(subject).toContain('vmlav');
    expect(html).toContain('vmlav');
    expect(html).toContain('De Praxe');
    expect(html).toContain('company-1');
    expect(html).toContain('catch-up do dia');
    expect(html).toContain('2026-10-01');
    expect(html).toContain('2026-10-02T14:10:00.000Z');
    expect(html).toContain('vmlav-import:company-1:2026-10-01:1400');
    expect(html).toContain('3');
    expect(html).toContain('timeout no parceiro');
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'company-1' } }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      sentryContext(alert({ error })),
    );
  });

  it('descreve backfill de 90 dias no corpo', async () => {
    await service.notify(alert({ kind: 'backfill90', date: undefined }));

    const html = mockSendMail.mock.calls[0][2] as string;
    expect(html).toContain('backfill de 90 dias');
  });

  it('ignora o e-mail do Andrey mesmo quando a env o inclui', async () => {
    process.env.SALES_IMPORT_ALERT_EMAIL =
      'andrey@overgroup.com.br, bruno.saibert@overgroup.com.br';

    await service.notify(alert());

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0]).toBe(BRUNO);
  });

  it('usa SALES_IMPORT_ALERT_EMAIL separado por vírgula, com trim', async () => {
    process.env.SALES_IMPORT_ALERT_EMAIL =
      ' ops@overgroup.com.br , outro@overgroup.com.br ';

    await service.notify(alert());

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0]).toBe(
      'ops@overgroup.com.br,outro@overgroup.com.br',
    );
  });

  it('não chama sendMail de novo na mesma empresa+parceiro+data na mesma hora UTC', async () => {
    const first = alert({
      failedAt: new Date('2026-10-02T14:10:00.000Z'),
    });
    const second = alert({
      failedAt: new Date('2026-10-02T14:50:00.000Z'),
      error: new Error('outra falha'),
    });

    await service.notify(first);
    await service.notify(second);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('envia de novo em outra hora UTC', async () => {
    await service.notify(alert({ failedAt: new Date('2026-10-02T14:10:00.000Z') }));
    await service.notify(alert({ failedAt: new Date('2026-10-02T15:00:00.000Z') }));

    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('captura no Sentry e não relança quando sendMail falha', async () => {
    const error = new Error('timeout no parceiro');
    mockSendMail.mockRejectedValue(new Error('smtp down'));

    await expect(service.notify(alert({ error }))).resolves.toBeUndefined();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      sentryContext(alert({ error })),
    );
    expect(Smtp).toHaveBeenCalled();
  });
});

describe('isSalesImportLastAttempt', () => {
  it('é verdadeiro quando attemptsMade + 1 >= attempts', () => {
    expect(
      isSalesImportLastAttempt({ attemptsMade: 2, opts: { attempts: 3 } }),
    ).toBe(true);
    expect(
      isSalesImportLastAttempt({ attemptsMade: 0, opts: { attempts: 1 } }),
    ).toBe(true);
    expect(
      isSalesImportLastAttempt({ attemptsMade: 1, opts: { attempts: 3 } }),
    ).toBe(false);
  });
});

describe('SalesImportModule', () => {
  it('importa PrismaModule e exporta SalesImportAlertService', () => {
    expect(Reflect.getMetadata('imports', SalesImportModule)).toContain(
      PrismaModule,
    );
    expect(Reflect.getMetadata('providers', SalesImportModule)).toContain(
      SalesImportAlertService,
    );
    expect(Reflect.getMetadata('exports', SalesImportModule)).toContain(
      SalesImportAlertService,
    );
  });
});

import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { GTM_CODE_MESSAGE, META_PIXEL_CODE_MESSAGE } from 'src/traffic/domain/tracking-messages';
import { CompanyGtmContainerService } from 'src/traffic/application/company-gtm-container.service';
import { CompanyMetaPixelService } from 'src/traffic/application/company-meta-pixel.service';
import { TrafficReadGuard } from 'src/traffic/presentation/traffic-read.guard';
import { TrafficTrackingController } from 'src/traffic/presentation/traffic-tracking.controller';
import * as request from 'supertest';

function pixelSnippet(id = '1234567890') {
  return `<script>
'https://connect.facebook.net/en_US/fbevents.js';
fbq('init', '${id}');
</script>
<img src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1" />`;
}

function gtmSnippet(id = 'GTM-ABCDEFGH') {
  return `<script>
'https://www.googletagmanager.com/gtm.js?id='
})(window,document,'script','dataLayer','${id}');
</script>`;
}

function memoryPrisma() {
  const pixels = new Map<string, { companyId: string; pixelId: string; enabled: boolean }>();
  const containers = new Map<string, { companyId: string; containerId: string; enabled: boolean }>();

  return {
    pixels,
    containers,
    companyMetaPixel: {
      findUnique: async ({ where }: { where: { companyId: string } }) => pixels.get(where.companyId) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const current = pixels.get(where.companyId);
        const row = current ? { ...current, ...update } : { ...create };
        pixels.set(where.companyId, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const current = pixels.get(where.companyId);
        const row = { ...current, ...data };
        pixels.set(where.companyId, row);
        return row;
      },
      deleteMany: async ({ where }: { where: { companyId: string } }) => {
        const existed = pixels.delete(where.companyId);
        return { count: existed ? 1 : 0 };
      },
    },
    companyGtmContainer: {
      findUnique: async ({ where }: { where: { companyId: string } }) => containers.get(where.companyId) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const current = containers.get(where.companyId);
        const row = current ? { ...current, ...update } : { ...create };
        containers.set(where.companyId, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const current = containers.get(where.companyId);
        const row = { ...current, ...data };
        containers.set(where.companyId, row);
        return row;
      },
      deleteMany: async ({ where }: { where: { companyId: string } }) => {
        const existed = containers.delete(where.companyId);
        return { count: existed ? 1 : 0 };
      },
    },
  };
}

describe('company tracking services', () => {
  const prisma = memoryPrisma();
  const pixel = new CompanyMetaPixelService(prisma as any);
  const gtm = new CompanyGtmContainerService(prisma as any);

  beforeEach(() => {
    prisma.pixels.clear();
    prisma.containers.clear();
  });

  it('returns a null id and enabled false when the row is missing', async () => {
    await expect(pixel.get('company-1')).resolves.toEqual({ pixelId: null, enabled: false });
    await expect(gtm.get('company-1')).resolves.toEqual({ containerId: null, enabled: false });
  });

  it('updates only the switch when enabled is sent for an existing row', async () => {
    await pixel.save('company-1', { baseCode: pixelSnippet() });
    const paused = await pixel.save('company-1', { enabled: false });
    expect(paused).toEqual({ pixelId: '1234567890', enabled: false });

    await gtm.save('company-1', { baseCode: gtmSnippet() });
    const gtmPaused = await gtm.save('company-1', { enabled: false });
    expect(gtmPaused).toEqual({ containerId: 'GTM-ABCDEFGH', enabled: false });
  });

  it('responds 400 with the product message when saving without code and without a row', async () => {
    await expect(pixel.save('company-1', { enabled: true })).rejects.toMatchObject({
      response: { message: META_PIXEL_CODE_MESSAGE },
    });
    await expect(gtm.save('company-1', {})).rejects.toBeInstanceOf(BadRequestException);
    try {
      await gtm.save('company-1', {});
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({ message: GTM_CODE_MESSAGE });
    }
  });

  it('deletes a missing row and does not remove the other product', async () => {
    await pixel.save('company-1', { baseCode: pixelSnippet() });
    await gtm.save('company-1', { baseCode: gtmSnippet() });

    await expect(pixel.remove('missing')).resolves.toBeUndefined();
    await pixel.remove('company-1');

    await expect(pixel.get('company-1')).resolves.toEqual({ pixelId: null, enabled: false });
    await expect(gtm.get('company-1')).resolves.toEqual({ containerId: 'GTM-ABCDEFGH', enabled: true });

    await gtm.remove('company-1');
    await expect(gtm.get('company-1')).resolves.toEqual({ containerId: null, enabled: false });
    await expect(pixel.get('company-1')).resolves.toEqual({ pixelId: null, enabled: false });
  });
});

describe('TrafficTrackingController', () => {
  let app: INestApplication;
  const prisma = memoryPrisma();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TrafficTrackingController],
      providers: [
        { provide: CompanyMetaPixelService, useValue: new CompanyMetaPixelService(prisma as any) },
        { provide: CompanyGtmContainerService, useValue: new CompanyGtmContainerService(prisma as any) },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(TrafficReadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.pixels.clear();
    prisma.containers.clear();
  });

  it('answers 204 with an empty body when deleting a missing row', async () => {
    const response = await request(app.getHttpServer()).delete('/companies/company-1/traffic/pixel');
    expect(response.status).toBe(204);
    expect(response.text).toBe('');

    const gtm = await request(app.getHttpServer()).delete('/companies/company-1/traffic/gtm');
    expect(gtm.status).toBe(204);
    expect(gtm.text).toBe('');
  });

  it('answers 400 with the product message when the code is missing', async () => {
    const pixelResponse = await request(app.getHttpServer())
      .put('/companies/company-1/traffic/pixel')
      .send({ enabled: true });
    expect(pixelResponse.status).toBe(400);
    expect(pixelResponse.body).toEqual({ message: META_PIXEL_CODE_MESSAGE });

    const gtmResponse = await request(app.getHttpServer())
      .put('/companies/company-1/traffic/gtm')
      .send({});
    expect(gtmResponse.status).toBe(400);
    expect(gtmResponse.body).toEqual({ message: GTM_CODE_MESSAGE });
  });
});

describe('TrafficReadGuard', () => {
  const guard = new TrafficReadGuard();

  function context(user: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }

  it('allows traffic.read and rejects everyone else', () => {
    expect(guard.canActivate(context({ accessRules: [{ module: 'traffic', action: 'read' }] }))).toBe(true);
    expect(guard.canActivate(context({ accessRules: ['traffic.read'] }))).toBe(true);
    expect(() => guard.canActivate(context({ accessRules: [{ module: 'campaigns', action: 'read' }] }))).toThrow();
  });
});

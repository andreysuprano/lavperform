import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  chooseModel,
  imageOutputModels,
  OPENROUTER_MODELS_URL,
  parseOpenRouterModels,
  type ModelChoice,
  type OpenRouterModel,
} from './openrouter.models';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from './openrouter.types';

export const AI_MODEL_SETTING_ID = 'default';

export type StoredAiModels = {
  textModel: string | null;
  imageModel: string | null;
};

type SettingDelegate = {
  findUnique(args: {
    where: { id: string };
  }): Promise<(StoredAiModels & { updatedById?: string | null }) | null>;
  upsert(args: {
    where: { id: string };
    create: StoredAiModels & { id: string; updatedById: string | null };
    update: StoredAiModels & { updatedById: string | null };
  }): Promise<StoredAiModels>;
};

export type AiModelsView = {
  provider: 'openrouter';
  text: ModelChoice & { stored: string | null };
  image: ModelChoice & { stored: string | null };
  models: OpenRouterModel[];
  imageModels: OpenRouterModel[];
  catalogAvailable: boolean;
};

@Injectable()
export class AiModelSettingsService {
  private storedCache: { at: number; row: StoredAiModels } | null = null;
  private catalogCache: { at: number; models: OpenRouterModel[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async resolveTextModel(): Promise<ModelChoice> {
    return this.resolve('text');
  }

  async resolveImageModel(): Promise<ModelChoice> {
    return this.resolve('image');
  }

  async getView(): Promise<AiModelsView> {
    const stored = await this.readStored();
    const catalog = await this.readCatalog();
    return {
      provider: 'openrouter',
      text: {
        ...this.choice('text', stored, catalog),
        stored: stored.textModel,
      },
      image: {
        ...this.choice('image', stored, catalog),
        stored: stored.imageModel,
      },
      models: catalog ?? [],
      imageModels: catalog ? imageOutputModels(catalog) : [],
      catalogAvailable: catalog !== null,
    };
  }

  async save(
    input: { textModel?: string | null; imageModel?: string | null },
    updatedById: string | null,
  ): Promise<AiModelsView> {
    const current = await this.readStored(true);
    const textModel =
      input.textModel === undefined
        ? current.textModel
        : this.normalize(input.textModel);
    const imageModel =
      input.imageModel === undefined
        ? current.imageModel
        : this.normalize(input.imageModel);

    if (textModel || imageModel) {
      const catalog = await this.readCatalog({ fresh: true });
      if (!catalog) {
        throw new ServiceUnavailableException(
          'Não foi possível carregar os modelos da OpenRouter',
        );
      }
      this.assertChoice(textModel, 'text', catalog);
      this.assertChoice(imageModel, 'image', catalog);
    }

    await this.delegate().upsert({
      where: { id: AI_MODEL_SETTING_ID },
      create: {
        id: AI_MODEL_SETTING_ID,
        textModel,
        imageModel,
        updatedById,
      },
      update: { textModel, imageModel, updatedById },
    });
    this.storedCache = null;
    return this.getView();
  }

  private async resolve(kind: 'text' | 'image'): Promise<ModelChoice> {
    const stored = await this.readStored();
    const catalog = await this.readCatalog();
    return this.choice(kind, stored, catalog);
  }

  private choice(
    kind: 'text' | 'image',
    stored: StoredAiModels,
    catalog: OpenRouterModel[] | null,
  ): ModelChoice {
    return chooseModel({
      kind,
      stored: kind === 'text' ? stored.textModel : stored.imageModel,
      envValue:
        kind === 'text'
          ? process.env.OPENROUTER_TEXT_MODEL
          : process.env.OPENROUTER_IMAGE_MODEL,
      fallback: kind === 'text' ? DEFAULT_TEXT_MODEL : DEFAULT_IMAGE_MODEL,
      catalog,
    });
  }

  private assertChoice(
    id: string | null,
    kind: 'text' | 'image',
    catalog: OpenRouterModel[],
  ) {
    if (!id) return;
    const found = catalog.find((model) => model.id === id);
    if (!found) {
      throw new BadRequestException(
        kind === 'text'
          ? 'O modelo de texto não está disponível na OpenRouter'
          : 'O modelo de imagem não está disponível na OpenRouter',
      );
    }
    if (kind === 'image' && !found.imageOutput) {
      throw new BadRequestException('O modelo de imagem precisa gerar imagem');
    }
  }

  private normalize(value: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private delegate(): SettingDelegate {
    return (this.prisma as unknown as { aiModelSetting: SettingDelegate })
      .aiModelSetting;
  }

  private settingsTtl(): number {
    const raw = Number(process.env.AI_MODEL_SETTINGS_CACHE_MS ?? 15_000);
    return Number.isFinite(raw) && raw >= 0 ? raw : 15_000;
  }

  private catalogTtl(): number {
    const raw = Number(process.env.AI_MODEL_CATALOG_CACHE_MS ?? 60_000);
    return Number.isFinite(raw) && raw >= 0 ? raw : 60_000;
  }

  private async readStored(fresh = false): Promise<StoredAiModels> {
    const now = Date.now();
    if (
      !fresh &&
      this.storedCache &&
      now - this.storedCache.at < this.settingsTtl()
    ) {
      return this.storedCache.row;
    }
    const row = await this.delegate().findUnique({
      where: { id: AI_MODEL_SETTING_ID },
    });
    const stored = {
      textModel: row?.textModel?.trim() || null,
      imageModel: row?.imageModel?.trim() || null,
    };
    this.storedCache = { at: now, row: stored };
    return stored;
  }

  private async readCatalog(options?: {
    fresh?: boolean;
  }): Promise<OpenRouterModel[] | null> {
    const now = Date.now();
    if (
      !options?.fresh &&
      this.catalogCache &&
      now - this.catalogCache.at < this.catalogTtl()
    ) {
      return this.catalogCache.models;
    }
    const models = await this.loadCatalog();
    if (models) this.catalogCache = { at: now, models };
    return models;
  }

  private async loadCatalog(): Promise<OpenRouterModel[] | null> {
    const configured = Number(process.env.OPENROUTER_TIMEOUT_MS || 15_000);
    const timeoutMs =
      Number.isFinite(configured) && configured > 0
        ? Math.min(configured, 15_000)
        : 15_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'HTTP-Referer':
          process.env.OPENROUTER_HTTP_REFERER?.trim() ||
          'https://lavperform.com',
        'X-Title': 'LavPerform',
      };
      const apiKey = process.env.OPENROUTER_API_KEY?.trim();
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return parseOpenRouterModels(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

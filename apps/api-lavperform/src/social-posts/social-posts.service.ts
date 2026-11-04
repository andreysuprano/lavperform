import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpenRouterClient } from '../integrations/openrouter/openrouter.client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandIdentityDto } from './dto/brand-identity.dto';
import {
  CreateSocialDraftDto,
  UpdateVariationDto,
} from './dto/social-post.dto';
import { buildDefaultLayers, buildSlides } from './domain/post-layers';
import {
  REFERENCE_LIMIT,
  parseReferenceDataUrl,
  referenceLimitMessage,
} from './domain/reference-image';
import {
  buildCopyMessages,
  buildImagePrompt,
  buildRevisionImagePrompt,
  buildRevisionMessages,
  buildRewriteMessages,
  parseGenerationJson,
} from './domain/prompts';
import {
  applyRevisionToSlides,
  describeRevision,
  isUselessPrompt,
  parseRevisionPlan,
  type RevisionPlan,
} from './domain/revision';
import {
  ART_STYLES,
  CAPTION_LENGTHS,
  DEFAULT_BRAND,
  FONT_OPTIONS,
  POST_FORMATS,
  POST_OBJECTIVES,
  TONE_OPTIONS,
  VARIATION_BATCH,
  type ArtStyle,
  type BrandSnapshot,
  type CaptionLength,
  type GeneratedCopy,
  type PostFormat,
  type PostLayer,
  type PostObjective,
  type PostSlide,
} from './domain/social-post.types';

const LOGO_PREFIXES = ['data:image/', 'https://', 'http://', '/'];

@Injectable()
export class SocialPostsService {
  private readonly revisionQueues = new Map<string, Promise<unknown>>();
  private referenceWarning: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  async getBrand(userId: string, companyId: string) {
    await this.ensureCompanyAccess(userId, companyId);
    const saved = await this.prisma.brandIdentity.findUnique({
      where: { companyId },
    });
    if (!saved) {
      return { ...DEFAULT_BRAND, companyId, id: null, persisted: false };
    }
    return { ...this.toBrand(saved), companyId, id: saved.id, persisted: true };
  }

  async saveBrand(
    userId: string,
    companyId: string,
    dto: UpdateBrandIdentityDto,
  ) {
    await this.ensureCompanyAccess(userId, companyId);
    this.assertLogo(dto.logoLightUrl);
    this.assertLogo(dto.logoDarkUrl);
    const tones = dto.tones.filter((tone) =>
      (TONE_OPTIONS as readonly string[]).includes(tone),
    );
    const titleFont = (FONT_OPTIONS as readonly string[]).includes(
      dto.titleFont,
    )
      ? dto.titleFont
      : DEFAULT_BRAND.titleFont;
    const bodyFont = (FONT_OPTIONS as readonly string[]).includes(dto.bodyFont)
      ? dto.bodyFont
      : DEFAULT_BRAND.bodyFont;

    const data = {
      logoLightUrl: this.emptyToNull(dto.logoLightUrl),
      logoDarkUrl: this.emptyToNull(dto.logoDarkUrl),
      primaryColor: dto.primaryColor,
      deepColor: dto.deepColor,
      accentColor: dto.accentColor,
      neutralColor: dto.neutralColor,
      titleFont,
      bodyFont,
      tones: tones.length ? tones : [...DEFAULT_BRAND.tones],
      voiceNotes: this.emptyToNull(dto.voiceNotes),
      references: this.emptyToNull(dto.references),
    };

    const saved = await this.prisma.brandIdentity.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });
    return { ...this.toBrand(saved), companyId, id: saved.id, persisted: true };
  }

  async listDrafts(userId: string, companyId: string) {
    await this.ensureCompanyAccess(userId, companyId);
    const drafts = await this.prisma.socialPostDraft.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        variations: {
          select: { id: true, position: true, headline: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return drafts.map((draft) => ({
      id: draft.id,
      objective: draft.objective,
      theme: draft.theme,
      format: draft.format,
      slideCount: draft.slideCount,
      updatedAt: draft.updatedAt,
      selectedVariationId: draft.selectedVariationId,
      variationCount: draft.variations.length,
      headline: draft.variations[0]?.headline ?? null,
    }));
  }

  async createDraft(userId: string, dto: CreateSocialDraftDto) {
    await this.ensureCompanyAccess(userId, dto.companyId);
    const format = dto.format as PostFormat;
    const slideCount = format === 'carousel' ? (dto.slideCount ?? 4) : 1;
    return this.prisma.socialPostDraft.create({
      data: {
        companyId: dto.companyId,
        objective: dto.objective,
        theme: dto.theme.trim(),
        format,
        slideCount,
        artStyle: dto.artStyle,
        includeCaption: dto.includeCaption ?? true,
        imageModel: dto.imageModel?.trim() || null,
      },
      include: { variations: true },
    });
  }

  async getDraft(userId: string, draftId: string) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    await this.refreshReferenceWarning(draftId);
    return this.presentDraft(draft);
  }

  async generate(userId: string, draftId: string) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    const copies = await this.createVariations(draft, 0, true);
    return copies;
  }

  async generateMore(userId: string, draftId: string) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    const offset =
      draft.variations.reduce((max, item) => Math.max(max, item.position), 0) +
      1;
    return this.createVariations(draft, offset, false);
  }

  async selectVariation(userId: string, draftId: string, variationId: string) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    if (!draft.variations.some((item) => item.id === variationId)) {
      throw new NotFoundException('Variação não encontrada neste rascunho');
    }
    await this.prisma.socialPostDraft.update({
      where: { id: draftId },
      data: { selectedVariationId: variationId },
    });
    return this.getDraft(userId, draftId);
  }

  async updateVariation(
    userId: string,
    variationId: string,
    dto: UpdateVariationDto,
  ) {
    const variation = await this.loadVariation(variationId);
    await this.ensureCompanyAccess(userId, variation.draft.companyId);
    const slides = this.readSlides(variation.slides);
    const slideIndex = dto.slideIndex ?? 0;
    if (dto.layers) {
      const slide = slides[slideIndex];
      if (!slide) throw new BadRequestException('Slide inexistente');
      const background = slide.backgroundImage;
      slide.layers = dto.layers as PostLayer[];
      slide.backgroundImage = background;
      slides[slideIndex] = slide;
    }

    const headline =
      dto.headline ??
      dto.layers?.find((layer) => layer.type === 'title')?.text ??
      variation.headline;

    const updated = await this.prisma.socialPostVariation.update({
      where: { id: variationId },
      data: {
        headline,
        badgeText:
          dto.badgeText !== undefined ? dto.badgeText : variation.badgeText,
        activeCaption: dto.activeCaption ?? variation.activeCaption,
        captionShort: dto.captionShort ?? variation.captionShort,
        captionMedium: dto.captionMedium ?? variation.captionMedium,
        captionLong: dto.captionLong ?? variation.captionLong,
        hashtags: dto.hashtags ?? variation.hashtags,
        slides: slides as unknown as Prisma.InputJsonValue,
      },
    });
    return this.presentVariation(updated);
  }

  async regenerateBackground(
    userId: string,
    variationId: string,
    slideIndex = 0,
  ) {
    const variation = await this.loadVariation(variationId);
    await this.ensureCompanyAccess(userId, variation.draft.companyId);
    const brand = await this.brandFor(variation.draft.companyId);
    const slides = this.readSlides(variation.slides);
    const slide = slides[slideIndex];
    if (!slide) throw new BadRequestException('Slide inexistente');
    const image = await this.generateBackground(
      variation.draft.id,
      buildImagePrompt({
        theme: variation.draft.theme,
        artStyle: variation.draft.artStyle as ArtStyle,
        brand,
        format: variation.draft.format as PostFormat,
      }),
    );
    slide.backgroundImage = image;
    slides[slideIndex] = slide;
    const updated = await this.prisma.socialPostVariation.update({
      where: { id: variationId },
      data: { slides: slides as unknown as Prisma.InputJsonValue },
    });
    return this.presentVariation(updated);
  }

  async rewriteCaption(
    userId: string,
    variationId: string,
    length: CaptionLength,
  ) {
    const variation = await this.loadVariation(variationId);
    await this.ensureCompanyAccess(userId, variation.draft.companyId);
    const company = await this.prisma.company.findUnique({
      where: { id: variation.draft.companyId },
      select: { name: true },
    });
    const brand = await this.brandFor(variation.draft.companyId);
    const messages = buildRewriteMessages({
      companyName: company?.name ?? 'Lavanderia',
      brand,
      theme: variation.draft.theme,
      headline: variation.headline,
      length,
    });
    const text = await this.openRouter.completeText([
      { role: 'system', content: messages.system },
      { role: 'user', content: messages.user },
    ]);
    const field =
      length === 'short'
        ? 'captionShort'
        : length === 'medium'
          ? 'captionMedium'
          : 'captionLong';
    const updated = await this.prisma.socialPostVariation.update({
      where: { id: variationId },
      data: { [field]: text, activeCaption: length },
    });
    return this.presentVariation(updated);
  }

  private async createVariations(
    draft: Awaited<ReturnType<SocialPostsService['loadDraft']>>,
    positionOffset: number,
    replace: boolean,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: draft.companyId },
      select: { name: true },
    });
    const brand = await this.brandFor(draft.companyId);
    const copies = await this.requestCopies({
      companyName: company?.name ?? 'Lavanderia',
      brand,
      objective: draft.objective as PostObjective,
      theme: draft.theme,
      format: draft.format as PostFormat,
      includeCaption: draft.includeCaption,
    });
    const images = await this.mapPool(copies, 2, () =>
      this.generateBackground(
        draft.id,
        buildImagePrompt({
          theme: draft.theme,
          artStyle: draft.artStyle as ArtStyle,
          brand,
          format: draft.format as PostFormat,
        }),
      ),
    );
    const referenceIds = (await this.listActiveReferences(draft.id)).map(
      (item) => item.id,
    );

    await this.prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.socialPostVariation.deleteMany({
          where: { draftId: draft.id },
        });
      }
      const rows: { id: string }[] = [];
      for (let index = 0; index < copies.length; index += 1) {
        const copy = copies[index];
        const layers = buildDefaultLayers(brand, copy);
        const slides = buildSlides(images[index], layers, draft.slideCount);
        const row = await tx.socialPostVariation.create({
          data: {
            draftId: draft.id,
            position: positionOffset + index,
            headline: copy.headline,
            badgeText: copy.badgeText || null,
            captionShort: copy.captionShort,
            captionMedium: copy.captionMedium,
            captionLong: copy.captionLong,
            activeCaption: 'medium',
            hashtags: copy.hashtags,
            slides: slides as unknown as Prisma.InputJsonValue,
          },
        });
        const version = await tx.socialPostVersion.create({
          data: {
            variationId: row.id,
            number: 1,
            source: 'generation',
            assistantReply: 'Versão inicial pronta.',
            headline: copy.headline,
            badgeText: copy.badgeText || null,
            captionShort: copy.captionShort,
            captionMedium: copy.captionMedium,
            captionLong: copy.captionLong,
            activeCaption: 'medium',
            hashtags: copy.hashtags,
            slides: slides as unknown as Prisma.InputJsonValue,
            referenceIds,
          },
        });
        await tx.socialPostVariation.update({
          where: { id: row.id },
          data: { selectedVersionId: version.id },
        });
        rows.push(row);
      }
      await tx.socialPostDraft.update({
        where: { id: draft.id },
        data: {
          selectedVariationId: replace
            ? (rows[0]?.id ?? null)
            : (draft.selectedVariationId ?? rows[0]?.id ?? null),
        },
      });
      return rows;
    });

    const fresh = await this.loadDraft(draft.id);
    await this.refreshReferenceWarning(draft.id);
    return this.presentDraft(fresh);
  }

  private async requestCopies(input: {
    companyName: string;
    brand: BrandSnapshot;
    objective: PostObjective;
    theme: string;
    format: PostFormat;
    includeCaption: boolean;
  }): Promise<GeneratedCopy[]> {
    const messages = buildCopyMessages({ ...input, count: VARIATION_BATCH });
    const first = await this.openRouter.completeText([
      { role: 'system', content: messages.system },
      { role: 'user', content: messages.user },
    ]);
    try {
      return parseGenerationJson(first, VARIATION_BATCH);
    } catch {
      const second = await this.openRouter.completeText([
        { role: 'system', content: messages.system },
        {
          role: 'user',
          content: `${messages.user}\n\nA resposta anterior não era JSON válido. Responda só o JSON.`,
        },
      ]);
      try {
        return parseGenerationJson(second, VARIATION_BATCH);
      } catch {
        throw new BadRequestException(
          'A IA não devolveu as variações no formato esperado. Tente gerar de novo.',
        );
      }
    }
  }

  private async brandFor(companyId: string): Promise<BrandSnapshot> {
    const saved = await this.prisma.brandIdentity.findUnique({
      where: { companyId },
    });
    return saved ? this.toBrand(saved) : { ...DEFAULT_BRAND };
  }

  private toBrand(saved: {
    logoLightUrl: string | null;
    logoDarkUrl: string | null;
    primaryColor: string;
    deepColor: string;
    accentColor: string;
    neutralColor: string;
    titleFont: string;
    bodyFont: string;
    tones: string[];
    voiceNotes: string | null;
    references: string | null;
  }): BrandSnapshot {
    return {
      logoLightUrl: saved.logoLightUrl,
      logoDarkUrl: saved.logoDarkUrl,
      primaryColor: saved.primaryColor,
      deepColor: saved.deepColor,
      accentColor: saved.accentColor,
      neutralColor: saved.neutralColor,
      titleFont: saved.titleFont,
      bodyFont: saved.bodyFont,
      tones: saved.tones,
      voiceNotes: saved.voiceNotes,
      references: saved.references,
    };
  }

  async revise(userId: string, variationId: string, prompt: string) {
    if (isUselessPrompt(prompt)) {
      throw new BadRequestException(
        'Escreva o que você quer mudar no fundo, no título ou na legenda.',
      );
    }
    return this.enqueueRevision(variationId, () =>
      this.reviseUnlocked(userId, variationId, prompt.trim()),
    );
  }

  async restoreVersion(userId: string, variationId: string, versionId: string) {
    return this.enqueueRevision(variationId, async () => {
      const variation = await this.loadVariation(variationId);
      await this.ensureCompanyAccess(userId, variation.draft.companyId);
      const source = variation.versions.find((item) => item.id === versionId);
      if (!source) throw new NotFoundException('Versão não encontrada');
      await this.appendVersion(variation, {
        source: 'restore',
        prompt: null,
        assistantReply: `Voltei para a versão ${source.number}.`,
        headline: source.headline,
        badgeText: source.badgeText,
        captionShort: source.captionShort,
        captionMedium: source.captionMedium,
        captionLong: source.captionLong,
        activeCaption: source.activeCaption,
        hashtags: source.hashtags,
        slides: this.readSlides(source.slides),
      });
      return this.getDraft(userId, variation.draftId);
    });
  }

  async selectVersion(userId: string, variationId: string, versionId: string) {
    const variation = await this.loadVariation(variationId);
    await this.ensureCompanyAccess(userId, variation.draft.companyId);
    const source = variation.versions.find((item) => item.id === versionId);
    if (!source) throw new NotFoundException('Versão não encontrada');
    await this.mirrorVersion(variation.id, source);
    return this.getDraft(userId, variation.draftId);
  }

  async recordManualVersion(
    userId: string,
    variationId: string,
    dto: UpdateVariationDto,
  ) {
    return this.enqueueRevision(variationId, async () => {
      const variation = await this.loadVariation(variationId);
      await this.ensureCompanyAccess(userId, variation.draft.companyId);
      const current = this.snapshotFrom(variation);
      const slides = this.readSlides(current.slides);
      const slideIndex = dto.slideIndex ?? 0;
      if (dto.layers && slides[slideIndex]) {
        slides[slideIndex] = {
          ...slides[slideIndex],
          layers: dto.layers as PostLayer[],
        };
      }
      await this.appendVersion(variation, {
        source: 'manual',
        prompt: null,
        assistantReply: 'Ajuste manual salvo.',
        headline: dto.headline ?? current.headline,
        badgeText: dto.badgeText ?? current.badgeText,
        captionShort: dto.captionShort ?? current.captionShort,
        captionMedium: dto.captionMedium ?? current.captionMedium,
        captionLong: dto.captionLong ?? current.captionLong,
        activeCaption: dto.activeCaption ?? current.activeCaption,
        hashtags: dto.hashtags ?? current.hashtags,
        slides,
      });
      return this.getDraft(userId, variation.draftId);
    });
  }

  private async reviseUnlocked(
    userId: string,
    variationId: string,
    prompt: string,
  ) {
    const variation = await this.loadVariation(variationId);
    await this.ensureCompanyAccess(userId, variation.draft.companyId);
    const current = this.snapshotFrom(variation);
    const brand = await this.brandFor(variation.draft.companyId);
    const plan = await this.requestRevisionPlan({
      theme: variation.draft.theme,
      tones: brand.tones,
      headline: current.headline,
      captionMedium: current.captionMedium,
      prompt,
    });
    if (plan.nonsense) {
      throw new BadRequestException(
        plan.reply ||
          'Não entendi o pedido. Diga o que mudar no fundo, no título ou na legenda.',
      );
    }
    let newBackground: string | null = null;
    if (plan.regenerateBackground) {
      newBackground = await this.generateBackground(
        variation.draft.id,
        buildRevisionImagePrompt(
          buildImagePrompt({
            theme: variation.draft.theme,
            artStyle: variation.draft.artStyle as ArtStyle,
            brand,
            format: variation.draft.format as PostFormat,
          }),
          plan.backgroundInstruction || prompt,
        ),
      );
    }
    const slides = applyRevisionToSlides(
      this.readSlides(current.slides),
      plan,
      newBackground,
    );
    const assistantReply = describeRevision({
      backgroundChanged: Boolean(newBackground),
      headlineBefore: current.headline,
      headlineAfter: plan.headline ?? current.headline,
      captionBefore: [current.captionShort, current.captionMedium, current.captionLong].join(
        '\n',
      ),
      captionAfter: [
        plan.captionShort ?? current.captionShort,
        plan.captionMedium ?? current.captionMedium,
        plan.captionLong ?? current.captionLong,
      ].join('\n'),
      badgeBefore: current.badgeText,
      badgeAfter: plan.badgeText ?? current.badgeText,
    });
    await this.appendVersion(variation, {
      source: 'revision',
      prompt,
      assistantReply,
      headline: plan.headline ?? current.headline,
      badgeText: plan.badgeText ?? current.badgeText,
      captionShort: plan.captionShort ?? current.captionShort,
      captionMedium: plan.captionMedium ?? current.captionMedium,
      captionLong: plan.captionLong ?? current.captionLong,
      activeCaption: current.activeCaption,
      hashtags: plan.hashtags ?? current.hashtags,
      slides,
    });
    return this.getDraft(userId, variation.draftId);
  }

  private async requestRevisionPlan(input: {
    theme: string;
    tones: string[];
    headline: string;
    captionMedium: string;
    prompt: string;
  }): Promise<RevisionPlan> {
    const messages = buildRevisionMessages(input);
    const first = await this.openRouter.completeText([
      { role: 'system', content: messages.system },
      { role: 'user', content: messages.user },
    ]);
    try {
      return parseRevisionPlan(first);
    } catch {
      const second = await this.openRouter.completeText([
        { role: 'system', content: messages.system },
        {
          role: 'user',
          content: `${messages.user}\n\nResponda só o JSON pedido.`,
        },
      ]);
      try {
        return parseRevisionPlan(second);
      } catch {
        throw new BadGatewayException(
          'A OpenRouter não devolveu a revisão no formato esperado. Tente de novo.',
        );
      }
    }
  }

  private async appendVersion(
    variation: Awaited<ReturnType<SocialPostsService['loadVariation']>>,
    next: {
      source: string;
      prompt: string | null;
      assistantReply: string;
      headline: string;
      badgeText: string | null;
      captionShort: string;
      captionMedium: string;
      captionLong: string;
      activeCaption: string;
      hashtags: string[];
      slides: PostSlide[];
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const latest = await tx.socialPostVersion.findFirst({
        where: { variationId: variation.id },
        orderBy: { number: 'desc' },
      });
      const created = await tx.socialPostVersion.create({
        data: {
          variationId: variation.id,
          number: (latest?.number ?? 0) + 1,
          source: next.source,
          prompt: next.prompt,
          assistantReply: next.assistantReply,
          headline: next.headline,
          badgeText: next.badgeText,
          captionShort: next.captionShort,
          captionMedium: next.captionMedium,
          captionLong: next.captionLong,
          activeCaption: next.activeCaption,
          hashtags: next.hashtags,
          slides: next.slides as unknown as Prisma.InputJsonValue,
          referenceIds: (
            await this.listActiveReferences(variation.draftId)
          ).map((item) => item.id),
        },
      });
      await tx.socialPostVariation.update({
        where: { id: variation.id },
        data: {
          selectedVersionId: created.id,
          headline: next.headline,
          badgeText: next.badgeText,
          captionShort: next.captionShort,
          captionMedium: next.captionMedium,
          captionLong: next.captionLong,
          activeCaption: next.activeCaption,
          hashtags: next.hashtags,
          slides: next.slides as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  private async mirrorVersion(
    variationId: string,
    source: {
      id: string;
      headline: string;
      badgeText: string | null;
      captionShort: string;
      captionMedium: string;
      captionLong: string;
      activeCaption: string;
      hashtags: string[];
      slides: Prisma.JsonValue;
    },
  ) {
    await this.prisma.socialPostVariation.update({
      where: { id: variationId },
      data: {
        selectedVersionId: source.id,
        headline: source.headline,
        badgeText: source.badgeText,
        captionShort: source.captionShort,
        captionMedium: source.captionMedium,
        captionLong: source.captionLong,
        activeCaption: source.activeCaption,
        hashtags: source.hashtags,
        slides: source.slides as Prisma.InputJsonValue,
      },
    });
  }

  private snapshotFrom(
    variation: Awaited<ReturnType<SocialPostsService['loadVariation']>>,
  ) {
    const selected =
      variation.versions.find((item) => item.id === variation.selectedVersionId) ??
      variation.versions[variation.versions.length - 1];
    if (!selected) {
      return {
        headline: variation.headline,
        badgeText: variation.badgeText,
        captionShort: variation.captionShort,
        captionMedium: variation.captionMedium,
        captionLong: variation.captionLong,
        activeCaption: variation.activeCaption,
        hashtags: variation.hashtags,
        slides: variation.slides,
      };
    }
    return selected;
  }

  private enqueueRevision<T>(
    variationId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous = this.revisionQueues.get(variationId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    this.revisionQueues.set(
      variationId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  private presentDraft(
    draft: Awaited<ReturnType<SocialPostsService['loadDraft']>>,
  ) {
    return {
      id: draft.id,
      companyId: draft.companyId,
      objective: draft.objective,
      theme: draft.theme,
      format: draft.format,
      slideCount: draft.slideCount,
      artStyle: draft.artStyle,
      includeCaption: draft.includeCaption,
      selectedVariationId: draft.selectedVariationId,
      referenceWarning: this.referenceWarning,
      references: [...(draft.references ?? [])]
        .filter((item) => !item.removedAt)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ id: item.id, dataUrl: item.dataUrl })),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      variations: [...draft.variations]
        .sort((a, b) => a.position - b.position)
        .map((variation) =>
          this.presentVariation(
            variation,
            new Map(
              (draft.references ?? []).map((item) => [item.id, item.dataUrl]),
            ),
          ),
        ),
    };
  }

  private presentVariation(
    variation: {
    id: string;
    position: number;
    headline: string;
    badgeText: string | null;
    captionShort: string;
    captionMedium: string;
    captionLong: string;
    activeCaption: string;
    hashtags: string[];
    slides: Prisma.JsonValue;
    selectedVersionId?: string | null;
    versions?: Array<{
      id: string;
      number: number;
      source: string;
      prompt: string | null;
      assistantReply: string | null;
      headline: string;
      badgeText: string | null;
      captionShort: string;
      captionMedium: string;
      captionLong: string;
      activeCaption: string;
      hashtags: string[];
      slides: Prisma.JsonValue;
      referenceIds?: string[];
      createdAt: Date;
    }>;
  },
    referenceUrls: Map<string, string> = new Map(),
  ) {
    const versions = [...(variation.versions ?? [])].sort(
      (a, b) => a.number - b.number,
    );
    const selected =
      versions.find((item) => item.id === variation.selectedVersionId) ??
      versions[versions.length - 1];
    return {
      id: variation.id,
      position: variation.position,
      headline: selected?.headline ?? variation.headline,
      badgeText: selected?.badgeText ?? variation.badgeText,
      captionShort: selected?.captionShort ?? variation.captionShort,
      captionMedium: selected?.captionMedium ?? variation.captionMedium,
      captionLong: selected?.captionLong ?? variation.captionLong,
      activeCaption: selected?.activeCaption ?? variation.activeCaption,
      hashtags: selected?.hashtags ?? variation.hashtags,
      slides: this.readSlides(selected?.slides ?? variation.slides),
      selectedVersionId: selected?.id ?? variation.selectedVersionId ?? null,
      versions: versions.map((item) => ({
        id: item.id,
        number: item.number,
        source: item.source,
        prompt: item.prompt,
        assistantReply: item.assistantReply,
        headline: item.headline,
        badgeText: item.badgeText,
        captionShort: item.captionShort,
        captionMedium: item.captionMedium,
        captionLong: item.captionLong,
        activeCaption: item.activeCaption,
        hashtags: item.hashtags,
        slides: this.readSlides(item.slides),
        references: (item.referenceIds ?? [])
          .map((id) =>
            referenceUrls.has(id)
              ? { id, dataUrl: referenceUrls.get(id) as string }
              : null,
          )
          .filter((entry): entry is { id: string; dataUrl: string } =>
            Boolean(entry),
          ),
        createdAt: item.createdAt,
      })),
    };
  }

  private readSlides(value: Prisma.JsonValue): PostSlide[] {
    if (!Array.isArray(value)) return [];
    return value as unknown as PostSlide[];
  }

  private async loadDraft(draftId: string) {
    const draft = await this.prisma.socialPostDraft.findUnique({
      where: { id: draftId },
      include: {
        references: { orderBy: { position: 'asc' } },
        variations: { include: { versions: { orderBy: { number: 'asc' } } } },
      },
    });
    if (!draft) throw new NotFoundException('Rascunho não encontrado');
    return draft;
  }

  private async loadVariation(variationId: string) {
    const variation = await this.prisma.socialPostVariation.findUnique({
      where: { id: variationId },
      include: { draft: true, versions: { orderBy: { number: 'asc' } } },
    });
    if (!variation) throw new NotFoundException('Variação não encontrada');
    return variation;
  }

  private async generateBackground(draftId: string, prompt: string) {
    const refs = await this.listActiveReferences(draftId);
    const model = await this.draftImageModel(draftId);
    let urls = refs.map((item) => item.dataUrl);
    if (urls.length && this.openRouter.referenceCapability) {
      const capability = await this.openRouter.referenceCapability(model);
      if (!capability.accepts) {
        urls = [];
        this.referenceWarning = 'Este modelo não usa imagens de referência.';
      } else {
        this.referenceWarning = null;
      }
    }
    return this.openRouter.generateImage(prompt, urls, model);
  }

  private async refreshReferenceWarning(draftId: string) {
    const refs = await this.listActiveReferences(draftId);
    if (!refs.length || !this.openRouter.referenceCapability) {
      this.referenceWarning = null;
      return;
    }
    const capability = await this.openRouter.referenceCapability(
      await this.draftImageModel(draftId),
    );
    this.referenceWarning = capability.accepts
      ? null
      : 'Este modelo não usa imagens de referência.';
  }

  async imageModelStatus(model?: string) {
    const capability = this.openRouter.referenceCapability
      ? await this.openRouter.referenceCapability(model)
      : { accepts: true, suggestion: null };
    return {
      model: model?.trim() || this.openRouter.imageModel(),
      acceptsImages: capability.accepts,
      suggestion: capability.suggestion,
    };
  }

  private async draftImageModel(draftId: string) {
    const row = await this.prisma.socialPostDraft.findUnique({
      where: { id: draftId },
      select: { imageModel: true },
    });
    return row?.imageModel?.trim() || undefined;
  }

  private async listActiveReferences(draftId: string) {
    const model = this.prisma.socialPostReference;
    if (!model?.findMany) return [];
    return model.findMany({
      where: { draftId, removedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async addReference(userId: string, companyId: string, dataUrl: string) {
    await this.ensureCompanyAccess(userId, companyId);
    const parsed = parseReferenceDataUrl(dataUrl);
    const active = await this.prisma.socialPostReference.count({
      where: { companyId, userId, draftId: null, removedAt: null },
    });
    if (active >= REFERENCE_LIMIT) {
      throw new BadRequestException(referenceLimitMessage());
    }
    return this.prisma.socialPostReference.create({
      data: {
        companyId,
        userId,
        position: active,
        mimeType: parsed.mimeType,
        dataUrl,
      },
      select: { id: true, position: true, mimeType: true, dataUrl: true },
    });
  }

  async getReference(userId: string, referenceId: string) {
    const row = await this.prisma.socialPostReference.findUnique({
      where: { id: referenceId },
    });
    if (!row || row.removedAt) throw new NotFoundException('Imagem não encontrada');
    try {
      await this.ensureCompanyAccess(userId, row.companyId);
    } catch {
      throw new NotFoundException('Imagem não encontrada');
    }
    return { id: row.id, mimeType: row.mimeType, dataUrl: row.dataUrl };
  }

  async removeReference(userId: string, referenceId: string) {
    const row = await this.ownedReference(userId, referenceId);
    await this.prisma.socialPostReference.update({
      where: { id: row.id },
      data: { removedAt: new Date() },
    });
    return { id: row.id, removed: true };
  }

  async reorderReferences(userId: string, companyId: string, ids: string[]) {
    await this.ensureCompanyAccess(userId, companyId);
    const rows = await this.prisma.socialPostReference.findMany({
      where: { id: { in: ids }, companyId, removedAt: null },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException('Imagem não encontrada');
    }
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.socialPostReference.update({
          where: { id },
          data: { position },
        }),
      ),
    );
    return { ids };
  }

  async attachReferences(userId: string, draftId: string, ids: string[]) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    const unique = [...new Set(ids)].slice(0, REFERENCE_LIMIT);
    const rows = await this.prisma.socialPostReference.findMany({
      where: {
        id: { in: unique },
        companyId: draft.companyId,
        removedAt: null,
      },
    });
    if (rows.length !== unique.length) {
      throw new NotFoundException('Imagem não encontrada');
    }
    await this.prisma.$transaction(
      unique.map((id, position) =>
        this.prisma.socialPostReference.update({
          where: { id },
          data: { draftId, position },
        }),
      ),
    );
    return this.getDraft(userId, draftId);
  }

  private async ownedReference(userId: string, referenceId: string) {
    const row = await this.prisma.socialPostReference.findUnique({
      where: { id: referenceId },
    });
    if (!row || row.removedAt) throw new NotFoundException('Imagem não encontrada');
    try {
      await this.ensureCompanyAccess(userId, row.companyId);
    } catch {
      throw new NotFoundException('Imagem não encontrada');
    }
    return row;
  }

  private async ensureCompanyAccess(userId: string, companyId: string) {
    if (!userId) return;
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!link) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }
  }

  private assertLogo(value?: string | null) {
    if (!value) return;
    if (!LOGO_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      throw new BadRequestException(
        'Logo precisa ser uma imagem enviada ou uma URL',
      );
    }
  }

  private emptyToNull(value?: string | null) {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private async mapPool<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const run = async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, () => run()),
    );
    return results;
  }
}

export const SOCIAL_POST_ENUMS = {
  objectives: POST_OBJECTIVES,
  formats: POST_FORMATS,
  artStyles: ART_STYLES,
  captionLengths: CAPTION_LENGTHS,
};

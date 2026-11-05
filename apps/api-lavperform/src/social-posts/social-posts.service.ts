import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  OpenRouterClient,
  type PromptImage,
} from '../integrations/openrouter/openrouter.client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandIdentityDto } from './dto/brand-identity.dto';
import {
  CreateSocialDraftDto,
  StartGenerationDto,
  UpdateSocialDraftDto,
  UpdateVariationDto,
} from './dto/social-post.dto';
import {
  captionExcerpt,
  channelLabels,
  libraryStatus,
  thumbnailFromSlides,
} from './domain/library-status';
import { buildComposedSlides } from './domain/post-layers';
import {
  MEDIA_LIMIT,
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
  stripHashtags,
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
  private readonly generationJobs = new Map<string, Promise<void>>();
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
      include: {
        _count: { select: { variations: true } },
        variations: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            headline: true,
            captionShort: true,
            captionMedium: true,
            captionLong: true,
            activeCaption: true,
            slides: true,
          },
        },
        scheduledPosts: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { updatedAt: 'desc' },
          select: {
            status: true,
            channels: true,
            scheduledAt: true,
            publishedAt: true,
          },
        },
        references: {
          where: { removedAt: null },
          orderBy: { position: 'asc' },
          select: { id: true },
        },
      },
    });
    return drafts.map((draft) => this.presentLibrary(draft));
  }

  async createDraft(userId: string, dto: CreateSocialDraftDto) {
    await this.ensureCompanyAccess(userId, dto.companyId);
    const format = dto.format as PostFormat;
    const slideCount = format === 'carousel' ? (dto.slideCount ?? 4) : 1;
    const created = await this.prisma.socialPostDraft.create({
      data: {
        companyId: dto.companyId,
        objective: dto.objective,
        theme: dto.theme.trim(),
        format,
        slideCount,
        artStyle: dto.artStyle,
        includeCaption: dto.includeCaption ?? true,
        imageModel: dto.imageModel?.trim() || null,
        tone: dto.tone?.trim() || null,
        wizardStep: dto.wizardStep ?? 1,
        placement: dto.placement ?? 'feed',
        creativeFreedom: dto.creativeFreedom ?? false,
      },
      include: { variations: true },
    });
    if (dto.mediaIds) {
      await this.syncMedia(userId, created.id, dto.mediaIds);
    }
    return created;
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
    if (draft.theme.trim().length < 8) {
      throw new BadRequestException(
        'Descreva o tema com pelo menos 8 caracteres.',
      );
    }
    const copies = await this.createVariations(draft, 0, true);
    return copies;
  }

  async updateDraft(userId: string, draftId: string, dto: UpdateSocialDraftDto) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    if (draft.generationStatus === 'generating') {
      throw new BadRequestException('Este post está sendo gerado.');
    }
    const format = (dto.format ?? draft.format) as PostFormat;
    const placement = dto.placement ?? draft.placement;
    const slideCount =
      format === 'carousel' ? (dto.slideCount ?? draft.slideCount) : 1;
    await this.prisma.socialPostDraft.update({
      where: { id: draftId },
      data: {
        objective: dto.objective ?? draft.objective,
        theme: dto.theme?.trim() ?? draft.theme,
        format,
        slideCount,
        artStyle: dto.artStyle ?? draft.artStyle,
        includeCaption: dto.includeCaption ?? draft.includeCaption,
        tone: dto.tone !== undefined ? dto.tone.trim() || null : draft.tone,
        wizardStep: dto.wizardStep ?? draft.wizardStep,
        placement,
        creativeFreedom: dto.creativeFreedom ?? draft.creativeFreedom,
      },
    });
    if (dto.mediaIds) {
      await this.syncMedia(userId, draftId, dto.mediaIds);
    }
    return this.presentLibrary(await this.loadLibraryRow(draftId));
  }

  async startGeneration(
    userId: string,
    draftId: string,
    dto: StartGenerationDto = {},
  ) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    if (draft.theme.trim().length < 8) {
      throw new BadRequestException(
        'Descreva o tema com pelo menos 8 caracteres.',
      );
    }
    if (dto.creativeFreedom !== undefined) {
      await this.prisma.socialPostDraft.update({
        where: { id: draftId },
        data: { creativeFreedom: dto.creativeFreedom },
      });
    }
    if (dto.mediaIds) {
      await this.syncMedia(userId, draftId, dto.mediaIds);
    }
    if (draft.generationStatus !== 'generating') {
      await this.prisma.socialPostDraft.update({
        where: { id: draftId },
        data: { generationStatus: 'generating', generationError: null },
      });
      this.kickGeneration(userId, draftId);
    }
    return this.presentLibrary(await this.loadLibraryRow(draftId));
  }

  async uploadMedia(
    userId: string,
    companyId: string,
    file: { mimetype: string; buffer: Buffer; size: number },
  ) {
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
      throw new BadRequestException('Loja inválida.');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Envie JPG, PNG ou WEBP.');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException(
        'Não conseguimos ler esta imagem. Tente outra.',
      );
    }
    if (file.size > 10 * 1024 * 1024 || file.buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Cada imagem pode ter no máximo 10 MB.');
    }
    await this.ensureCompanyAccess(userId, companyId);
    const active = await this.prisma.socialPostReference.count({
      where: { companyId, userId, draftId: null, removedAt: null },
    });
    if (active >= MEDIA_LIMIT) {
      throw new BadRequestException('Até 10 fotos.');
    }
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const parsed = parseReferenceDataUrl(dataUrl);
    const saved = await this.prisma.socialPostReference.create({
      data: {
        companyId,
        userId,
        position: active,
        mimeType: parsed.mimeType,
        dataUrl,
      },
      select: { id: true },
    });
    return { id: saved.id, url: `/social-posts/media/${saved.id}` };
  }

  async readMedia(userId: string, mediaId: string) {
    const row = await this.getReference(userId, mediaId);
    const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(
      row.dataUrl,
    );
    if (!match) throw new BadRequestException('Imagem indisponível.');
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2].replace(/\s/g, ''), 'base64'),
    };
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
    const company = await this.prisma.company.findUnique({
      where: { id: variation.draft.companyId },
      select: { name: true },
    });
    const image = await this.generateArtwork(
      variation.draft,
      brand,
      company?.name ?? 'Lavanderia',
      {
        headline: variation.headline,
        badgeText: variation.badgeText ?? '',
        caption: variation.captionMedium,
        variationIndex: variation.position,
      },
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
    const text = stripHashtags(
      await this.openRouter.completeText([
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ]),
    );
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
    const voiced = draft.tone ? { ...brand, tones: [draft.tone] } : brand;
    const copies = await this.requestCopies({
      companyName: company?.name ?? 'Lavanderia',
      brand: voiced,
      objective: draft.objective as PostObjective,
      theme: draft.theme,
      format: draft.format as PostFormat,
      includeCaption: draft.includeCaption,
      creativeFreedom: draft.creativeFreedom,
      tone: draft.tone,
    });
    const images = await this.mapPool(copies, 2, (copy, index) =>
      this.generateArtwork(
        draft,
        brand,
        company?.name ?? 'Lavanderia',
        {
          headline: copy.headline,
          badgeText: copy.badgeText,
          caption: copy.captionMedium,
          variationIndex: positionOffset + index,
        },
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
        const slides = buildComposedSlides(images[index], draft.slideCount);
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
            hashtags: [],
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
            hashtags: [],
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
          generationStatus: 'generated',
          generationError: null,
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
    creativeFreedom?: boolean;
    tone?: string | null;
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
      const company = await this.prisma.company.findUnique({
        where: { id: variation.draft.companyId },
        select: { name: true },
      });
      newBackground = await this.generateArtwork(
        variation.draft,
        brand,
        company?.name ?? 'Lavanderia',
        {
          headline: plan.headline ?? current.headline,
          badgeText: plan.badgeText ?? current.badgeText ?? '',
          caption: plan.captionMedium ?? current.captionMedium,
          variationIndex: variation.position,
        },
        plan.backgroundInstruction || prompt,
      );
    }
    const slides = applyRevisionToSlides(
      this.readSlides(current.slides),
      plan,
      newBackground,
    );
    const headlineAfter = stripHashtags(plan.headline ?? current.headline);
    const captionShort = stripHashtags(plan.captionShort ?? current.captionShort);
    const captionMedium = stripHashtags(
      plan.captionMedium ?? current.captionMedium,
    );
    const captionLong = stripHashtags(plan.captionLong ?? current.captionLong);
    const badgeAfter = plan.badgeText ?? current.badgeText;
    const hashtagsAfter = plan.hashtags ?? current.hashtags;
    const assistantReply = describeRevision({
      backgroundChanged: Boolean(newBackground),
      headlineBefore: current.headline,
      headlineAfter,
      captionBefore: [
        current.captionShort,
        current.captionMedium,
        current.captionLong,
      ].join('\n'),
      captionAfter: [captionShort, captionMedium, captionLong].join('\n'),
      badgeBefore: current.badgeText,
      badgeAfter,
      hashtagsBefore: current.hashtags,
      hashtagsAfter,
    });
    const unchanged =
      !newBackground &&
      headlineAfter.trim() === current.headline.trim() &&
      captionShort === current.captionShort &&
      captionMedium === current.captionMedium &&
      captionLong === current.captionLong &&
      (badgeAfter ?? '') === (current.badgeText ?? '') &&
      hashtagsAfter.join('\n') === current.hashtags.join('\n');
    if (unchanged) {
      return this.getDraft(userId, variation.draftId);
    }
    await this.appendVersion(variation, {
      source: 'revision',
      prompt,
      assistantReply,
      headline: headlineAfter,
      badgeText: badgeAfter ? stripHashtags(badgeAfter) : badgeAfter,
      captionShort,
      captionMedium,
      captionLong,
      activeCaption: current.activeCaption,
      hashtags: [],
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
      variation.versions.find(
        (item) => item.id === variation.selectedVersionId,
      ) ?? variation.versions[variation.versions.length - 1];
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
      tone: draft.tone,
      wizardStep: draft.wizardStep,
      placement: draft.placement,
      creativeFreedom: draft.creativeFreedom,
      generationStatus: draft.generationStatus,
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

  private async generateArtwork(
    draft: {
      id: string;
      theme: string;
      artStyle: string;
      format: string;
      objective: string;
      creativeFreedom?: boolean;
      tone?: string | null;
    },
    brand: BrandSnapshot,
    companyName: string,
    copy: {
      headline: string;
      badgeText: string;
      caption: string;
      variationIndex: number;
    },
    adjustment?: string,
  ) {
    const refs = await this.listActiveReferences(draft.id);
    const model = await this.draftImageModel(draft.id);
    const images: PromptImage[] = [];
    const logo = brand.logoLightUrl || brand.logoDarkUrl;
    if (logo && /^(data:image\/|https?:\/\/)/.test(logo)) {
      images.push({ url: logo, role: 'logo' });
    }
    for (const item of refs) images.push({ url: item.dataUrl, role: 'media' });
    let usable = images;
    if (usable.length && this.openRouter.referenceCapability) {
      const capability = await this.openRouter.referenceCapability(model);
      if (!capability.accepts) {
        const hadMedia = usable.some((item) => item.role === 'media');
        usable = [];
        this.referenceWarning = hadMedia
          ? 'Este modelo não insere as fotos da loja na arte. Escolha um modelo que aceite imagem.'
          : 'Este modelo não usa imagens de referência.';
      } else {
        this.referenceWarning = null;
      }
    }
    const objective = (POST_OBJECTIVES as readonly string[]).includes(
      draft.objective,
    )
      ? (draft.objective as PostObjective)
      : 'promocao';
    const base = buildImagePrompt({
      theme: draft.theme,
      artStyle: draft.artStyle as ArtStyle,
      brand,
      format: draft.format as PostFormat,
      companyName,
      objective,
      headline: copy.headline,
      badgeText: copy.badgeText,
      caption: copy.caption,
      tone: draft.tone,
      creativeFreedom: Boolean(draft.creativeFreedom),
      variationIndex: copy.variationIndex,
      logoCount: images.some((item) => item.role === 'logo') ? 1 : 0,
      mediaCount: refs.length,
    });
    const prompt = adjustment
      ? buildRevisionImagePrompt(base, adjustment)
      : base;
    return this.openRouter.generateImage(prompt, usable, model, {
      compose: true,
    });
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
      model: model?.trim() || (await this.openRouter.imageModel()),
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
    if (!row || row.removedAt)
      throw new NotFoundException('Imagem não encontrada');
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
    const unique = [...new Set(ids)].slice(0, MEDIA_LIMIT);
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

  private async syncMedia(userId: string, draftId: string, ids: string[]) {
    const draft = await this.loadDraft(draftId);
    await this.ensureCompanyAccess(userId, draft.companyId);
    const unique = [...new Set(ids)].slice(0, MEDIA_LIMIT);
    if (unique.length) {
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
    }
    const current = await this.listActiveReferences(draftId);
    const detach = current.filter((item) => !unique.includes(item.id));
    await this.prisma.$transaction([
      ...unique.map((id, position) =>
        this.prisma.socialPostReference.update({
          where: { id },
          data: { draftId, position },
        }),
      ),
      ...detach.map((item) =>
        this.prisma.socialPostReference.update({
          where: { id: item.id },
          data: { draftId: null },
        }),
      ),
    ]);
  }

  private async ownedReference(userId: string, referenceId: string) {
    const row = await this.prisma.socialPostReference.findUnique({
      where: { id: referenceId },
    });
    if (!row || row.removedAt)
      throw new NotFoundException('Imagem não encontrada');
    try {
      await this.ensureCompanyAccess(userId, row.companyId);
    } catch {
      throw new NotFoundException('Imagem não encontrada');
    }
    return row;
  }

  private kickGeneration(userId: string, draftId: string) {
    if (this.generationJobs.has(draftId)) return;
    const job = this.generate(userId, draftId)
      .then(() => undefined)
      .catch(async (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar o post.';
        await this.prisma.socialPostDraft
          .update({
            where: { id: draftId },
            data: { generationStatus: 'failed', generationError: message },
          })
          .catch(() => undefined);
      })
      .finally(() => {
        this.generationJobs.delete(draftId);
      });
    this.generationJobs.set(draftId, job);
  }

  private async loadLibraryRow(draftId: string) {
    const draft = await this.prisma.socialPostDraft.findUnique({
      where: { id: draftId },
      include: {
        _count: { select: { variations: true } },
        variations: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            headline: true,
            captionShort: true,
            captionMedium: true,
            captionLong: true,
            activeCaption: true,
            slides: true,
          },
        },
        scheduledPosts: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { updatedAt: 'desc' },
          select: {
            status: true,
            channels: true,
            scheduledAt: true,
            publishedAt: true,
          },
        },
        references: {
          where: { removedAt: null },
          orderBy: { position: 'asc' },
          select: { id: true },
        },
      },
    });
    if (!draft) throw new NotFoundException('Rascunho não encontrado');
    return draft;
  }

  private presentLibrary(
    draft: Awaited<ReturnType<SocialPostsService['loadLibraryRow']>>,
  ) {
    const variation = draft.variations[0];
    const variationCount = draft._count?.variations ?? draft.variations.length;
    const schedules = draft.scheduledPosts ?? [];
    const status = libraryStatus({
      generationStatus: draft.generationStatus,
      variationCount,
      scheduleStatuses: schedules.map((item) => item.status),
    });
    const winning =
      status === 'publicado'
        ? schedules.find((item) => item.status === 'PUBLISHED')
        : status === 'agendado'
          ? schedules.find(
              (item) =>
                item.status === 'SCHEDULED' || item.status === 'PUBLISHING',
            )
          : status === 'falhou'
            ? schedules.find((item) => item.status === 'FAILED')
            : schedules[0];
    const caption =
      variation?.activeCaption === 'short'
        ? variation.captionShort
        : variation?.activeCaption === 'long'
          ? variation.captionLong
          : variation?.captionMedium;
    return {
      id: draft.id,
      objective: draft.objective,
      theme: draft.theme,
      format: draft.format,
      slideCount: draft.slideCount,
      artStyle: draft.artStyle,
      includeCaption: draft.includeCaption,
      tone: draft.tone,
      wizardStep: draft.wizardStep,
      placement: draft.placement,
      creativeFreedom: draft.creativeFreedom,
      generationStatus: draft.generationStatus,
      generationError: draft.generationError,
      selectedVariationId: draft.selectedVariationId,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      headline: variation?.headline ?? null,
      captionExcerpt: captionExcerpt([caption, variation?.headline, draft.theme]),
      thumbnail: thumbnailFromSlides(variation?.slides),
      networks: channelLabels(winning?.channels ?? []),
      scheduledAt: winning?.scheduledAt ?? null,
      publishedAt: winning?.publishedAt ?? null,
      variationCount,
      status,
      media: (draft.references ?? []).map((item) => ({
        id: item.id,
        url: `/social-posts/media/${item.id}`,
      })),
    };
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

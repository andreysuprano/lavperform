import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateBrandIdentityDto } from './dto/brand-identity.dto';
import {
  CreateSocialDraftDto,
  RegenerateBackgroundDto,
  RewriteCaptionDto,
  RevisePostDto,
  SelectVariationDto,
  SelectVersionDto,
  UpdateVariationDto,
} from './dto/social-post.dto';
import { SocialPostsService } from './social-posts.service';
import type { CaptionLength } from './domain/social-post.types';

type AuthRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Social posts')
@Controller('social-posts')
export class SocialPostsController {
  constructor(private readonly socialPostsService: SocialPostsService) {}

  @Get('brand/:companyId')
  getBrand(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.socialPostsService.getBrand(req.user.userId, companyId);
  }

  @Put('brand/:companyId')
  saveBrand(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateBrandIdentityDto,
  ) {
    return this.socialPostsService.saveBrand(req.user.userId, companyId, dto);
  }

  @Get('drafts/:companyId')
  listDrafts(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.socialPostsService.listDrafts(req.user.userId, companyId);
  }

  @Post('drafts')
  createDraft(@Req() req: AuthRequest, @Body() dto: CreateSocialDraftDto) {
    return this.socialPostsService.createDraft(req.user.userId, dto);
  }

  @Get('drafts/item/:draftId')
  getDraft(
    @Req() req: AuthRequest,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    return this.socialPostsService.getDraft(req.user.userId, draftId);
  }

  @Post('drafts/item/:draftId/generate')
  @HttpCode(200)
  generate(
    @Req() req: AuthRequest,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    return this.socialPostsService.generate(req.user.userId, draftId);
  }

  @Post('drafts/item/:draftId/more')
  @HttpCode(200)
  generateMore(
    @Req() req: AuthRequest,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    return this.socialPostsService.generateMore(req.user.userId, draftId);
  }

  @Patch('drafts/item/:draftId/selection')
  selectVariation(
    @Req() req: AuthRequest,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() dto: SelectVariationDto,
  ) {
    return this.socialPostsService.selectVariation(
      req.user.userId,
      draftId,
      dto.variationId,
    );
  }

  @Patch('variations/:variationId')
  updateVariation(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: UpdateVariationDto,
  ) {
    return this.socialPostsService.updateVariation(
      req.user.userId,
      variationId,
      dto,
    );
  }

  @Post('variations/:variationId/background')
  @HttpCode(200)
  regenerateBackground(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: RegenerateBackgroundDto,
  ) {
    return this.socialPostsService.regenerateBackground(
      req.user.userId,
      variationId,
      dto.slideIndex ?? 0,
    );
  }

  @Post('variations/:variationId/revise')
  @HttpCode(200)
  revise(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: RevisePostDto,
  ) {
    return this.socialPostsService.revise(
      req.user.userId,
      variationId,
      dto.prompt,
    );
  }

  @Post('variations/:variationId/restore')
  @HttpCode(200)
  restoreVersion(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: SelectVersionDto,
  ) {
    return this.socialPostsService.restoreVersion(
      req.user.userId,
      variationId,
      dto.versionId,
    );
  }

  @Patch('variations/:variationId/version')
  selectVersion(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: SelectVersionDto,
  ) {
    return this.socialPostsService.selectVersion(
      req.user.userId,
      variationId,
      dto.versionId,
    );
  }

  @Post('variations/:variationId/manual')
  @HttpCode(200)
  recordManualVersion(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: UpdateVariationDto,
  ) {
    return this.socialPostsService.recordManualVersion(
      req.user.userId,
      variationId,
      dto,
    );
  }

  @Post('variations/:variationId/rewrite')
  @HttpCode(200)
  rewriteCaption(
    @Req() req: AuthRequest,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Body() dto: RewriteCaptionDto,
  ) {
    return this.socialPostsService.rewriteCaption(
      req.user.userId,
      variationId,
      dto.length as CaptionLength,
    );
  }
}

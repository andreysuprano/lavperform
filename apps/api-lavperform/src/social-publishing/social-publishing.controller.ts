import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import {
  CreateScheduledPostDto,
  ReplyReviewDto,
  SelectGoogleDto,
  SelectMetaDto,
  UpdateScheduledPostDto,
} from './dto/social-publishing.dto';
import { ScheduledPostsService } from './scheduled-posts.service';
import {
  parseProvider,
  SocialConnectionsService,
} from './social-connections.service';
import { SocialPublishDispatcher } from './social-publish.dispatcher';

type AuthRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Social publishing')
@Controller('social-publishing')
export class SocialPublishingController {
  constructor(
    private readonly connections: SocialConnectionsService,
    private readonly posts: ScheduledPostsService,
    private readonly dispatcher: SocialPublishDispatcher,
  ) {}

  @Get('companies/:companyId/connections')
  overview(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.connections.overview(req.user.userId, companyId);
  }

  @Post('companies/:companyId/connections/:provider/start')
  begin(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('provider') provider: string,
  ) {
    return this.connections.begin(
      req.user.userId,
      companyId,
      parseProvider(provider),
    );
  }

  @Post('companies/:companyId/connections/:provider/cancel')
  cancel(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('provider') provider: string,
  ) {
    return this.connections.cancel(
      req.user.userId,
      companyId,
      parseProvider(provider),
    );
  }

  @Delete('companies/:companyId/connections/:provider')
  disconnect(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('provider') provider: string,
  ) {
    return this.connections.disconnect(
      req.user.userId,
      companyId,
      parseProvider(provider),
    );
  }

  @Post('companies/:companyId/connections/:provider/retry')
  retry(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('provider') provider: string,
  ) {
    return this.connections.retry(
      req.user.userId,
      companyId,
      parseProvider(provider),
    );
  }

  @Get('companies/:companyId/connections/meta/assets')
  metaAssets(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.connections.assets(req.user.userId, companyId, 'META');
  }

  @Get('companies/:companyId/connections/google/assets')
  googleAssets(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.connections.assets(req.user.userId, companyId, 'GOOGLE');
  }

  @Post('companies/:companyId/connections/meta/selection')
  selectMeta(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() body: SelectMetaDto,
  ) {
    return this.connections.selectMeta(req.user.userId, companyId, body);
  }

  @Post('companies/:companyId/connections/google/selection')
  selectGoogle(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() body: SelectGoogleDto,
  ) {
    return this.connections.selectGoogle(req.user.userId, companyId, body);
  }

  @Get('companies/:companyId/google-business')
  googleProfile(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.connections.googleProfile(req.user.userId, companyId);
  }

  @Post('companies/:companyId/google-business/reviews/:reviewId/reply')
  reply(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: ReplyReviewDto,
  ) {
    return this.connections.replyReview(
      req.user.userId,
      companyId,
      reviewId,
      body.comment,
    );
  }

  @Post('companies/:companyId/sandbox/seed')
  seed(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.connections.seed(req.user.userId, companyId);
  }

  @Get('suggestions')
  suggestions() {
    return this.posts.suggestions();
  }

  @Get('companies/:companyId/posts')
  list(
    @Req() req: AuthRequest,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.posts.list(req.user.userId, companyId, from, to);
  }

  @Post('posts')
  async create(@Req() req: AuthRequest, @Body() body: CreateScheduledPostDto) {
    const post = await this.posts.create(req.user.userId, body.companyId, body);
    if (body.publishNow || new Date(post.scheduledAt).getTime() <= Date.now()) {
      await this.dispatcher.enqueue(post.id);
    }
    return post;
  }

  @Patch('posts/:postId')
  update(
    @Req() req: AuthRequest,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() body: UpdateScheduledPostDto,
  ) {
    return this.posts.update(req.user.userId, postId, body);
  }

  @Post('posts/:postId/cancel')
  cancelPost(
    @Req() req: AuthRequest,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.posts.cancel(req.user.userId, postId);
  }

  @Post('posts/:postId/retry')
  async retryPost(
    @Req() req: AuthRequest,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    const id = await this.posts.prepareRetry(req.user.userId, postId);
    await this.dispatcher.enqueue(id);
    return { id };
  }
}

@Controller('social-publishing/oauth')
export class SocialOauthController {
  constructor(private readonly connections: SocialConnectionsService) {}

  @Get('meta/callback')
  async meta(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    return this.answer(
      res,
      await this.connections.completeOAuth('META', code, state, error),
    );
  }

  @Get('google/callback')
  async google(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    return this.answer(
      res,
      await this.connections.completeOAuth('GOOGLE', code, state, error),
    );
  }

  private answer(
    res: Response,
    result: { type: 'redirect'; url: string } | { type: 'html'; body: string },
  ) {
    if (result.type === 'redirect') return res.redirect(result.url);
    return res.status(200).type('html').send(result.body);
  }
}

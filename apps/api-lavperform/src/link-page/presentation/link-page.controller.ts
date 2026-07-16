import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LinkPageService } from '../application/link-page.service';
import { LinkPageDto } from '../application/dto/link-page-dto';

@ApiTags('Link Page')
@Controller('link-page')
@ApiBearerAuth()
export class LinkPageController {
  constructor(private readonly linkPageService: LinkPageService) { }

  @Get('/:slug')
  @ApiOperation({ summary: 'Obter dados da Página de Links' })
  @ApiParam({ name: 'slug', description: 'Slug da empresa' })
  getLinkPage(@Param('slug') slug: string) {
    return this.linkPageService.getLinkPage(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/:slug')
  @ApiOperation({ summary: 'Atualizar dados da Página de Links' })
  @ApiParam({ name: 'slug', description: 'Slug da empresa' })
  @ApiBody({ type: LinkPageDto })
  updateLinkPage(@Param('slug') slug: string, @Body() linkPageDto: LinkPageDto) {
    return this.linkPageService.updateLinkPage(slug, linkPageDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/link/:id')
  @ApiOperation({ summary: 'Deletar link' })
  @ApiParam({ name: 'id', description: 'ID do link' })
  deleteLink(@Param('id') id: string) {
    return this.linkPageService.deleteLink(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/gallery/:id')
  @ApiOperation({ summary: 'Deletar dados da Página de Links' })
  @ApiParam({ name: 'id', description: 'ID da galeria' })
  deleteGallery(@Param('id') id: string) {
    return this.linkPageService.deleteGallery(id);
  }
} 
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MetaTemplateCategory,
  MetaTemplateStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  MetaCreateTemplatePayload,
  MetaEditTemplatePayload,
  MetaTemplateComponent,
  MetaTemplatesClient,
} from '../api/meta-templates.client';
import {
  CreateMetaTemplateDto,
  MetaTemplateButtonType,
  MetaTemplateHeaderFormat,
  MetaTemplateSyncAllResponseDto,
} from '../dto/create-meta-template.dto';
import {
  MetaTemplateResponseDto,
  MetaTemplateSyncResponseDto,
} from '../dto/meta-template-response.dto';

/**
 * Tipo auxiliar para representar uma linha de `MetaMessageTemplate` carregada
 * do banco. Mantém-se intencionalmente próximo do retorno do Prisma para
 * facilitar reaproveitamento entre helpers internos do service e por chamadores
 * externos (ex.: AutomaticCampaignService) que precisam carregar o snapshot
 * dos templates antigos antes de uma edição.
 */
/**
 * Shape mínimo de criativo necessário para construir um template Meta.
 * Aceita tanto o tipo gerado pelo Prisma quanto a entidade de domínio
 * (`AutomaticCampaignCreative` em `domain/automatic-campaign.entity.ts`),
 * que diferem apenas na nulabilidade de `link`.
 */
export type CreativeForTemplate = {
  id: string;
  imageUrls: string[];
  message: string;
  link?: string | null;
  title?: string | null;
};

export type MetaMessageTemplateRow = {
  id: string;
  companyId: string;
  automaticCampaignCreativeId: string | null;
  metaTemplateId: string | null;
  name: string;
  displayName: string | null;
  language: string;
  category: MetaTemplateCategory;
  components: Prisma.JsonValue;
  headerMediaUrl: string | null;
  status: MetaTemplateStatus;
  rejectedReason: string | null;
  qualityScore: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MetaTemplatesService {
  private readonly logger = new Logger(MetaTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaTemplatesClient: MetaTemplatesClient,
  ) {}

  async createFromCreative(
    companyId: string,
    creative: CreativeForTemplate,
    campaignName: string,
    creativeIndex: number,
  ): Promise<MetaTemplateResponseDto> {
    const existing = await this.prisma.metaMessageTemplate.findUnique({
      where: { automaticCampaignCreativeId: creative.id },
    });

    if (existing) {
      return this.toResponseDto(existing);
    }

    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.wabaId || !integration.accessToken) {
      throw new BadRequestException(
        'Integração Meta incompleta: wabaId e accessToken são obrigatórios para criar templates',
      );
    }

    const { components, headerMediaUrl } = await this.buildTemplateComponents(
      creative,
      { accessToken: integration.accessToken },
    );
    // O trecho do ID do criativo garante unicidade mesmo quando a campanha é
    // atualizada (novos criativos recebem novos UUIDs, evitando conflito de
    // nome de template na Meta).
    const creativeShortId = creative.id.replace(/-/g, '').slice(0, 8);
    const name = this.normalizeTemplateName(
      `${campaignName}_${creativeIndex}_${creativeShortId}`,
    );
    const displayName =
      creative.title?.trim() ||
      `${campaignName} - Variante ${creativeIndex + 1}`;
    const payload: MetaCreateTemplatePayload = {
      name,
      category: MetaTemplateCategory.MARKETING,
      language: 'pt_BR',
      components,
    };

    try {
      const metaResponse = await this.metaTemplatesClient.createTemplate(
        integration.wabaId,
        payload,
        integration.accessToken,
      );

      const template = await this.prisma.metaMessageTemplate.create({
        data: {
          companyId,
          automaticCampaignCreativeId: creative.id,
          metaTemplateId: metaResponse.id,
          name,
          displayName,
          language: payload.language,
          category: this.toTemplateCategory(metaResponse.category) ?? payload.category,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: this.toTemplateStatus(metaResponse.status),
        },
      });

      return this.toResponseDto(template);
    } catch (error) {
      this.logger.error(
        `Erro ao criar template Meta para criativo ${creative.id}`,
        error instanceof Error ? error.stack : error,
      );

      const template = await this.prisma.metaMessageTemplate.create({
        data: {
          companyId,
          automaticCampaignCreativeId: creative.id,
          name,
          displayName,
          language: payload.language,
          category: payload.category,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: MetaTemplateStatus.ERROR,
          rejectedReason: this.extractErrorMessage(error),
        },
      });

      return this.toResponseDto(template);
    }
  }

  async createStandalone(
    companyId: string,
    dto: CreateMetaTemplateDto,
  ): Promise<MetaTemplateResponseDto> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.wabaId || !integration.accessToken) {
      throw new BadRequestException(
        'Integração Meta incompleta: wabaId e accessToken são obrigatórios para criar templates',
      );
    }

    const displayName = dto.displayName.trim();
    const name = this.generateMetaTemplateName(displayName);
    const { components, headerMediaUrl } = await this.buildComponentsFromDto(
      dto,
      { accessToken: integration.accessToken },
    );

    const payload: MetaCreateTemplatePayload = {
      name,
      category: dto.category,
      language: dto.language,
      components,
    };

    try {
      const metaResponse = await this.metaTemplatesClient.createTemplate(
        integration.wabaId,
        payload,
        integration.accessToken,
      );

      const template = await this.prisma.metaMessageTemplate.create({
        data: {
          companyId,
          automaticCampaignCreativeId: null,
          metaTemplateId: metaResponse.id,
          name,
          displayName,
          language: payload.language,
          category:
            this.toTemplateCategory(metaResponse.category) ?? payload.category,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: this.toTemplateStatus(metaResponse.status),
        },
      });

      return this.toResponseDto(template);
    } catch (error) {
      this.logger.error(
        `Erro ao criar template Meta standalone "${name}" (companyId=${companyId})`,
        error instanceof Error ? error.stack : error,
      );

      const template = await this.prisma.metaMessageTemplate.create({
        data: {
          companyId,
          automaticCampaignCreativeId: null,
          name,
          displayName,
          language: payload.language,
          category: payload.category,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: MetaTemplateStatus.ERROR,
          rejectedReason: this.extractErrorMessage(error),
        },
      });

      return this.toResponseDto(template);
    }
  }

  async updateStandalone(
    companyId: string,
    id: string,
    dto: CreateMetaTemplateDto,
  ): Promise<MetaTemplateResponseDto> {
    const template = await this.prisma.metaMessageTemplate.findFirst({
      where: { id, companyId },
    });

    if (!template) {
      throw new NotFoundException('Template Meta não encontrado');
    }

    if (template.status === MetaTemplateStatus.DELETED) {
      throw new BadRequestException(
        'Templates removidos não podem ser editados',
      );
    }

    if (!template.metaTemplateId) {
      throw new BadRequestException(
        'Este template não foi enviado à Meta com sucesso e não pode ser editado. Crie um novo template.',
      );
    }

    const editableStatuses: MetaTemplateStatus[] = [
      MetaTemplateStatus.APPROVED,
      MetaTemplateStatus.REJECTED,
      MetaTemplateStatus.PAUSED,
    ];

    if (!editableStatuses.includes(template.status)) {
      throw new BadRequestException(
        `Templates com status ${template.status} não podem ser editados. Aguarde a conclusão da análise ou sincronize o status.`,
      );
    }

    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.accessToken) {
      throw new BadRequestException(
        'Integração Meta incompleta: accessToken é obrigatório para editar templates',
      );
    }

    const { components, headerMediaUrl } = await this.buildComponentsFromDto(
      dto,
      { accessToken: integration.accessToken },
    );

    const payload: MetaEditTemplatePayload = { components };

    const canEditCategory =
      template.status === MetaTemplateStatus.REJECTED ||
      template.status === MetaTemplateStatus.PAUSED;

    if (canEditCategory && dto.category !== template.category) {
      payload.category = dto.category;
    }

    try {
      await this.metaTemplatesClient.editTemplate(
        template.metaTemplateId,
        payload,
        integration.accessToken,
      );

      const updated = await this.prisma.metaMessageTemplate.update({
        where: { id: template.id },
        data: {
          displayName: dto.displayName.trim(),
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          category: dto.category,
          status: MetaTemplateStatus.PENDING,
          rejectedReason: null,
        },
      });

      this.logger.log(
        `Template Meta "${template.name}" editado (id local=${template.id})`,
      );

      return this.toResponseDto(updated);
    } catch (error) {
      this.logger.error(
        `Erro ao editar template Meta standalone "${template.name}" (id local=${template.id})`,
        error instanceof Error ? error.stack : error,
      );

      const updated = await this.prisma.metaMessageTemplate.update({
        where: { id: template.id },
        data: {
          displayName: dto.displayName.trim(),
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          category: dto.category,
          status: MetaTemplateStatus.ERROR,
          rejectedReason: this.extractErrorMessage(error),
        },
      });

      return this.toResponseDto(updated);
    }
  }

  async syncAllForCompany(
    companyId: string,
  ): Promise<MetaTemplateSyncAllResponseDto> {
    const templates = await this.prisma.metaMessageTemplate.findMany({
      where: {
        companyId,
        status: {
          in: [
            MetaTemplateStatus.PENDING,
            MetaTemplateStatus.IN_APPEAL,
            MetaTemplateStatus.REJECTED,
            MetaTemplateStatus.ERROR,
          ],
        },
        metaTemplateId: { not: null },
      },
      select: { id: true },
    });

    let statusChanged = 0;
    let approved = 0;

    for (const template of templates) {
      try {
        const result = await this.syncStatus(companyId, template.id);
        if (result.statusChanged) {
          statusChanged += 1;
        }
        if (
          result.previousStatus !== MetaTemplateStatus.APPROVED &&
          result.template.status === MetaTemplateStatus.APPROVED
        ) {
          approved += 1;
        }
      } catch (err) {
        this.logger.warn(
          `Falha ao sincronizar template ${template.id} (companyId=${companyId}): ` +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    return {
      synced: templates.length,
      statusChanged,
      approved,
    };
  }

  async findAllByCompany(companyId: string): Promise<MetaTemplateResponseDto[]> {
    const templates = await this.prisma.metaMessageTemplate.findMany({
      where: { companyId },
      include: {
        automaticCampaignCreative: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => this.toResponseDto(template));
  }

  /**
   * Arquiva (soft-delete) todos os templates Meta associados a uma lista
   * de criativos. Usado quando uma campanha automática é editada: os
   * criativos antigos são deletados pelo Prisma, mas precisamos:
   *
   *  1. Remover os templates correspondentes da conta Meta (DELETE
   *     /{wabaId}/message_templates) — caso contrário, ficam órfãos lá.
   *  2. Marcar o registro no banco como DELETED em vez de apagar, porque
   *     pode haver mensagens já enviadas com `metaMessageTemplateId`
   *     referenciando esse template (a foreign key não tem cascade).
   *
   * Falhas na chamada à Meta são tratadas como warning: o template é
   * marcado como DELETED localmente mesmo assim, pois o cenário mais
   * comum é o template já ter sido removido.
   */
  async archiveTemplatesByCreativeIds(
    companyId: string,
    creativeIds: string[],
  ): Promise<void> {
    if (!creativeIds.length) {
      return;
    }

    const templates = await this.prisma.metaMessageTemplate.findMany({
      where: {
        companyId,
        automaticCampaignCreativeId: { in: creativeIds },
        status: { not: MetaTemplateStatus.DELETED },
      },
    });

    if (templates.length === 0) {
      return;
    }

    this.logger.log(
      `Arquivando ${templates.length} template(s) Meta após edição de campanha (companyId=${companyId})`,
    );

    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    const wabaId = integration?.wabaId ?? null;
    const accessToken = integration?.accessToken ?? null;

    for (const template of templates) {
      if (wabaId && accessToken) {
        try {
          await this.metaTemplatesClient.deleteTemplate(
            wabaId,
            template.name,
            accessToken,
            template.metaTemplateId
              ? { metaTemplateId: template.metaTemplateId }
              : undefined,
          );
          this.logger.log(
            `Template Meta "${template.name}" removido da conta (id local=${template.id})`,
          );
        } catch (err) {
          this.logger.warn(
            `Falha ao remover template Meta "${template.name}" na conta (id local=${template.id}): ` +
              `${this.extractErrorMessage(err)}. ` +
              `Prosseguindo com soft-delete local mesmo assim.`,
          );
        }
      } else {
        this.logger.warn(
          `Integração Meta sem wabaId/accessToken para companyId=${companyId} — pulando delete na Meta`,
        );
      }

      await this.prisma.metaMessageTemplate.update({
        where: { id: template.id },
        data: {
          status: MetaTemplateStatus.DELETED,
          automaticCampaignCreativeId: null,
        },
      });
    }
  }

  /**
   * Retorna os templates Meta vinculados a uma lista ordenada de criativos,
   * preservando a ordem dos `creativeIds`. Posições sem template vêm como
   * `null`. Usado pelo fluxo de edição de campanha para casar 1:1 o criativo
   * antigo (e seu template) com o novo criativo na mesma posição.
   */
  async findTemplatesByCreativeIdsOrdered(
    companyId: string,
    creativeIds: string[],
  ): Promise<Array<MetaMessageTemplateRow | null>> {
    if (!creativeIds.length) {
      return [];
    }

    const templates = await this.prisma.metaMessageTemplate.findMany({
      where: {
        companyId,
        automaticCampaignCreativeId: { in: creativeIds },
        status: { not: MetaTemplateStatus.DELETED },
      },
    });

    const byCreativeId = new Map<string, MetaMessageTemplateRow>();
    for (const template of templates) {
      if (template.automaticCampaignCreativeId) {
        byCreativeId.set(template.automaticCampaignCreativeId, template);
      }
    }

    return creativeIds.map((id) => byCreativeId.get(id) ?? null);
  }

  /**
   * Reconcilia os templates Meta de uma campanha após edição.
   *
   * O frontend hoje envia a lista de criativos sem IDs, então o repositório
   * apaga os criativos antigos e cria novos (com novos UUIDs) numa única
   * transação. Por isso, casamos por **posição** (índice) usando a ordem em
   * que foram inseridos:
   *
   *  - Quando há template antigo na posição `i` e criativo novo na posição `i`:
   *    editamos o template existente na Meta (POST /{TEMPLATE_ID}) com os
   *    componentes do novo criativo e re-vinculamos o registro local.
   *  - Quando há criativo novo mas nenhum template editável (template
   *    antigo era ERROR/sem `metaTemplateId`, ou simplesmente não existia):
   *    criamos um template novo na Meta.
   *  - Quando há template antigo sobrando (criativo removido): arquivamos
   *    (delete na Meta + soft-delete local).
   */
  async reconcileTemplatesForCampaign(
    companyId: string,
    campaignName: string,
    newCreatives: ReadonlyArray<CreativeForTemplate>,
    previousTemplates: Array<MetaMessageTemplateRow | null>,
  ): Promise<MetaTemplateResponseDto[]> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.wabaId || !integration.accessToken) {
      throw new BadRequestException(
        'Integração Meta incompleta: wabaId e accessToken são obrigatórios para reconciliar templates',
      );
    }

    const wabaId = integration.wabaId;
    const accessToken = integration.accessToken;

    const total = Math.max(newCreatives.length, previousTemplates.length);
    const results: MetaTemplateResponseDto[] = [];

    for (let index = 0; index < total; index++) {
      const newCreative = newCreatives[index] ?? null;
      const previousTemplate = previousTemplates[index] ?? null;

      if (newCreative && previousTemplate?.metaTemplateId) {
        const updated = await this.updateExistingTemplate(
          previousTemplate,
          newCreative,
          { accessToken },
        );
        results.push(updated);
        continue;
      }

      if (newCreative && previousTemplate) {
        await this.deleteLocalTemplate(previousTemplate);
        const created = await this.createFromCreative(
          companyId,
          newCreative,
          campaignName,
          index,
        );
        results.push(created);
        continue;
      }

      if (newCreative) {
        const created = await this.createFromCreative(
          companyId,
          newCreative,
          campaignName,
          index,
        );
        results.push(created);
        continue;
      }

      if (previousTemplate) {
        await this.archiveSingleTemplate(previousTemplate, {
          wabaId,
          accessToken,
        });
      }
    }

    return results;
  }

  /**
   * Edita um template já existente na Meta com os componentes do novo
   * criativo e atualiza o registro local: re-vincula ao novo criativo,
   * persiste os novos `components` e marca como PENDING (a Meta reabre a
   * revisão automaticamente após uma edição).
   */
  private async updateExistingTemplate(
    template: MetaMessageTemplateRow,
    newCreative: CreativeForTemplate,
    integration: { accessToken: string },
  ): Promise<MetaTemplateResponseDto> {
    if (!template.metaTemplateId) {
      throw new BadRequestException(
        `Template local ${template.id} não possui metaTemplateId; não é possível editá-lo na Meta`,
      );
    }

    const { components, headerMediaUrl } = await this.buildTemplateComponents(
      newCreative,
      { accessToken: integration.accessToken },
    );

    const payload: MetaEditTemplatePayload = { components };

    try {
      await this.metaTemplatesClient.editTemplate(
        template.metaTemplateId,
        payload,
        integration.accessToken,
      );

      const updated = await this.prisma.metaMessageTemplate.update({
        where: { id: template.id },
        data: {
          automaticCampaignCreativeId: newCreative.id,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: MetaTemplateStatus.PENDING,
          rejectedReason: null,
        },
      });

      this.logger.log(
        `Template Meta "${template.name}" editado (id local=${template.id}, metaTemplateId=${template.metaTemplateId}) após edição da campanha`,
      );

      return this.toResponseDto(updated);
    } catch (error) {
      this.logger.error(
        `Erro ao editar template Meta ${template.metaTemplateId} (id local=${template.id})`,
        error instanceof Error ? error.stack : error,
      );

      const updated = await this.prisma.metaMessageTemplate.update({
        where: { id: template.id },
        data: {
          automaticCampaignCreativeId: newCreative.id,
          components: components as unknown as Prisma.InputJsonValue,
          headerMediaUrl,
          status: MetaTemplateStatus.ERROR,
          rejectedReason: this.extractErrorMessage(error),
        },
      });

      return this.toResponseDto(updated);
    }
  }

  /**
   * Arquiva um único template Meta (delete na conta Meta + soft-delete
   * local). Variação de {@link archiveTemplatesByCreativeIds} para um
   * registro já em mãos, usada pela reconciliação por posição.
   */
  private async archiveSingleTemplate(
    template: MetaMessageTemplateRow,
    integration: { wabaId: string; accessToken: string },
  ): Promise<void> {
    try {
      await this.metaTemplatesClient.deleteTemplate(
        integration.wabaId,
        template.name,
        integration.accessToken,
        template.metaTemplateId
          ? { metaTemplateId: template.metaTemplateId }
          : undefined,
      );
      this.logger.log(
        `Template Meta "${template.name}" removido da conta (id local=${template.id}) após edição de campanha`,
      );
    } catch (err) {
      this.logger.warn(
        `Falha ao remover template Meta "${template.name}" na conta (id local=${template.id}): ` +
          `${this.extractErrorMessage(err)}. ` +
          `Prosseguindo com soft-delete local mesmo assim.`,
      );
    }

    await this.prisma.metaMessageTemplate.update({
      where: { id: template.id },
      data: {
        status: MetaTemplateStatus.DELETED,
        automaticCampaignCreativeId: null,
      },
    });
  }

  /**
   * Remove um template local quando ele não pode ser reaproveitado (sem
   * `metaTemplateId`, então nunca chegou de fato à Meta). Não chama a Meta.
   */
  private async deleteLocalTemplate(
    template: MetaMessageTemplateRow,
  ): Promise<void> {
    await this.prisma.metaMessageTemplate.update({
      where: { id: template.id },
      data: {
        status: MetaTemplateStatus.DELETED,
        automaticCampaignCreativeId: null,
      },
    });
  }

  async syncStatus(
    companyId: string,
    id: string,
  ): Promise<MetaTemplateSyncResponseDto> {
    const template = await this.prisma.metaMessageTemplate.findFirst({
      where: { id, companyId },
    });

    if (!template) {
      throw new NotFoundException('Template Meta não encontrado');
    }

    if (!template.metaTemplateId) {
      throw new BadRequestException(
        'Template ainda não possui metaTemplateId para sincronização',
      );
    }

    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.accessToken) {
      throw new BadRequestException(
        'Integração Meta incompleta: accessToken é obrigatório para sincronizar templates',
      );
    }

    const metaStatus = await this.metaTemplatesClient.getTemplateStatus(
      template.metaTemplateId,
      integration.accessToken,
    );
    const nextStatus = this.toTemplateStatus(metaStatus.status);
    const nextRejectedReason = metaStatus.rejected_reason ?? null;
    const previousStatus = template.status;
    const statusChanged =
      previousStatus !== nextStatus ||
      template.rejectedReason !== nextRejectedReason;

    const updated = statusChanged
      ? await this.prisma.metaMessageTemplate.update({
          where: { id: template.id },
          data: {
            status: nextStatus,
            rejectedReason: nextRejectedReason,
            qualityScore: metaStatus.quality_score as Prisma.InputJsonValue,
          },
        })
      : template;

    return {
      template: this.toResponseDto(updated),
      statusChanged,
      previousStatus,
    };
  }

  private async buildComponentsFromDto(
    dto: CreateMetaTemplateDto,
    integration: { accessToken: string },
  ): Promise<{ components: MetaTemplateComponent[]; headerMediaUrl: string | null }> {
    const components: MetaTemplateComponent[] = [];
    let headerMediaUrl: string | null = null;

    if (dto.header) {
      const header = dto.header;

      if (header.format === MetaTemplateHeaderFormat.TEXT) {
        if (!header.text?.trim()) {
          throw new BadRequestException(
            'Header TEXT exige o campo text',
          );
        }
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: header.text.trim(),
          ...(header.text.includes('{{1}}') && header.example?.trim()
            ? { example: { header_text: [header.example.trim()] } }
            : {}),
        });
      } else {
        if (!header.mediaUrl?.trim()) {
          throw new BadRequestException(
            `Header ${header.format} exige mediaUrl`,
          );
        }
        const handle = await this.metaTemplatesClient.uploadMediaFromUrl(
          header.mediaUrl.trim(),
          integration.accessToken,
        );
        components.push({
          type: 'HEADER',
          format: header.format,
          example: { header_handle: [handle] },
        });
        headerMediaUrl = header.mediaUrl.trim();
      }
    }

    if (!dto.body.text?.trim()) {
      throw new BadRequestException('O corpo do template é obrigatório');
    }

    const bodyComponent: MetaTemplateComponent = {
      type: 'BODY',
      text: dto.body.text.trim(),
    };

    if (dto.body.examples?.length) {
      bodyComponent.example = {
        body_text: [dto.body.examples.map((e) => e.trim())],
      };
    } else if (dto.body.text.includes('{{1}}')) {
      bodyComponent.example = {
        body_text: [['Exemplo']],
      };
    }

    components.push(bodyComponent);

    const sanitizedFooter = this.sanitizeFooterText(dto.footer);
    if (sanitizedFooter) {
      components.push({
        type: 'FOOTER',
        text: sanitizedFooter,
      });
    }

    if (dto.buttons?.length) {
      const buttons = dto.buttons.map((button) => {
        if (button.type === MetaTemplateButtonType.QUICK_REPLY) {
          return {
            type: 'QUICK_REPLY',
            text: button.text.trim(),
          };
        }

        if (button.type === MetaTemplateButtonType.URL) {
          if (!button.url?.trim()) {
            throw new BadRequestException(
              'Botão URL exige o campo url',
            );
          }
          const urlButton: Record<string, unknown> = {
            type: 'URL',
            text: button.text.trim(),
            url: button.url.trim(),
          };
          if (button.url.includes('{{1}}') && button.urlExample?.trim()) {
            urlButton.example = [button.urlExample.trim()];
          }
          return urlButton;
        }

        if (!button.phoneNumber?.trim()) {
          throw new BadRequestException(
            'Botão PHONE_NUMBER exige phoneNumber',
          );
        }

        return {
          type: 'PHONE_NUMBER',
          text: button.text.trim(),
          phone_number: button.phoneNumber.trim(),
        };
      });

      components.push({
        type: 'BUTTONS',
        buttons,
      });
    }

    return { components, headerMediaUrl };
  }

  private async buildTemplateComponents(
    creative: CreativeForTemplate,
    integration: { accessToken: string },
  ): Promise<{ components: MetaTemplateComponent[]; headerMediaUrl: string | null }> {
    const components: MetaTemplateComponent[] = [];
    const imageUrl = creative.imageUrls[0]?.trim();
    let headerMediaUrl: string | null = null;

    if (imageUrl) {
      try {
        const handle = await this.metaTemplatesClient.uploadMediaFromUrl(
          imageUrl,
          integration.accessToken,
        );
        components.push({
          type: 'HEADER',
          format: 'IMAGE',
          example: {
            header_handle: [handle],
          },
        });
        headerMediaUrl = imageUrl;
      } catch (uploadError) {
        this.logger.warn(
          `Não foi possível fazer upload da imagem para o template Meta (criativo ${creative.id}): ` +
            `${this.extractErrorMessage(uploadError)}. ` +
            `O header IMAGE não será incluído no template.`,
        );
      }
    }

    components.push({
      type: 'BODY',
      text: creative.message,
      ...(creative.message.includes('{{1}}')
        ? {
            example: {
              body_text: [['Cliente']],
            },
          }
        : {}),
    });

    if (creative.link?.trim()) {
      components.push({
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Acessar',
            url: creative.link.trim(),
          },
        ],
      });
    }

    return { components, headerMediaUrl };
  }

  private generateMetaTemplateName(displayName: string): string {
    const base = this.normalizeTemplateName(displayName) || 'template';
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
    const maxBaseLength = Math.max(1, 512 - suffix.length - 1);
    return `${base.slice(0, maxBaseLength)}_${suffix}`;
  }

  private normalizeTemplateName(value: string): string {
    const normalized = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 512);

    return normalized || `template_${Date.now()}`;
  }

  private toTemplateStatus(status?: string): MetaTemplateStatus {
    const value = status?.toUpperCase() as MetaTemplateStatus | undefined;
    return value && value in MetaTemplateStatus
      ? value
      : MetaTemplateStatus.PENDING;
  }

  private toTemplateCategory(
    category?: string,
  ): MetaTemplateCategory | undefined {
    const value = category?.toUpperCase() as MetaTemplateCategory | undefined;
    return value && value in MetaTemplateCategory ? value : undefined;
  }

  private sanitizeFooterText(footer?: string | null): string {
    if (!footer) return '';
    return footer
      .replace(/[\r\n]+/g, ' ')
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
      .trim();
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: unknown } }).response;
      if (response?.data) {
        return JSON.stringify(response.data);
      }
    }

    return error instanceof Error ? error.message : String(error);
  }

  private toResponseDto(template: MetaMessageTemplateRow): MetaTemplateResponseDto {
    return {
      id: template.id,
      companyId: template.companyId,
      automaticCampaignCreativeId: template.automaticCampaignCreativeId,
      metaTemplateId: template.metaTemplateId,
      name: template.name,
      displayName: template.displayName,
      language: template.language,
      category: template.category,
      components: template.components,
      headerMediaUrl: template.headerMediaUrl,
      status: template.status,
      rejectedReason: template.rejectedReason,
      qualityScore: template.qualityScore,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

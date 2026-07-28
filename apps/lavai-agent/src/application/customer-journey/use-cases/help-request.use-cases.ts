import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HELP_REQUEST_REPOSITORY,
} from '../ports/customer-journey.repository.port';
import type {
  HelpRequestRepositoryPort,
} from '../ports/customer-journey.repository.port';
import { AttendantGateway } from '../../../infrastructure/attendant/attendant.gateway';

@Injectable()
export class ListHelpRequestsUseCase {
  constructor(
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly repo: HelpRequestRepositoryPort,
  ) {}

  async execute(agentId: string, status = 'PENDING') {
    return this.repo.findByAgentAndStatus(agentId, status);
  }
}

@Injectable()
export class ClaimHelpRequestUseCase {
  constructor(
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly repo: HelpRequestRepositoryPort,
    private readonly gateway: AttendantGateway,
  ) {}

  async execute(id: string) {
    const req = await this.repo.findById(id);
    if (!req) throw new NotFoundException(`HelpRequest ${id} não encontrado.`);
    if (req.status === 'CLAIMED') {
      throw new ConflictException('Pedido de ajuda já foi assumido.');
    }
    if (req.status !== 'PENDING') {
      throw new ConflictException(`Status inválido para claim: ${req.status}`);
    }
    const updated = await this.repo.updateStatus(id, 'CLAIMED', { claimedAt: new Date() });
    this.gateway.emitHelpClaimed(req.agentId, { helpRequestId: id, agentId: req.agentId });
    return updated;
  }
}

@Injectable()
export class ResolveHelpRequestUseCase {
  constructor(
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly repo: HelpRequestRepositoryPort,
    private readonly gateway: AttendantGateway,
  ) {}

  async execute(id: string) {
    const req = await this.repo.findById(id);
    if (!req) throw new NotFoundException(`HelpRequest ${id} não encontrado.`);
    if (req.status === 'RESOLVED') return req;
    const updated = await this.repo.updateStatus(id, 'RESOLVED', { resolvedAt: new Date() });
    this.gateway.emitHelpResolved(req.agentId, { helpRequestId: id, agentId: req.agentId });
    return updated;
  }
}

@Injectable()
export class DismissHelpRequestUseCase {
  constructor(
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly repo: HelpRequestRepositoryPort,
    private readonly gateway: AttendantGateway,
  ) {}

  async execute(id: string) {
    const req = await this.repo.findById(id);
    if (!req) throw new NotFoundException(`HelpRequest ${id} não encontrado.`);
    if (req.status === 'DISMISSED') return req;
    const updated = await this.repo.updateStatus(id, 'DISMISSED', { resolvedAt: new Date() });
    this.gateway.emitHelpResolved(req.agentId, { helpRequestId: id, agentId: req.agentId });
    return updated;
  }
}

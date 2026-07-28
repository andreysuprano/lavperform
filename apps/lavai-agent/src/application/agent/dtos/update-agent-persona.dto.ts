import { PartialType } from '@nestjs/swagger';
import { AgentPersonaDto } from './create-agent.dto';

export class UpdateAgentPersonaDto extends PartialType(AgentPersonaDto) {}

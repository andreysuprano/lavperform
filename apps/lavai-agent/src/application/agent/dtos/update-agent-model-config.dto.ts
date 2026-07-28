import { PartialType } from '@nestjs/swagger';
import { AgentModelConfigDto } from './create-agent.dto';

export class UpdateAgentModelConfigDto extends PartialType(AgentModelConfigDto) {}

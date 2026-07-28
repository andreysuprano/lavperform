import { PartialType } from '@nestjs/swagger';
import { AgentMemoryConfigDto } from './create-agent.dto';

export class UpdateAgentMemoryConfigDto extends PartialType(AgentMemoryConfigDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateMcpServerDto } from './create-mcp-server.dto';

export class UpdateMcpServerDto extends PartialType(CreateMcpServerDto) {}

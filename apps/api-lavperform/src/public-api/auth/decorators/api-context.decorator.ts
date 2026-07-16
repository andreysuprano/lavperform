import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PublicApiContext } from '../interfaces/api-context.interface';

export const ApiContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicApiContext => {
    const request = ctx.switchToHttp().getRequest<{ apiContext?: PublicApiContext }>();
    if (!request.apiContext) {
      throw new UnauthorizedException('Contexto de API key não encontrado');
    }
    return request.apiContext;
  },
);

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user || !request.user.userId) {
      throw new UnauthorizedException('Usuário não autenticado ou token inválido');
    }
    return request.user.userId;
  },
); 
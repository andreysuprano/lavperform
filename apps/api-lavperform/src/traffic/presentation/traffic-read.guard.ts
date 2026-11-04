import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

type AccessRuleLike = { module?: string; action?: string } | string;

function hasTrafficRead(rules: AccessRuleLike[] | undefined): boolean {
  return (rules ?? []).some((rule) => {
    if (typeof rule === 'string') return rule === 'traffic.read';
    return rule?.module === 'traffic' && rule?.action === 'read';
  });
}

@Injectable()
export class TrafficReadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!hasTrafficRead(request.user?.accessRules)) {
      throw new ForbiddenException();
    }
    return true;
  }
}

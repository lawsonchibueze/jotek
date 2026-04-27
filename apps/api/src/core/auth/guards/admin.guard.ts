import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '../auth';
import { fromNodeHeaders } from 'better-auth/node';

export const ROLES_KEY = 'roles';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const { user } = session;
    const adminRoles = ['admin', 'super_admin', 'manager', 'inventory_clerk', 'support'];

    if (!user.role || !adminRoles.includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    // Check for specific role requirements set by @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `This action requires one of: ${requiredRoles.join(', ')}`,
        );
      }
    }

    request.user = user;
    request.session = session.session;
    return true;
  }
}

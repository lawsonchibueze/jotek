import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { auth } from '../auth';
import { fromNodeHeaders } from 'better-auth/node';

/** Attaches user to request if authenticated; never throws. */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (session) {
        request.user = session.user;
        request.session = session.session;
      }
    } catch {
      // silent — unauthenticated requests are fine
    }
    return true;
  }
}

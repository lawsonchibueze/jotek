import { Global, Module } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { AdminGuard } from './guards/admin.guard';
import { OptionalSessionGuard } from './guards/optional-session.guard';

@Global()
@Module({
  providers: [SessionGuard, AdminGuard, OptionalSessionGuard],
  exports: [SessionGuard, AdminGuard, OptionalSessionGuard],
})
export class AuthModule {}

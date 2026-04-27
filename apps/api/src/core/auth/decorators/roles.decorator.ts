import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/admin.guard';
import type { AdminRole } from '@jotek/types';

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

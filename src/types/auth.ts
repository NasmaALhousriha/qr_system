import type { Role } from '../generated/prisma/enums';

export type { Role };

export interface AuthUser {
  id: number;
  role: Role;
}
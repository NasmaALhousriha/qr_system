import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
//   مابرجع الا اذا انا طلبتوselect هيك احسن من ال  
  omit: {
    user: { passwordHash: true },
    student: { activationCodeHash: true },
  },
});
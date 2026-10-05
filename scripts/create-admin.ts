import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  }

  const exists = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (exists) {
    console.log('Admin already exists');
    return;
  }

  await prisma.user.create({
    data: {
      name: ADMIN_NAME ?? 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'ADMIN',
    },
  });
  console.log('Admin created');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
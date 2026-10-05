import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { verifyActivationCode } from '../utils/activationCode';
import { AppError } from '../utils/AppError';

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
  where: { email },
  omit: { passwordHash: false }, 
});
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) throw new AppError('Invalid email or password', 401);

  const token = jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresInSeconds,
  });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function activateStudent(
  studentId: string,
  activationCode: string,
  password: string,
) {
 const record = await prisma.student.findUnique({
   where: { studentId },
   omit: { activationCodeHash: false },
  });
  if (
    !record ||
    record.userId ||
    !record.activationCodeHash ||
    !verifyActivationCode(activationCode, record.activationCodeHash)  
  ) {
    throw new AppError('Invalid student ID or activation code', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: record.name, email: record.email, passwordHash, role: 'STUDENT' },
      });
      await tx.student.update({
        where: { id: record.id },
        data: { userId: user.id, activationCodeHash: null }, 
      });
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError('An account with this email already exists', 409);
    }
    throw err;
  }
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}
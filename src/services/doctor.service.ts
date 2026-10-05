import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

const doctorSelect = { id: true, name: true, email: true, createdAt: true } as const;

interface CreateDoctorInput {
  name: string;
  email: string;
  password: string;
}

export async function createDoctor(data: CreateDoctorInput) {
  try {
    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: 'DOCTOR',
      },
      select: doctorSelect,
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError('Email already in use', 409);
    }
    throw err;
  }
}

export function getDoctors() {
  return prisma.user.findMany({
    where: { role: 'DOCTOR' },
    select: doctorSelect,
    orderBy: { name: 'asc' },
  });
}
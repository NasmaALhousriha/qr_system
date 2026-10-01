import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

interface CreateStudentInput {
  name: string;
  email: string;
  studentId: string;
}

export async function createStudent(data: CreateStudentInput) {
  try {
    return await prisma.student.create({
      data: { ...data, qrCodeToken: randomUUID() },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError('Email or studentId already exists', 409);
    }
    throw err;
  }
}

export function getStudents() {
  return prisma.student.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getStudentQr(id: number) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new AppError('Student not found', 404);

  return QRCode.toBuffer(student.qrCodeToken);
}
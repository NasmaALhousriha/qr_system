import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { AuthUser } from '../types/auth';
import { createQrImage, createQrToken } from './qr.service';

interface CreateLectureInput {
  title: string;
  startTime: Date;
  endTime: Date;
}

export function createLecture(doctorId: number, data: CreateLectureInput) {
  return prisma.lecture.create({ data: { ...data, doctorId } });
}

// الأدمن بيشوف الكل، والدكتور بيشوف محاضراته بس
export function getLectures(user: AuthUser) {
  return prisma.lecture.findMany({
    where: user.role === 'ADMIN' ? {} : { doctorId: user.id },
    orderBy: { startTime: 'desc' },
  });
}

export async function getLectureQr(lectureId: number, doctorId: number) {
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

  // نفس الرد لمحاضرة مو موجودة أو لدكتور تاني: ما منكشف إنها موجودة
  if (!lecture || lecture.doctorId !== doctorId) {
    throw new AppError('Lecture not found', 404);
  }

  const { token, expiresAt } = createQrToken(lecture.id);

  return {
    lecture: {
      id: lecture.id,
      title: lecture.title,
      startTime: lecture.startTime,
      endTime: lecture.endTime,
    },
    token,
    qrImage: await createQrImage(token), 
    expiresAt,
    refreshInSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
  };
}
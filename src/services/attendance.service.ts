import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { AuthUser } from '../types/auth';
import { verifyQrToken } from './qr.service';

export async function markAttendance(userId: number, qrToken: string) {
  // 1. الرمز سليم وما انتهى؟ (بيعطينا رقم المحاضرة)
  const lectureId = verifyQrToken(qrToken);
  if (lectureId === null) throw new AppError('Invalid or expired QR code', 400);

  // 2. الطالب من الحساب (JWT)، مو من الرمز
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError('Student profile not found', 404);

  // 3. المحاضرة موجودة
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!lecture) throw new AppError('Lecture not found', 404);

  // 4. التحقق الزمني
  const now = new Date();
  if (now < lecture.startTime) throw new AppError('Lecture has not started yet');
  if (now > lecture.endTime) throw new AppError('Lecture has already ended');

  try {
    return await prisma.attendance.create({
      data: { studentId: student.id, lectureId: lecture.id },
      select: {
        id: true,
        scannedAt: true,
        lecture: { select: { id: true, title: true } },
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError('Attendance already recorded for this lecture', 409);
    }
    throw err;
  }
}

export async function getMyAttendance(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError('Student profile not found', 404);

  return prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { scannedAt: 'desc' },
    select: {
      id: true,
      scannedAt: true,
      lecture: { select: { id: true, title: true, startTime: true } },
    },
  });
}

export async function getLectureAttendance(lectureId: number, user: AuthUser) {
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      doctorId: true,
      attendances: {
        orderBy: { scannedAt: 'asc' },
        select: {
          id: true,
          scannedAt: true,
          student: { select: { id: true, studentId: true, name: true } },
        },
      },
    },
  });

  // الدكتور التاني بياخد 404 مو 403، ما منكشف إنو المحاضرة موجودة
  if (!lecture || (user.role !== 'ADMIN' && lecture.doctorId !== user.id)) {
    throw new AppError('Lecture not found', 404);
  }

  const { doctorId, attendances, ...info } = lecture;
  return { lecture: info, total: attendances.length, attendances };
}
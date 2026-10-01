import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export async function markAttendance(qrCodeToken: string, lectureId: number) {
  // 1. التحقق من هوية الطالب
  const student = await prisma.student.findUnique({ where: { qrCodeToken } });
  if (!student) throw new AppError('Invalid QR code', 404);

  // 2. التحقق من وجود المحاضرة
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!lecture) throw new AppError('Lecture not found', 404);

  // 3. التحقق الزمني
  const now = new Date();
  if (now < lecture.startTime) throw new AppError('Lecture has not started yet');
  if (now > lecture.endTime) throw new AppError('Lecture has already ended');

  // 4. منع التكرار 
  try {
    return await prisma.attendance.create({
      data: { studentId: student.id, lectureId: lecture.id },
      include: { student: { select: { id: true, name: true, studentId: true } } },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError('Attendance already recorded for this lecture', 409);
    }
    throw err;
  }
}

export async function getLectureAttendance(lectureId: number) {
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    include: {
      attendances: {
        orderBy: { scannedAt: 'asc' },
        include: { student: { select: { id: true, name: true, studentId: true } } },
      },
    },
  });
  if (!lecture) throw new AppError('Lecture not found', 404);

  return lecture;
}
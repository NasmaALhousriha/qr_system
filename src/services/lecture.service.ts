import { prisma } from '../lib/prisma';

interface CreateLectureInput {
  title: string;
  startTime: Date;
  endTime: Date;
}

export function createLecture(data: CreateLectureInput) {
  return prisma.lecture.create({ data });
}

export function getLectures() {
  return prisma.lecture.findMany({ orderBy: { startTime: 'desc' } });
}
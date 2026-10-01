import { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';
import { AppError } from '../utils/AppError';

export async function mark(req: Request, res: Response) {
  const { qrCodeToken, lectureId } = req.body ?? {};

  if (typeof qrCodeToken !== 'string' || !qrCodeToken.trim()) {
    throw new AppError('qrCodeToken is required');
  }
  const lectureIdNum = Number(lectureId);
  if (!Number.isInteger(lectureIdNum)) {
    throw new AppError('lectureId must be an integer');
  }

  const attendance = await attendanceService.markAttendance(
    qrCodeToken.trim(),
    lectureIdNum,
  );
  res.status(201).json(attendance);
}

export async function listByLecture(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError('Invalid lecture id');

  res.json(await attendanceService.getLectureAttendance(id));
} 
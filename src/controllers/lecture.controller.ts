import { Request, Response } from 'express';
import * as lectureService from '../services/lecture.service';
import { AppError } from '../utils/AppError';

export async function create(req: Request, res: Response) {
  const { title, startTime, endTime } = req.validated.body;
  if (endTime <= startTime) throw new AppError('endTime must be after startTime');

  const lecture = await lectureService.createLecture(req.user!.id, { title, startTime, endTime });
  res.status(201).json(lecture);
}

export async function list(req: Request, res: Response) {
  res.json(await lectureService.getLectures(req.user!));
}

export async function getQr(req: Request, res: Response) {
  const qr = await lectureService.getLectureQr(req.validated.params.id, req.user!.id);
  res.set('Cache-Control', 'no-store'); // الرمز بيتغير، ممنوع يتخزن بالمتصفح
  res.json(qr);
}
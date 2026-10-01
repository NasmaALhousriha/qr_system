import { Request, Response } from 'express';
import * as lectureService from '../services/lecture.service';
import { AppError } from '../utils/AppError';

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function create(req: Request, res: Response) {
  const { title, startTime, endTime } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    throw new AppError('title is required');
  }

  const start = parseDate(startTime);
  const end = parseDate(endTime);
  if (!start || !end) {
    throw new AppError('startTime and endTime must be valid dates');
  }
  if (end <= start) {
    throw new AppError('endTime must be after startTime');
  }

  const lecture = await lectureService.createLecture({
    title: title.trim(),
    startTime: start,
    endTime: end,
  });
  res.status(201).json(lecture);
}

export async function list(req: Request, res: Response) {
  res.json(await lectureService.getLectures());
}
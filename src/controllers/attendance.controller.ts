import { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';

export async function mark(req: Request, res: Response) {
  const attendance = await attendanceService.markAttendance(
    req.user!.id,
    req.validated.body.token,
  );
  res.status(201).json(attendance);
}

export async function listMine(req: Request, res: Response) {
  res.json(await attendanceService.getMyAttendance(req.user!.id));
}

export async function listByLecture(req: Request, res: Response) {
  res.json(
    await attendanceService.getLectureAttendance(req.validated.params.id, req.user!),
  );
}
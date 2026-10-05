import { Request, Response } from 'express';
import * as studentService from '../services/student.service';

export async function importStudents(req: Request, res: Response) {
  const { students } = req.validated.body;
  res.status(201).json(await studentService.importStudents(students));
}

export async function list(req: Request, res: Response) {
  const { page, limit, search } = req.validated.query;
  res.json(await studentService.getStudents(page, limit, search));
}

export async function resetCode(req: Request, res: Response) {
  res.json(await studentService.resetActivationCode(req.validated.params.id));
}
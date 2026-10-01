import { Request, Response } from 'express';
import * as studentService from '../services/student.service';
import { AppError } from '../utils/AppError';

export async function create(req: Request, res: Response) {
  const { name, email, studentId } = req.body ?? {};
  if (!name || !email || !studentId) {
    throw new AppError('name, email and studentId are required');
  }

  const student = await studentService.createStudent({ name, email, studentId });
  res.status(201).json(student);
}

export async function list(req: Request, res: Response) {
  res.json(await studentService.getStudents());
}

export async function getQr(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError('Invalid student id');

  const png = await studentService.getStudentQr(id);
  res.type('png').send(png);
}
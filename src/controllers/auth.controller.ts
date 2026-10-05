import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.validated.body;
  res.json(await authService.login(email, password));
}

export async function activate(req: Request, res: Response) {
  const { studentId, activationCode, password } = req.validated.body;
  await authService.activateStudent(studentId, activationCode, password);
  res.json({ message: 'Account activated. You can now log in.' });
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getProfile(req.user!.id));
}
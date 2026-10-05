import { Request, Response } from 'express';
import * as doctorService from '../services/doctor.service';

export async function create(req: Request, res: Response) {
  const doctor = await doctorService.createDoctor(req.validated.body);
  res.status(201).json(doctor);
}

export async function list(req: Request, res: Response) {
  res.json(await doctorService.getDoctors());
}
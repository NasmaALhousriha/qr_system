import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
export const PASSWORD = 'Passw0rd!2026';
export const SENSITIVE = /passwordHash|activationCodeHash|activationCode|qrCodeToken/;

export const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const emailOf = (name: string) => `test-${run}-${name}@example.com`;
export const studentIdOf = (key: string) => `T${run}-${key}`;
export const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

export interface Session {
  token: string;
  id: number;
}

export async function api(
  method: string,
  path: string,
  opts: { token?: string; json?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.json === undefined ? undefined : JSON.stringify(opts.json),
  });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('application/json') ? await res.json() : null };
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await api('POST', '/api/auth/login', { json: { email, password } });
  assert.equal(res.status, 200, `Login failed for ${email}`);
  return { token: res.body.token, id: res.body.user.id };
}

export function activate(studentId: string, activationCode: string, password = PASSWORD) {
  return api('POST', '/api/auth/activate', { json: { studentId, activationCode, password } });
}

export async function createLecture(session: Session, name: string, startHours: number, endHours: number) {
  const res = await api('POST', '/api/lectures', {
    token: session.token,
    json: { title: `[test ${run}] ${name}`, startTime: hours(startHours), endTime: hours(endHours) },
  });
  assert.equal(res.status, 201, `Could not create lecture "${name}"`);
  return res.body as { id: number; doctorId: number };
}

export async function getQrToken(session: Session, lectureId: number): Promise<string> {
  const res = await api('GET', `/api/lectures/${lectureId}/qr`, { token: session.token });
  assert.equal(res.status, 200);
  return res.body.token;
}

export async function findStudent(adminToken: string, studentId: string) {
  const res = await api('GET', `/api/students?search=${encodeURIComponent(studentId)}`, {
    token: adminToken,
  });
  return res.body.items.find((s: any) => s.studentId === studentId);
}


export interface Fixtures {
  admin: Session;
  doctor1: Session;
  doctor2: Session;
  studentA: Session; // activated
  studentB: Session; // activated
  codes: Record<string, string>; 
  lectures: {
    active: { id: number };
    active2: { id: number };
    concurrent: { id: number };
    past: { id: number };
    future: { id: number };
    otherDoctor: { id: number };
  };
}

export async function createFixtures(): Promise<Fixtures> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  assert.ok(
    ADMIN_EMAIL && ADMIN_PASSWORD,
    'Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (and run: npm run create-admin)',
  );

  let admin: Session;
  try {
    admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    throw new Error(`Cannot log in as admin. Is the server running on ${BASE_URL}? ${err}`);
  }

  for (const name of ['doctor1', 'doctor2']) {
    const res = await api('POST', '/api/doctors', {
      token: admin.token,
      json: { name: `Dr ${name}`, email: emailOf(name), password: PASSWORD },
    });
    assert.equal(res.status, 201);
  }
  const doctor1 = await login(emailOf('doctor1'), PASSWORD);
  const doctor2 = await login(emailOf('doctor2'), PASSWORD);

  const imported = await api('POST', '/api/students/import', {
    token: admin.token,
    json: {
      students: ['A', 'B', 'C'].map((key) => ({
        studentId: studentIdOf(key),
        name: `Student ${key}`,
        email: emailOf(`student${key.toLowerCase()}`),
      })),
    },
  });
  assert.equal(imported.status, 201);

  const codes: Record<string, string> = {};
  for (const item of imported.body.activationCodes) codes[item.studentId] = item.activationCode;

  for (const key of ['A', 'B']) {
    assert.equal((await activate(studentIdOf(key), codes[studentIdOf(key)])).status, 200);
  }
  const studentA = await login(emailOf('studenta'), PASSWORD);
  const studentB = await login(emailOf('studentb'), PASSWORD);

  return {
    admin,
    doctor1,
    doctor2,
    studentA,
    studentB,
    codes,
    lectures: {
      active: await createLecture(doctor1, 'Active', -1, 1),
      active2: await createLecture(doctor1, 'Active 2', -1, 1),
      concurrent: await createLecture(doctor1, 'Concurrent', -1, 1),
      past: await createLecture(doctor1, 'Past', -3, -2),
      future: await createLecture(doctor1, 'Future', 2, 3),
      otherDoctor: await createLecture(doctor2, 'Other doctor', -1, 1),
    },
  };
}

export async function cleanup() {
  await prisma.lecture.deleteMany({ where: { title: { startsWith: `[test ${run}]` } } });
  await prisma.student.deleteMany({ where: { email: { startsWith: `test-${run}-` } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `test-${run}-` } } });
  await prisma.$disconnect();
}

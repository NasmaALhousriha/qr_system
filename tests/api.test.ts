import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const run = Date.now(); // makes test data unique on every run

interface ApiResponse {
  status: number;
  contentType: string;
  body: any;
}

async function api(method: string, path: string, json?: unknown): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: json === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.arrayBuffer();
  return { status: res.status, contentType, body };
}


const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

const studentPayload = {
  name: 'Test Student',
  email: `test-${run}@example.com`,
  studentId: `T${run}`,
};

let student: { id: number; qrCodeToken: string };
let activeLecture: { id: number };
let pastLecture: { id: number };
let futureLecture: { id: number };

before(async () => {
  const s = await api('POST', '/api/students', studentPayload);
  assert.equal(s.status, 201, `Could not create a student. Is the server running on ${BASE_URL}?`);
  student = s.body;

  const lecture = async (name: string, start: number, end: number) => {
    const res = await api('POST', '/api/lectures', {
      title: `[test ${run}] ${name}`,
      startTime: hours(start),
      endTime: hours(end),
    });
    assert.equal(res.status, 201);
    return res.body as { id: number };
  };

  activeLecture = await lecture('Active', -1, 1);
  pastLecture = await lecture('Past', -3, -2);
  futureLecture = await lecture('Future', 2, 3);
});

// remove everything this run created (attendances are removed by onDelete: Cascade)
after(async () => {
  await prisma.student.deleteMany({ where: { email: { startsWith: `test-${run}` } } });
  await prisma.lecture.deleteMany({ where: { title: { startsWith: `[test ${run}]` } } });
  await prisma.$disconnect();
});

describe('Students', () => {
  test('a created student gets a qrCodeToken', () => {
    assert.equal(typeof student.qrCodeToken, 'string');
    assert.ok(student.qrCodeToken.length > 0);
  });

  test('duplicate email or studentId returns 409', async () => {
    const res = await api('POST', '/api/students', studentPayload);
    assert.equal(res.status, 409);
  });

  test('missing email returns 400', async () => {
    const res = await api('POST', '/api/students', { name: 'No Email', studentId: `X${run}` });
    assert.equal(res.status, 400);
  });

  test('GET /api/students returns a list', async () => {
    const res = await api('GET', '/api/students');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  test('GET qr returns a PNG image', async () => {
    const res = await api('GET', `/api/students/${student.id}/qr`);
    assert.equal(res.status, 200);
    assert.match(res.contentType, /image\/png/);
  });

  test('GET qr for an unknown student returns 404', async () => {
    const res = await api('GET', '/api/students/999999999/qr');
    assert.equal(res.status, 404);
  });

  test('GET qr with an invalid id returns 400', async () => {
    const res = await api('GET', '/api/students/abc/qr');
    assert.equal(res.status, 400);
  });
});

describe('Lectures', () => {
  test('endTime before startTime returns 400', async () => {
    const res = await api('POST', '/api/lectures', {
      title: `[test ${run}] Bad times`,
      startTime: hours(2),
      endTime: hours(1),
    });
    assert.equal(res.status, 400);
  });

  test('missing title returns 400', async () => {
    const res = await api('POST', '/api/lectures', { startTime: hours(1), endTime: hours(2) });
    assert.equal(res.status, 400);
  });

  test('invalid date returns 400', async () => {
    const res = await api('POST', '/api/lectures', {
      title: `[test ${run}] Bad date`,
      startTime: 'abc',
      endTime: hours(2),
    });
    assert.equal(res.status, 400);
  });

  test('GET /api/lectures returns a list', async () => {
    const res = await api('GET', '/api/lectures');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('Attendance', () => {
  test('valid scan during the lecture returns 201', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: activeLecture.id,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.student.name, studentPayload.name);
  });

  test('scanning twice for the same lecture returns 409', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: activeLecture.id,
    });
    assert.equal(res.status, 409);
  });

  test('unknown QR token returns 404', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: 'not-a-real-token',
      lectureId: activeLecture.id,
    });
    assert.equal(res.status, 404);
  });

  test('unknown lecture returns 404', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: 999999999,
    });
    assert.equal(res.status, 404);
  });

  test('lecture that already ended returns 400', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: pastLecture.id,
    });
    assert.equal(res.status, 400);
  });

  test('lecture that has not started returns 400', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: futureLecture.id,
    });
    assert.equal(res.status, 400);
  });

  test('missing qrCodeToken returns 400', async () => {
    const res = await api('POST', '/api/attendance', { lectureId: activeLecture.id });
    assert.equal(res.status, 400);
  });

  test('non-integer lectureId returns 400', async () => {
    const res = await api('POST', '/api/attendance', {
      qrCodeToken: student.qrCodeToken,
      lectureId: 'abc',
    });
    assert.equal(res.status, 400);
  });

  test('GET lecture attendance lists the student', async () => {
    const res = await api('GET', `/api/lectures/${activeLecture.id}/attendance`);
    assert.equal(res.status, 200);
    assert.equal(res.body.attendances.length, 1);
    assert.equal(res.body.attendances[0].student.id, student.id);
  });

  test('GET attendance of an unknown lecture returns 404', async () => {
    const res = await api('GET', '/api/lectures/999999999/attendance');
    assert.equal(res.status, 404);
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createQrToken } from '../src/services/qr.service';
import { api, cleanup, createFixtures, Fixtures, getQrToken, SENSITIVE, studentIdOf } from './helpers';

let f: Fixtures;
before(async () => {
  f = await createFixtures();
});
after(cleanup);

const mark = (token: string, qrToken: string, extra: object = {}) =>
  api('POST', '/api/attendance', { token, json: { token: qrToken, ...extra } });

describe('Marking attendance', () => {
  test('a student marks attendance with the lecture QR, but only once', async () => {
    const qr = await getQrToken(f.doctor1, f.lectures.active.id);

    const first = await mark(f.studentA.token, qr);
    assert.equal(first.status, 201);
    assert.equal(first.body.lecture.id, f.lectures.active.id);

    const second = await mark(f.studentA.token, qr);
    assert.equal(second.status, 409);
  });

  test('another student can use the same QR with their own account', async () => {
    const qr = await getQrToken(f.doctor1, f.lectures.active.id);
    assert.equal((await mark(f.studentB.token, qr)).status, 201);
  });

  test('a student cannot mark attendance for someone else (extra studentId is ignored)', async () => {
    const qr = await getQrToken(f.doctor1, f.lectures.active2.id);
    const res = await mark(f.studentA.token, qr, { studentId: studentIdOf('B') });
    assert.equal(res.status, 201);

    const list = await api('GET', `/api/lectures/${f.lectures.active2.id}/attendance`, {
      token: f.doctor1.token,
    });
    assert.equal(list.body.total, 1);
    assert.equal(list.body.attendances[0].student.studentId, studentIdOf('A'));
  });

  test('simultaneous requests record the attendance only once', async () => {
    const qr = await getQrToken(f.doctor1, f.lectures.concurrent.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => mark(f.studentB.token, qr)),
    );
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
  });
});

describe('Rejected scans', () => {
  test('a missing or garbage token returns 400', async () => {
    const missing = await api('POST', '/api/attendance', { token: f.studentA.token, json: {} });
    assert.equal(missing.status, 400);
    assert.equal((await mark(f.studentA.token, 'not-a-qr-token')).status, 400);
  });

  test('an expired QR token returns 400', async () => {
    const { token } = createQrToken(f.lectures.active.id, Date.now() - 120_000);
    const res = await mark(f.studentA.token, token);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /expired/i);
  });

  test('a QR token with a changed lecture id returns 400', async () => {
    const real = await getQrToken(f.doctor1, f.lectures.active.id);
    const tampered = real.replace(/^\d+/, String(f.lectures.future.id));
    assert.equal((await mark(f.studentA.token, tampered)).status, 400);
  });

  test('a lecture that already ended returns 400', async () => {
    const res = await mark(f.studentA.token, await getQrToken(f.doctor1, f.lectures.past.id));
    assert.equal(res.status, 400);
    assert.match(res.body.message, /ended/i);
  });

  test('a lecture that has not started returns 400', async () => {
    const res = await mark(f.studentA.token, await getQrToken(f.doctor1, f.lectures.future.id));
    assert.equal(res.status, 400);
    assert.match(res.body.message, /not started/i);
  });

  test('a valid token for a lecture that does not exist returns 404', async () => {
    const res = await mark(f.studentA.token, createQrToken(999999999).token);
    assert.equal(res.status, 404);
  });
});

describe('Viewing attendance', () => {
  test('the owner doctor sees who attended, without secrets', async () => {
    const res = await api('GET', `/api/lectures/${f.lectures.active.id}/attendance`, {
      token: f.doctor1.token,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    const ids = res.body.attendances.map((a: any) => a.student.studentId).sort();
    assert.deepEqual(ids, [studentIdOf('A'), studentIdOf('B')]);
    assert.doesNotMatch(JSON.stringify(res.body), SENSITIVE);
  });

  test('another doctor gets 404, while the admin can see it', async () => {
    const path = `/api/lectures/${f.lectures.active.id}/attendance`;
    assert.equal((await api('GET', path, { token: f.doctor2.token })).status, 404);

    const admin = await api('GET', path, { token: f.admin.token });
    assert.equal(admin.status, 200);
    assert.equal(admin.body.total, 2);
  });

  test('a student sees their own attendance history', async () => {
    const res = await api('GET', '/api/attendance/me', { token: f.studentA.token });
    assert.equal(res.status, 200);
    const lectureIds = res.body.map((a: any) => a.lecture.id);
    assert.ok(lectureIds.includes(f.lectures.active.id));
    assert.ok(lectureIds.includes(f.lectures.active2.id));
  });
});

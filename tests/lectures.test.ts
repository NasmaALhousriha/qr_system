import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createQrToken, verifyQrToken } from '../src/services/qr.service';
import { api, cleanup, createFixtures, createLecture, Fixtures, hours, run } from './helpers';

let f: Fixtures;
before(async () => {
  f = await createFixtures();
});
after(cleanup);

describe('Lectures', () => {
  test('a lecture belongs to the doctor who created it, even if doctorId is sent', async () => {
    const own = await createLecture(f.doctor1, 'Ownership', 1, 2);
    assert.equal(own.doctorId, f.doctor1.id);

    const spoofed = await api('POST', '/api/lectures', {
      token: f.doctor1.token,
      json: {
        title: `[test ${run}] Spoofed owner`,
        startTime: hours(1),
        endTime: hours(2),
        doctorId: f.doctor2.id,
      },
    });
    assert.equal(spoofed.status, 201);
    assert.equal(spoofed.body.doctorId, f.doctor1.id);
  });

  test('invalid data returns 400 (end before start, no timezone, no title)', async () => {
    const title = `[test ${run}] Invalid`;
    const cases = [
      { title, startTime: hours(2), endTime: hours(1) },
      { title, startTime: '2026-10-05T09:00:00', endTime: '2026-10-05T11:00:00' },
      { startTime: hours(1), endTime: hours(2) },
    ];

    for (const json of cases) {
      const res = await api('POST', '/api/lectures', { token: f.doctor1.token, json });
      assert.equal(res.status, 400, JSON.stringify(json));
    }
  });

  test('a doctor sees only their lectures, and the admin sees all of them', async () => {
    const doctor2 = await api('GET', '/api/lectures', { token: f.doctor2.token });
    assert.ok(doctor2.body.every((l: any) => l.doctorId === f.doctor2.id));
    assert.ok(doctor2.body.some((l: any) => l.id === f.lectures.otherDoctor.id));
    assert.ok(!doctor2.body.some((l: any) => l.id === f.lectures.active.id));

    const admin = await api('GET', '/api/lectures', { token: f.admin.token });
    assert.ok(admin.body.some((l: any) => l.id === f.lectures.active.id));
    assert.ok(admin.body.some((l: any) => l.id === f.lectures.otherDoctor.id));
  });
});

describe('Lecture QR endpoint', () => {
  test('the owner gets a valid token and a QR image', async () => {
    const res = await api('GET', `/api/lectures/${f.lectures.active.id}/qr`, { token: f.doctor1.token });
    assert.equal(res.status, 200);
    assert.equal(verifyQrToken(res.body.token), f.lectures.active.id);
    assert.match(res.body.qrImage, /^data:image\/png;base64,/);
    assert.ok(new Date(res.body.expiresAt).getTime() > Date.now());
  });

  test("another doctor cannot get the lecture's QR (404)", async () => {
    const res = await api('GET', `/api/lectures/${f.lectures.active.id}/qr`, { token: f.doctor2.token });
    assert.equal(res.status, 404);
  });

  test('unknown lecture returns 404 and an invalid id returns 400', async () => {
    const unknown = await api('GET', '/api/lectures/999999999/qr', { token: f.doctor1.token });
    const invalid = await api('GET', '/api/lectures/abc/qr', { token: f.doctor1.token });
    assert.equal(unknown.status, 404);
    assert.equal(invalid.status, 400);
  });
});

describe('QR token logic (no server needed)', () => {
  const now = Date.now();

  test('a fresh token verifies to its lecture id', () => {
    assert.equal(verifyQrToken(createQrToken(5, now).token, now), 5);
  });

  test('the token changes every 30 seconds but not inside the same window', () => {
    const windowStart = Math.floor(now / 30_000) * 30_000;
    assert.equal(createQrToken(5, windowStart).token, createQrToken(5, windowStart + 29_000).token);
    assert.notEqual(createQrToken(5, now).token, createQrToken(5, now + 30_000).token);
  });

  test('the current and the previous window are accepted', () => {
    assert.equal(verifyQrToken(createQrToken(5, now).token, now), 5);
    assert.equal(verifyQrToken(createQrToken(5, now - 30_000).token, now), 5);
  });

  test('older and future windows are rejected', () => {
    assert.equal(verifyQrToken(createQrToken(5, now - 60_000).token, now), null);
    assert.equal(verifyQrToken(createQrToken(5, now + 30_000).token, now), null);
  });

  test('a tampered signature or lecture id is rejected', () => {
    const { token } = createQrToken(5, now);
    const badSignature = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    assert.equal(verifyQrToken(badSignature, now), null);
    assert.equal(verifyQrToken(token.replace(/^\d+/, '6'), now), null);
  });

  test('malformed tokens are rejected', () => {
    for (const bad of ['', 'abc', '1.2', 'a.b.c', '1.2.3.4', '5.x.sig']) {
      assert.equal(verifyQrToken(bad, now), null, `"${bad}"`);
    }
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, cleanup, createFixtures, Fixtures, Session } from './helpers';

let f: Fixtures;
before(async () => {
  f = await createFixtures();
});
after(cleanup);

describe('Permissions', () => {
  test('every protected route rejects a request without a token (401)', async () => {
    const routes: [string, string][] = [
      ['GET', '/api/auth/me'],
      ['GET', '/api/doctors'],
      ['POST', '/api/doctors'],
      ['GET', '/api/students'],
      ['POST', '/api/students/import'],
      ['GET', '/api/lectures'],
      ['POST', '/api/lectures'],
      ['GET', '/api/lectures/1/qr'],
      ['GET', '/api/lectures/1/attendance'],
      ['POST', '/api/attendance'],
      ['GET', '/api/attendance/me'],
    ];

    for (const [method, path] of routes) {
      const res = await api(method, path, { json: method === 'POST' ? {} : undefined });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });

  test('a role cannot call routes that belong to another role (403)', async () => {
    const cases: [string, Session, string, string][] = [
      ['doctor', f.doctor1, 'GET', '/api/doctors'],
      ['doctor', f.doctor1, 'GET', '/api/students'],
      ['doctor', f.doctor1, 'POST', '/api/students/import'],
      ['doctor', f.doctor1, 'POST', '/api/attendance'],
      ['doctor', f.doctor1, 'GET', '/api/attendance/me'],
      ['student', f.studentA, 'GET', '/api/doctors'],
      ['student', f.studentA, 'GET', '/api/students'],
      ['student', f.studentA, 'GET', '/api/lectures'],
      ['student', f.studentA, 'POST', '/api/lectures'],
      ['student', f.studentA, 'GET', '/api/lectures/1/qr'],
      ['student', f.studentA, 'GET', '/api/lectures/1/attendance'],
      ['admin', f.admin, 'POST', '/api/lectures'],
      ['admin', f.admin, 'GET', '/api/lectures/1/qr'],
      ['admin', f.admin, 'POST', '/api/attendance'],
      ['admin', f.admin, 'GET', '/api/attendance/me'],
    ];

    for (const [who, session, method, path] of cases) {
      const res = await api(method, path, {
        token: session.token,
        json: method === 'POST' ? {} : undefined,
      });
      assert.equal(res.status, 403, `${who}: ${method} ${path}`);
    }
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { api, cleanup, createFixtures, emailOf, Fixtures, PASSWORD, SENSITIVE } from './helpers';

let f: Fixtures;
before(async () => {
  f = await createFixtures();
});
after(cleanup);

describe('Login', () => {
  test('valid credentials return a token and the role, without secrets', async () => {
    const res = await api('POST', '/api/auth/login', {
      json: { email: emailOf('doctor1'), password: PASSWORD },
    });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(res.body.user.role, 'DOCTOR');
    assert.doesNotMatch(JSON.stringify(res.body), SENSITIVE);
  });

  test('email is case-insensitive and trimmed', async () => {
    const res = await api('POST', '/api/auth/login', {
      json: { email: `  ${emailOf('doctor1').toUpperCase()}  `, password: PASSWORD },
    });
    assert.equal(res.status, 200);
  });

  test('wrong password and unknown email both return 401 with the same message', async () => {
    const wrongPassword = await api('POST', '/api/auth/login', {
      json: { email: emailOf('doctor1'), password: 'wrong-password' },
    });
    const unknownEmail = await api('POST', '/api/auth/login', {
      json: { email: emailOf('nobody'), password: PASSWORD },
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(unknownEmail.body.message, wrongPassword.body.message);
  });

  test('missing fields return 400 with the list of errors', async () => {
    const res = await api('POST', '/api/auth/login', { json: {} });
    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e: any) => e.field);
    assert.ok(fields.includes('body.email') && fields.includes('body.password'));
  });

  test('GET /me returns the profile without secrets', async () => {
    const res = await api('GET', '/api/auth/me', { token: f.doctor1.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'DOCTOR');
    assert.doesNotMatch(JSON.stringify(res.body), SENSITIVE);
  });
});

describe('Token security', () => {
  test('a token edited to say ADMIN is rejected', async () => {
    const [header, , signature] = f.doctor1.token.split('.');
    const payload = Buffer.from(
      JSON.stringify({ sub: String(f.admin.id), role: 'ADMIN' }),
    ).toString('base64url');
    const res = await api('GET', '/api/doctors', { token: `${header}.${payload}.${signature}` });
    assert.equal(res.status, 401);
  });

  test('a token signed with another secret is rejected', async () => {
    const forged = jwt.sign({ role: 'ADMIN' }, 'not-the-real-secret', { subject: String(f.admin.id) });
    assert.equal((await api('GET', '/api/doctors', { token: forged })).status, 401);
  });

  test('an unsigned token (alg none) is rejected', async () => {
    const unsigned = jwt.sign({ role: 'ADMIN' }, '', { algorithm: 'none', subject: String(f.admin.id) });
    assert.equal((await api('GET', '/api/doctors', { token: unsigned })).status, 401);
  });

  test('an expired token is rejected', async () => {
    const expired = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET!, {
      subject: String(f.admin.id),
      expiresIn: -10,
    });
    assert.equal((await api('GET', '/api/auth/me', { token: expired })).status, 401);
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activate,
  api,
  cleanup,
  createFixtures,
  emailOf,
  findStudent,
  Fixtures,
  PASSWORD,
  SENSITIVE,
  studentIdOf,
} from './helpers';

let f: Fixtures;
before(async () => {
  f = await createFixtures();
});
after(cleanup);

describe('Doctors', () => {
  test('the admin creates a doctor and the response has no secrets', async () => {
    const res = await api('POST', '/api/doctors', {
      token: f.admin.token,
      json: { name: 'Dr New', email: emailOf('doctor-new'), password: PASSWORD },
    });
    assert.equal(res.status, 201);
    assert.doesNotMatch(JSON.stringify(res.body), SENSITIVE);
  });

  test('duplicate email returns 409', async () => {
    const res = await api('POST', '/api/doctors', {
      token: f.admin.token,
      json: { name: 'Dr Copy', email: emailOf('doctor1'), password: PASSWORD },
    });
    assert.equal(res.status, 409);
  });

  test('short password or invalid email returns 400', async () => {
    const weak = await api('POST', '/api/doctors', {
      token: f.admin.token,
      json: { name: 'Dr Weak', email: emailOf('doctor-weak'), password: 'short' },
    });
    const badEmail = await api('POST', '/api/doctors', {
      token: f.admin.token,
      json: { name: 'Dr Mail', email: 'not-an-email', password: PASSWORD },
    });
    assert.equal(weak.status, 400);
    assert.equal(badEmail.status, 400);
  });

  test('an extra "role" field in the body is ignored (the doctor stays DOCTOR)', async () => {
    const created = await api('POST', '/api/doctors', {
      token: f.admin.token,
      json: { name: 'Dr Extra', email: emailOf('doctor-extra'), password: PASSWORD, role: 'ADMIN' },
    });
    assert.equal(created.status, 201);

    const res = await api('POST', '/api/auth/login', {
      json: { email: emailOf('doctor-extra'), password: PASSWORD },
    });
    assert.equal(res.body.user.role, 'DOCTOR');
  });
});

describe('Student import', () => {
  test('importing the same student again creates nothing', async () => {
    const res = await api('POST', '/api/students/import', {
      token: f.admin.token,
      json: { students: [{ studentId: studentIdOf('A'), name: 'Student A', email: emailOf('studenta') }] },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.created, 0);
    assert.equal(res.body.skipped.length, 1);
  });

  test('invalid rows are reported without stopping the valid ones', async () => {
    const res = await api('POST', '/api/students/import', {
      token: f.admin.token,
      json: {
        students: [
          { studentId: studentIdOf('D'), name: 'Student D', email: emailOf('studentd') },
          { studentId: studentIdOf('E'), name: 'Bad Email', email: 'not-an-email' },
        ],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.created, 1);
    assert.equal(res.body.invalid.length, 1);
    assert.equal(res.body.invalid[0].row, 2);
  });

  test('"students" must be an array', async () => {
    const res = await api('POST', '/api/students/import', {
      token: f.admin.token,
      json: { students: 'x' },
    });
    assert.equal(res.status, 400);
  });

  test('the list hides codes and hashes, and shows who activated', async () => {
    const res = await api('GET', `/api/students?search=${encodeURIComponent(studentIdOf(''))}`, {
      token: f.admin.token,
    });
    assert.equal(res.status, 200);
    assert.doesNotMatch(JSON.stringify(res.body), SENSITIVE);

    const a = res.body.items.find((s: any) => s.studentId === studentIdOf('A'));
    const c = res.body.items.find((s: any) => s.studentId === studentIdOf('C'));
    assert.equal(a.activated, true);
    assert.equal(c.activated, false);
  });

  test('pagination works and rejects invalid values', async () => {
    const one = await api('GET', '/api/students?page=1&limit=1', { token: f.admin.token });
    assert.equal(one.body.items.length, 1);

    const tooBig = await api('GET', '/api/students?limit=1000', { token: f.admin.token });
    const notNumber = await api('GET', '/api/students?page=abc', { token: f.admin.token });
    assert.equal(tooBig.status, 400);
    assert.equal(notNumber.status, 400);
  });
});

describe('Account activation', () => {
  test('a wrong code and an unknown student get the same 400 message', async () => {
    const wrongCode = await activate(studentIdOf('C'), 'AAAA-AAAA');
    const unknown = await activate(studentIdOf('unknown'), 'AAAA-AAAA');
    assert.equal(wrongCode.status, 400);
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.message, wrongCode.body.message);
  });

  test('a weak password is rejected and the code stays valid', async () => {
    const res = await activate(studentIdOf('C'), f.codes[studentIdOf('C')], 'short');
    assert.equal(res.status, 400);
    assert.equal((await findStudent(f.admin.token, studentIdOf('C'))).activated, false);
  });

  test('an activation code cannot be used twice', async () => {
    const res = await activate(studentIdOf('A'), f.codes[studentIdOf('A')]);
    assert.equal(res.status, 400);
  });

  test('an activated student logs in with the STUDENT role', async () => {
    const res = await api('GET', '/api/auth/me', { token: f.studentA.token });
    assert.equal(res.body.role, 'STUDENT');
  });

  test('resetting the code of an activated student returns 409', async () => {
    const student = await findStudent(f.admin.token, studentIdOf('A'));
    const res = await api('POST', `/api/students/${student.id}/activation-code`, {
      token: f.admin.token,
    });
    assert.equal(res.status, 409);
  });

  test('a reset code invalidates the old one, and the new one works', async () => {
    const student = await findStudent(f.admin.token, studentIdOf('C'));
    const oldCode = f.codes[studentIdOf('C')];

    const reset = await api('POST', `/api/students/${student.id}/activation-code`, {
      token: f.admin.token,
    });
    assert.equal(reset.status, 200);
    assert.notEqual(reset.body.activationCode, oldCode);

    assert.equal((await activate(studentIdOf('C'), oldCode)).status, 400);
    assert.equal((await activate(studentIdOf('C'), reset.body.activationCode)).status, 200);
  });
  // بدنا نعمل اختبار انو نبعت 8 طلبات ل 3 طلاب بشكل متزامن

    test('simultaneous imports of the same students give out exactly one working code each', async () => {
    const students = ['G1', 'G2', 'G3'].map((key) => ({
      studentId: studentIdOf(key),
      name: `Student ${key}`,
      email: emailOf(`student-${key.toLowerCase()}`),
    }));

    // 8 طلبات استيراد بنفس اللحظة لنفس الطلاب
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        api('POST', '/api/students/import', { token: f.admin.token, json: { students } }),
      ),
    );

    // العدد الإجمالي للمنشأ = عدد الطلاب 
    const totalCreated = results.reduce((sum, r) => sum + r.body.created, 0);
    assert.equal(totalCreated, students.length);

    for (const s of students) {
      // كل طالب بياخد رمز واحد بس بكل الردود
      const codes = results
        .flatMap((r) => r.body.activationCodes)
        .filter((c: any) => c.studentId === s.studentId);
      assert.equal(codes.length, 1, `${s.studentId} got ${codes.length} codes`);

      // والرمز يلي انعطى هو يلي انحفظ فعلاً: التفعيل بينجح
      const res = await activate(s.studentId, codes[0].activationCode);
      assert.equal(res.status, 200);
    }
  });
});

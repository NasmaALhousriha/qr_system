import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { generateActivationCode, hashActivationCode } from '../utils/activationCode';
import { parseObject } from '../validation/parse';
import { studentRowSchema } from '../validation/student.schema';

const CHUNK_SIZE = 1000;
const MAX_ROWS = 50_000;

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

export async function importStudents(rows: unknown[]) {
  if (rows.length === 0 || rows.length > MAX_ROWS) {
    throw new AppError(`Send between 1 and ${MAX_ROWS} students`);
  }

  const invalid: { row: number; reason: string }[] = [];
  const skipped: { studentId: string; reason: string }[] = [];
  const valid: { studentId: string; name: string; email: string }[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();


    rows.forEach((raw, index) => {
    const { value, errors } = parseObject(studentRowSchema, raw);
    if (errors.length > 0) {
      invalid.push({
        row: index + 1,
        reason: errors.map((e) => `${e.field} ${e.message}`).join(', '),
      });
      return;
    }

    const { studentId, name, email } = value as { studentId: string; name: string; email: string };
    if (seenIds.has(studentId) || seenEmails.has(email)) {
      skipped.push({ studentId, reason: 'duplicated in the file' });
      return;
    }
    seenIds.add(studentId);
    seenEmails.add(email);
    valid.push({ studentId, name, email });
  });


  const existingIds = new Set<string>();
  const existingEmails = new Set<string>();
  for (const part of chunk(valid, CHUNK_SIZE)) {
    const found = await prisma.student.findMany({
      where: {
        OR: [
          { studentId: { in: part.map((s) => s.studentId) } },
          { email: { in: part.map((s) => s.email) } },
        ],
      },
      select: { studentId: true, email: true },
    });
    found.forEach((s) => {
      existingIds.add(s.studentId);
      existingEmails.add(s.email);
    });
  }

  const toCreate = valid.filter((s) => {
    const exists = existingIds.has(s.studentId) || existingEmails.has(s.email);
    if (exists) skipped.push({ studentId: s.studentId, reason: 'already in the registry' });
    return !exists;
  });

  const activationCodes: { studentId: string; email: string; activationCode: string }[] = [];
  for (const part of chunk(toCreate, CHUNK_SIZE)) {
    const data = part.map((s) => {
      const code = generateActivationCode();
      activationCodes.push({ studentId: s.studentId, email: s.email, activationCode: code });
      return { ...s, activationCodeHash: hashActivationCode(code) };
    });
    await prisma.student.createMany({ data, skipDuplicates: true });
  }

  return { created: toCreate.length, skipped, invalid, activationCodes };
}

export async function resetActivationCode(id: number) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new AppError('Student not found', 404);
  if (student.userId) throw new AppError('Account is already activated', 409);

  const code = generateActivationCode();
  await prisma.student.update({
    where: { id },
    data: { activationCodeHash: hashActivationCode(code) },
  });
  return { studentId: student.studentId, email: student.email, activationCode: code };
}

export async function getStudents(page: number, limit: number, search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { studentId: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' },
      select: { id: true, studentId: true, name: true, email: true, userId: true },
    }),
    prisma.student.count({ where }),
  ]);

  const items = rows.map(({ userId, ...student }) => ({ ...student, activated: userId !== null }));
  return { page, limit, total, items };
}
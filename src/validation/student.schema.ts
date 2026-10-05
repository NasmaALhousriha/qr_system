import { array, email, id, integer, string } from './rules';

export const importStudentsSchema = {
  body: { students: array({ min: 1, max: 50_000 }) },
};

// شروط كل صف داخل ملف الاستيراد (بنطبقها صف صف حتى ما يفشل الملف كله بسبب صف واحد)
export const studentRowSchema = {
  studentId: string({ max: 50 }),
  name: string({ max: 100 }),
  email: email(),
};

export const listStudentsSchema = {
  query: {
    page: integer({ min: 1, max: 100_000 }).optional(1),
    limit: integer({ min: 1, max: 100 }).optional(20),
    search: string({ max: 100 }).optional(),
  },
};

export const studentIdParamSchema = { params: { id: id() } };
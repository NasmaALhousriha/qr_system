import { email, password, string } from './rules';

export const loginSchema = {
  body: {
    email: email(),
    password: string({ trim: false, max: 200 }),
  },
};

export const activateSchema = {
  body: {
    studentId: string({ max: 50 }),
    activationCode: string({ max: 20, transform: 'upper' }),
    password: password(),
  },
};
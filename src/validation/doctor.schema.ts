import { email, password, string } from './rules';

export const createDoctorSchema = {
  body: {
    name: string({ max: 100 }),
    email: email(),
    password: password(),
  },
};
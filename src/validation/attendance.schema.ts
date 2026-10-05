import { string } from './rules';

export const markAttendanceSchema = {
  body: { token: string({ max: 200 }) },
};
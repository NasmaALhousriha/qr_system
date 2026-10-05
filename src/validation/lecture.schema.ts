import { id, isoDate, string } from './rules';

export const createLectureSchema = {
  body: {
    title: string({ max: 150 }),
    startTime: isoDate(),
    endTime: isoDate(),
  },
};

export const lectureIdParamSchema = { params: { id: id() } };
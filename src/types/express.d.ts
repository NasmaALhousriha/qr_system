import { AuthUser } from './auth';
// هاد اسمه declaration merging:
// يعني بدمج تعريفي مع تعريف الاكسبرس

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated: { body: any; query: any; params: any }; // بيتعبّى بـ validate()
    }
  }
}
export type Result<T> = { value: T } | { error: string };

export interface Rule<T = any> {
  required: boolean;
  fallback?: T;
  parse(input: unknown): Result<T>;
  optional(fallback?: T): Rule<T>;
}

function rule<T>(parse: (input: unknown) => Result<T>, required = true, fallback?: T): Rule<T> {
  return {
    required,
    fallback,
    parse,
    optional: (value?: T) => rule(parse, false, value),
  };
}

const ok = <T>(value: T): Result<T> => ({ value });
const fail = (error: string): Result<never> => ({ error });

interface StringOptions {
  min?: number;
  max?: number;
  trim?: boolean;
  transform?: 'lower' | 'upper';
  pattern?: RegExp;
}

export const string = (opts: StringOptions = {}) =>
  rule<string>((input) => {
    if (typeof input !== 'string') return fail('must be a text');

    let value = opts.trim === false ? input : input.trim();
    if (opts.transform === 'lower') value = value.toLowerCase();
    if (opts.transform === 'upper') value = value.toUpperCase();

    const min = opts.min ?? 1;
    if (value.length < min) {
      return fail(min === 1 ? 'is required' : `must be at least ${min} characters`);
    }
    if (opts.max !== undefined && value.length > opts.max) {
      return fail(`must be at most ${opts.max} characters`);
    }
    if (opts.pattern && !opts.pattern.test(value)) return fail('has an invalid format');
    return ok(value);
  });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailText = string({ max: 254, transform: 'lower' });

export const email = () =>
  rule<string>((input) => {
    const result = emailText.parse(input);
    if ('error' in result) return result;
    return EMAIL_PATTERN.test(result.value) ? result : fail('must be a valid email');
  });

export const password = () =>
  rule<string>((input) => {
    if (typeof input !== 'string') return fail('must be a text');
    if (input.length < 8) return fail('must be at least 8 characters');
    if (Buffer.byteLength(input, 'utf8') > 72) return fail('is too long (max 72 bytes)');
    return ok(input);
  });

export const integer = (opts: { min?: number; max?: number } = {}) =>
  rule<number>((input) => {
    const n = typeof input === 'string' && /^-?\d+$/.test(input.trim()) ? Number(input) : input;
    if (typeof n !== 'number' || !Number.isInteger(n)) return fail('must be an integer');
    if (opts.min !== undefined && n < opts.min) return fail(`must be at least ${opts.min}`);
    if (opts.max !== undefined && n > opts.max) return fail(`must be at most ${opts.max}`);
    return ok(n);
  });

// أكبر رقم يقبله عمود Int بـ PostgreSQL
export const id = () => integer({ min: 1, max: 2_147_483_647 });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// لازم يكون فيه منطقة زمنية 
export const isoDate = () =>
  rule<Date>((input) => {
    if (typeof input !== 'string' || !ISO_DATE.test(input)) {
      return fail('must be an ISO 8601 date with timezone, e.g. 2026-10-05T09:00:00Z');
    }
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? fail('must be a valid date') : ok(date);
  });

export const array = (opts: { min?: number; max?: number } = {}) =>
  rule<unknown[]>((input) => {
    if (!Array.isArray(input)) return fail('must be an array');
    if (opts.min !== undefined && input.length < opts.min) {
      return fail(`must have at least ${opts.min} items`);
    }
    if (opts.max !== undefined && input.length > opts.max) {
      return fail(`must have at most ${opts.max} items`);
    }
    return ok(input);
  });
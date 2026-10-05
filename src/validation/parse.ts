import { ErrorDetail } from '../utils/AppError';
import { Rule } from './rules';

export type Schema = Record<string, Rule>;

export function parseObject(schema: Schema, input: unknown, prefix = '') {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const value: Record<string, unknown> = {}; // بس الحقول المعرّفة بالـ schema (whitelist)
  const errors: ErrorDetail[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const raw = source[key];

    if (raw === undefined || raw === null || raw === '') {
      if (rule.required) errors.push({ field: `${prefix}${key}`, message: 'is required' });
      else if (rule.fallback !== undefined) value[key] = rule.fallback;
      continue;
    }

    const result = rule.parse(raw);
    if ('error' in result) errors.push({ field: `${prefix}${key}`, message: result.error });
    else value[key] = result.value;
  }

  return { value, errors };
}
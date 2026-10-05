import { Request, RequestHandler } from 'express';
import { AppError, ErrorDetail } from '../utils/AppError';
import { parseObject, Schema } from '../validation/parse';

interface RequestSchema {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}

export const validate =
  (schema: RequestSchema): RequestHandler =>
  (req, res, next) => {
    const errors: ErrorDetail[] = [];
    const validated: Request['validated'] = { body: {}, query: {}, params: {} };

    for (const part of ['body', 'query', 'params'] as const) {
      const rules = schema[part];
      if (!rules) continue;

      const result = parseObject(rules, req[part], `${part}.`);
      errors.push(...result.errors);
      validated[part] = result.value;
    }

    if (errors.length > 0) throw new AppError('Validation failed', 400, errors);

    req.validated = validated;
    next();
  };
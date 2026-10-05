import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`; 
}

export function hashActivationCode(code: string): string {
  return createHmac('sha256', config.codeSecret).update(code).digest('hex');
}

export function verifyActivationCode(code: string, hash: string): boolean {
  const a = Buffer.from(hashActivationCode(code), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
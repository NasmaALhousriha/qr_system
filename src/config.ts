// 	إعدادات التطبيق
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresInSeconds: 60 * 60,
  codeSecret: required('CODE_SECRET'),
  qrSecret: required('QR_SECRET'),
};
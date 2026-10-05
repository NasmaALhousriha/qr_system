import { createHmac, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { config } from '../config';

export const QR_WINDOW_SECONDS = 30;
const WINDOW_MS = QR_WINDOW_SECONDS * 1000;

function sign(lectureId: number, window: number): string {
  return createHmac('sha256', config.qrSecret)
    .update(`${lectureId}.${window}`)
    .digest('base64url');
}

export function createQrToken(lectureId: number, now = Date.now()) {
  const window = Math.floor(now / WINDOW_MS);
  return {
    token: `${lectureId}.${window}.${sign(lectureId, window)}`,
    expiresAt: new Date((window + 1) * WINDOW_MS),
  };
}

// بيرجع رقم المحاضرة إذا الرمز سليم وما انتهى، وإلا null
export function verifyQrToken(token: string, now = Date.now()): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [idPart, windowPart, signature] = parts;
  if (!/^\d+$/.test(idPart) || !/^\d+$/.test(windowPart)) return null;

  const lectureId = Number(idPart);
  const window = Number(windowPart);
  if (!Number.isSafeInteger(lectureId) || !Number.isSafeInteger(window)) return null;

  const expected = Buffer.from(sign(lectureId, window));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  // مقبول: النافذة الحالية، أو يلي قبلها
  const current = Math.floor(now / WINDOW_MS);
  if (window > current || window < current - 1) return null;

  return lectureId;
}

export function createQrImage(token: string): Promise<string> {
  return QRCode.toDataURL(token, { margin: 2, width: 300 });
}
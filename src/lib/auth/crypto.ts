import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

/** Jeton aléatoire (CSPRNG), en base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte d'un jeton : seule elle est stockée en base. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmac(value: string): string {
  return createHmac('sha256', env.authSecret).update(value).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Jeton signé `sujet.expiration.signature`, infalsifiable sans AUTH_SECRET. */
export function signToken(subject: string, ttlMs: number): string {
  const payload = `${subject}.${Date.now() + ttlMs}`;
  return `${payload}.${hmac(payload)}`;
}

/** Sujet d'un jeton signé valide et non expiré, sinon null. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [subject, expiresAt, signature] = parts;
  if (!/^[0-9a-f]{64}$/.test(signature)) return null;
  if (!safeEqualHex(signature, hmac(`${subject}.${expiresAt}`))) return null;
  if (!(Number(expiresAt) > Date.now())) return null;
  return subject;
}

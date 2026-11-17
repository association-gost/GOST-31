import 'server-only';
import { store } from '@/lib/store';
import { hmac } from './crypto';
import { AUTH_POLICY } from './policy';

/** Empreinte HMAC de l'IP : on compte les échecs sans garder l'adresse. */
export function ipHash(ip: string): string {
  return hmac(`ip:${ip}`);
}

/** Message de refus si cette IP a trop échoué récemment (connexion ou invitation), sinon null. */
export async function tooManyFailures(ip: string): Promise<string | null> {
  const since = new Date(Date.now() - AUTH_POLICY.failureWindowMinutes * 60_000);
  const failures = await store().countFailures(ipHash(ip), since);
  return failures >= AUTH_POLICY.maxFailuresPerIp
    ? `Trop de tentatives. Réessayez dans ${AUTH_POLICY.failureWindowMinutes} minutes.`
    : null;
}

export async function recordAttempt(ip: string, kind: 'login' | 'invite', success: boolean): Promise<void> {
  await store().recordAttempt(ipHash(ip), kind, success);
}

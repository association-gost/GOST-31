import 'server-only';
import { cookies } from 'next/headers';
import { store, type Admin } from '@/lib/store';
import { userAgent } from '@/lib/server/request';
import { randomToken, sha256 } from './crypto';
import { AUTH_POLICY, SESSION_COOKIE } from './policy';

const MINUTE = 60_000;

/**
 * Sessions : jeton aléatoire dans un cookie httpOnly / Secure / SameSite=Strict,
 * dont seule l'empreinte SHA-256 est en base (une fuite de la base ne donne
 * aucune session). Inactivité et durée maximale contrôlées à chaque requête.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export async function openSession(adminId: string, request: Request): Promise<void> {
  const token = randomToken();
  await store().addSession({
    token_hash: sha256(token),
    admin_id: adminId,
    expires_at: new Date(Date.now() + AUTH_POLICY.sessionMaxHours * 60 * MINUTE).toISOString(),
    user_agent: userAgent(request),
  });
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: AUTH_POLICY.sessionMaxHours * 3600 });
}

export async function closeSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await store().deleteSession(sha256(token));
  jar.delete(SESSION_COOKIE);
}

/** Admin de la session courante, ou null (absente, expirée, inactive, compte désactivé). */
export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const tokenHash = sha256(token);
  const db = store();
  const session = await db.session(tokenHash);
  if (!session) return null;

  const now = Date.now();
  const lastSeen = new Date(session.last_seen_at).getTime();
  if (new Date(session.expires_at).getTime() <= now || now - lastSeen > AUTH_POLICY.inactivityMinutes * MINUTE) {
    await db.deleteSession(tokenHash);
    return null;
  }
  const admin = await db.adminById(session.admin_id);
  if (!admin?.is_active) {
    await db.deleteSessionsOf(session.admin_id);
    return null;
  }
  if (now - lastSeen > MINUTE) await db.touchSession(tokenHash);
  return admin;
}

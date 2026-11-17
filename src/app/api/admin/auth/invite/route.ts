import { cookies } from 'next/headers';
import { signToken, sha256 } from '@/lib/auth/crypto';
import { authPreflight } from '@/lib/auth/guard';
import { AUTH_POLICY, ENROLL_COOKIE } from '@/lib/auth/policy';
import { recordAttempt, tooManyFailures } from '@/lib/auth/rateLimit';
import { COOKIE_OPTIONS } from '@/lib/auth/session';
import { jsonError, jsonOk, readJson } from '@/lib/http';
import { clientIp } from '@/lib/server/request';
import { store } from '@/lib/store';

/**
 * Ouverture d'une invitation (lien à usage unique créé par `npm run admin:invite`).
 * L'invitation est consommée ici ; un cookie signé laisse 10 min pour enregistrer la clé.
 */
export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  const ip = clientIp(request);
  const limited = await tooManyFailures(ip);
  if (limited) return jsonError(limited, 429);

  const token = (await readJson(request) as { token?: unknown } | undefined)?.token;
  const adminId = typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token) ? await store().takeInvite(sha256(token)) : null;
  if (!adminId) {
    await recordAttempt(ip, 'invite', false);
    return jsonError('Invitation invalide, déjà utilisée ou expirée. Demandez-en une nouvelle.', 400);
  }
  const admin = await store().adminById(adminId);
  if (!admin?.is_active) return jsonError('Compte désactivé.', 403);

  await recordAttempt(ip, 'invite', true);
  await store().audit(admin.id, 'invitation.ouverte');
  (await cookies()).set(ENROLL_COOKIE, signToken(admin.id, AUTH_POLICY.enrollmentMinutes * 60_000), {
    ...COOKIE_OPTIONS,
    maxAge: AUTH_POLICY.enrollmentMinutes * 60,
  });
  return jsonOk({ name: admin.full_name });
}

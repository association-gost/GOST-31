import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { authPreflight } from '@/lib/auth/guard';
import { recordAttempt, tooManyFailures } from '@/lib/auth/rateLimit';
import { openSession } from '@/lib/auth/session';
import { verifyLogin } from '@/lib/auth/webauthn';
import { jsonError, jsonOk, readJson } from '@/lib/http';
import { clientIp } from '@/lib/server/request';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  const ip = clientIp(request);
  const limited = await tooManyFailures(ip);
  if (limited) return jsonError(limited, 429);

  const body = (await readJson(request)) as { challengeId?: unknown; response?: AuthenticationResponseJSON } | undefined;
  const admin = body?.response ? await verifyLogin(request, body.challengeId, body.response) : null;
  if (!admin) {
    await recordAttempt(ip, 'login', false);
    return jsonError('Clé non reconnue. Réessayez, ou demandez une nouvelle invitation.', 401);
  }
  await recordAttempt(ip, 'login', true);
  await openSession(admin.id, request);
  await store().audit(admin.id, 'connexion');
  store().purge().catch(() => {});
  return jsonOk();
}

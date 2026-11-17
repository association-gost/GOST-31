import { cookies } from 'next/headers';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { authPreflight, enrollingAdmin } from '@/lib/auth/guard';
import { ENROLL_COOKIE } from '@/lib/auth/policy';
import { currentAdmin, openSession } from '@/lib/auth/session';
import { deviceLabel, verifyRegistration } from '@/lib/auth/webauthn';
import { jsonError, jsonOk, readJson } from '@/lib/http';
import { userAgent } from '@/lib/server/request';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  const admin = await enrollingAdmin();
  if (!admin) return jsonError('Invitation expirée. Rouvrez votre lien ou demandez-en un nouveau.', 401);

  const body = (await readJson(request)) as { challengeId?: unknown; response?: RegistrationResponseJSON } | undefined;
  if (!body?.response) return jsonError('Requête invalide.', 400);
  const label = deviceLabel(userAgent(request));
  const ok = await verifyRegistration(request, admin, body.challengeId, body.response, label);
  if (!ok) return jsonError('Clé refusée. Réessayez.', 400);

  await store().audit(admin.id, 'cle.ajoutee', { appareil: label });
  (await cookies()).delete(ENROLL_COOKIE);
  if (!(await currentAdmin())) await openSession(admin.id, request);
  return jsonOk();
}

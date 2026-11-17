import { authPreflight, enrollingAdmin } from '@/lib/auth/guard';
import { AUTH_POLICY } from '@/lib/auth/policy';
import { registrationOptions } from '@/lib/auth/webauthn';
import { jsonError, jsonOk } from '@/lib/http';

export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  const admin = await enrollingAdmin();
  if (!admin) return jsonError('Invitation expirée. Rouvrez votre lien ou demandez-en un nouveau.', 401);
  const { challengeId, options, count } = await registrationOptions(request, admin);
  if (count >= AUTH_POLICY.maxPasskeys) return jsonError(`${AUTH_POLICY.maxPasskeys} clés au plus : retirez-en une d’abord.`, 409);
  return jsonOk({ challengeId, options });
}

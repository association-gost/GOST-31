import { authPreflight } from '@/lib/auth/guard';
import { tooManyFailures } from '@/lib/auth/rateLimit';
import { loginOptions } from '@/lib/auth/webauthn';
import { jsonError, jsonOk } from '@/lib/http';
import { clientIp } from '@/lib/server/request';

export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  const limited = await tooManyFailures(clientIp(request));
  if (limited) return jsonError(limited, 429);
  return jsonOk(await loginOptions(request));
}

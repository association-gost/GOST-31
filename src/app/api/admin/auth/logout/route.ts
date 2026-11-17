import { authPreflight } from '@/lib/auth/guard';
import { closeSession } from '@/lib/auth/session';
import { jsonOk } from '@/lib/http';

export async function POST(request: Request) {
  const refused = authPreflight(request);
  if (refused) return refused;
  await closeSession();
  return jsonOk();
}

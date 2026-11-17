import { requireAdminApi } from '@/lib/auth/guard';
import { jsonError, jsonOk, readJson } from '@/lib/http';
import { PROMO_LIMITS, validatePromo } from '@/lib/promos';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';
const HISTORY_DAYS = 30;

/** Promos en cours, à venir, et terminées depuis moins de 30 jours. */
export async function GET(request: Request) {
  const guard = await requireAdminApi(request);
  if ('response' in guard) return guard.response;
  return jsonOk({ promos: await store().promos(new Date(Date.now() - HISTORY_DAYS * 86_400_000)) });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi(request);
  if ('response' in guard) return guard.response;

  const result = validatePromo(await readJson(request), guard.admin.id);
  if ('error' in result) return jsonError(result.error, 400);

  const db = store();
  const actives = await db.promos(new Date());
  if (actives.length >= PROMO_LIMITS.maxActive) return jsonError(`${PROMO_LIMITS.maxActive} promos en cours ou à venir au plus.`, 409);

  const promo = await db.addPromo(result.promo);
  await db.audit(guard.admin.id, 'promo.creee', { id: promo.id, cible: `${promo.cible_type}:${promo.cible_id}`, type: promo.type, valeur: promo.valeur, fin: promo.fin });
  return jsonOk({ promo });
}

import { requireAdminApi } from '@/lib/auth/guard';
import { jsonError, jsonOk, readJson } from '@/lib/http';
import { isUuid } from '@/lib/promos';
import { store } from '@/lib/store';

type Ctx = { params: Promise<{ id: string }> };

/** Arrêter une promo maintenant (elle reste dans l'historique). */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  const body = (await readJson(request)) as { action?: unknown } | undefined;
  if (!isUuid(id) || body?.action !== 'arreter') return jsonError('Requête invalide.', 400);

  const db = store();
  const promo = (await db.promos(new Date())).find((p) => p.id === id);
  if (!promo) return jsonError('Promo introuvable ou déjà terminée.', 404);
  // Une promo à venir arrêtée avant son début est simplement supprimée.
  const ok = new Date(promo.debut).getTime() > Date.now() ? await db.deletePromo(id) : await db.setPromoFin(id, new Date().toISOString());
  if (!ok) return jsonError('Promo introuvable.', 404);
  await db.audit(guard.admin.id, 'promo.arretee', { id });
  return jsonOk();
}

export async function DELETE(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return jsonError('Requête invalide.', 400);
  if (!(await store().deletePromo(id))) return jsonError('Promo introuvable.', 404);
  await store().audit(guard.admin.id, 'promo.supprimee', { id });
  return jsonOk();
}

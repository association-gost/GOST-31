import { requireAdminApi } from '@/lib/auth/guard';
import { jsonError, jsonOk } from '@/lib/http';
import { store } from '@/lib/store';

type Ctx = { params: Promise<{ id: string }> };

/** Retirer une clé d'accès (téléphone perdu…). La dernière ne peut pas être retirée. */
export async function DELETE(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  const db = store();
  const keys = await db.passkeysOf(guard.admin.id);
  if (!keys.some((k) => k.id === id)) return jsonError('Clé introuvable.', 404);
  if (keys.length <= 1) return jsonError('C’est votre seule clé : ajoutez-en une autre avant de la retirer.', 409);
  await db.deletePasskey(id, guard.admin.id);
  // Par prudence, toutes les sessions sont fermées : on se reconnecte avec une clé restante.
  await db.deleteSessionsOf(guard.admin.id);
  await db.audit(guard.admin.id, 'cle.retiree');
  return jsonOk();
}

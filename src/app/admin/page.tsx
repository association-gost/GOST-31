import { requireAdminPage } from '@/lib/auth/guard';
import { catalogue } from '@/lib/catalogue';
import { store } from '@/lib/store';
import Tableau from './Tableau';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await requireAdminPage();
  const db = store();
  const [promos, keys] = await Promise.all([db.promos(new Date(Date.now() - 30 * 86_400_000)), db.passkeysOf(admin.id)]);
  return (
    <Tableau
      nom={admin.full_name}
      rayons={catalogue().filter((r) => r.produits.length)}
      promosInitiales={promos}
      clesInitiales={keys.map((k) => ({ id: k.id, label: k.device_label, creee: k.created_at, utilisee: k.last_used_at }))}
    />
  );
}

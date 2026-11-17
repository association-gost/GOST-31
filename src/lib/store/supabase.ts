import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Admin, Challenge, NewPromo, Passkey, Promo, SessionRow, Store } from './types';

/**
 * Base Supabase, clé service_role : le SEUL accès aux données. Le navigateur
 * n'a aucune clé ; toutes les tables refusent les rôles publics (RLS sans policy).
 * Pour changer de base (Redis…), il suffit d'écrire un autre Store (voir types.ts).
 */
function check<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`[db] ${label} : ${result.error.message}`);
  return result.data;
}

const PROMO_COLUMNS = 'id, cible_type, cible_id, type, valeur, debut, fin, titre, created_at';
const toPromo = (row: Promo): Promo => ({ ...row, valeur: Number(row.valeur) });

export function supabaseStore(): Store {
  const db: SupabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async adminById(id) {
      return check(
        await db.from('admins').select('id, email, full_name, is_active').eq('id', id).maybeSingle<Admin>(),
        'admin',
      );
    },
    async takeInvite(tokenHash) {
      const row = check(
        await db.from('invites').delete().eq('token_hash', tokenHash).select('admin_id, expires_at').maybeSingle(),
        'invitation',
      ) as { admin_id: string; expires_at: string } | null;
      if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
      return row.admin_id;
    },

    async passkeysOf(adminId) {
      return (check(await db.from('passkeys').select('*').eq('admin_id', adminId).order('created_at'), 'clés') ?? []) as Passkey[];
    },
    async passkeyById(id) {
      return check(await db.from('passkeys').select('*').eq('id', id).maybeSingle<Passkey>(), 'clé');
    },
    async addPasskey(passkey) {
      check(await db.from('passkeys').insert(passkey), 'ajout de clé');
    },
    async touchPasskey(id, counter) {
      check(await db.from('passkeys').update({ counter, last_used_at: new Date().toISOString() }).eq('id', id), 'usage de clé');
    },
    async deletePasskey(id, adminId) {
      const rows = check(await db.from('passkeys').delete().eq('id', id).eq('admin_id', adminId).select('id'), 'retrait de clé');
      return (rows ?? []).length > 0;
    },

    async addChallenge(purpose, challenge, adminId, expiresAt) {
      const row = check(
        await db
          .from('auth_challenges')
          .insert({ purpose, challenge, admin_id: adminId, expires_at: expiresAt.toISOString() })
          .select('id')
          .single(),
        'défi',
      ) as { id: string };
      return row.id;
    },
    async takeChallenge(id, purpose) {
      const row = check(
        await db.from('auth_challenges').delete().eq('id', id).eq('purpose', purpose).select('admin_id, challenge, expires_at').maybeSingle(),
        'lecture du défi',
      ) as Challenge | null;
      if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
      return row;
    },

    async addSession(row) {
      check(await db.from('sessions').insert(row), 'ouverture de session');
    },
    async session(tokenHash) {
      return check(
        await db.from('sessions').select('admin_id, last_seen_at, expires_at').eq('token_hash', tokenHash).maybeSingle<SessionRow>(),
        'session',
      );
    },
    async touchSession(tokenHash) {
      await db.from('sessions').update({ last_seen_at: new Date().toISOString() }).eq('token_hash', tokenHash);
    },
    async deleteSession(tokenHash) {
      await db.from('sessions').delete().eq('token_hash', tokenHash);
    },
    async deleteSessionsOf(adminId) {
      await db.from('sessions').delete().eq('admin_id', adminId);
    },

    async countFailures(ipHash, since) {
      const { count, error } = await db
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .eq('success', false)
        .gte('created_at', since.toISOString());
      if (error) throw new Error(`[db] tentatives : ${error.message}`);
      return count ?? 0;
    },
    async recordAttempt(ipHash, kind, success) {
      await db.from('login_attempts').insert({ ip_hash: ipHash, kind, success });
    },

    async promos(since) {
      const rows = check(
        await db.from('promos').select(PROMO_COLUMNS).gt('fin', since.toISOString()).order('debut').limit(200),
        'promos',
      ) as Promo[];
      return (rows ?? []).map(toPromo);
    },
    async addPromo(promo: NewPromo) {
      return toPromo(check(await db.from('promos').insert(promo).select(PROMO_COLUMNS).single(), 'ajout de promo') as Promo);
    },
    async setPromoFin(id, fin) {
      const rows = check(await db.from('promos').update({ fin }).eq('id', id).select('id'), 'fin de promo');
      return (rows ?? []).length > 0;
    },
    async deletePromo(id) {
      const rows = check(await db.from('promos').delete().eq('id', id).select('id'), 'suppression de promo');
      return (rows ?? []).length > 0;
    },

    async audit(adminId, action, detail) {
      await db.from('audit_log').insert({ admin_id: adminId, action, detail: detail ?? null });
    },
    async purge() {
      const now = new Date().toISOString();
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
      await Promise.all([
        db.from('auth_challenges').delete().lt('expires_at', now),
        db.from('sessions').delete().lt('expires_at', now),
        db.from('invites').delete().lt('expires_at', now),
        db.from('login_attempts').delete().lt('created_at', dayAgo),
      ]);
    },
  };
}

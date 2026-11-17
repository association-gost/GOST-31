import 'server-only';
import { randomUUID } from 'crypto';
import { randomToken, sha256 } from '@/lib/auth/crypto';
import type { Admin, Challenge, Passkey, Promo, SessionRow, Store } from './types';

/**
 * Base EN MÉMOIRE pour tester en local sans Supabase (`npm run dev` sans
 * .env.local). Refusée en production (voir store/index.ts). Au démarrage, un
 * admin de test est créé et son lien d'invitation s'affiche dans la console.
 */
interface Data {
  admins: Map<string, Admin>;
  invites: Map<string, { admin_id: string; expires_at: string }>;
  passkeys: Map<string, Passkey>;
  challenges: Map<string, Challenge & { purpose: string }>;
  sessions: Map<string, SessionRow>;
  attempts: { ip_hash: string; success: boolean; created_at: number }[];
  promos: Map<string, Promo>;
}

const g = globalThis as unknown as { __gostMemory?: Data };

function data(): Data {
  if (g.__gostMemory) return g.__gostMemory;
  const admin: Admin = { id: randomUUID(), email: 'admin@local.test', full_name: 'Admin de test', is_active: true };
  const token = randomToken();
  g.__gostMemory = {
    admins: new Map([[admin.id, admin]]),
    invites: new Map([[sha256(token), { admin_id: admin.id, expires_at: new Date(Date.now() + 86_400_000).toISOString() }]]),
    passkeys: new Map(),
    challenges: new Map(),
    sessions: new Map(),
    attempts: [],
    promos: new Map(),
  };
  console.log(`\n[dev] Base en mémoire. Invitation admin : http://localhost:3000/admin/invitation#${token}\n`);
  return g.__gostMemory;
}

export function memoryStore(): Store {
  const d = data();
  return {
    async adminById(id) {
      return d.admins.get(id) ?? null;
    },
    async takeInvite(tokenHash) {
      const row = d.invites.get(tokenHash);
      d.invites.delete(tokenHash);
      return row && new Date(row.expires_at).getTime() > Date.now() ? row.admin_id : null;
    },
    async passkeysOf(adminId) {
      return [...d.passkeys.values()].filter((p) => p.admin_id === adminId);
    },
    async passkeyById(id) {
      return d.passkeys.get(id) ?? null;
    },
    async addPasskey(p) {
      d.passkeys.set(p.id, { ...p, created_at: new Date().toISOString(), last_used_at: null });
    },
    async touchPasskey(id, counter) {
      const p = d.passkeys.get(id);
      if (p) Object.assign(p, { counter, last_used_at: new Date().toISOString() });
    },
    async deletePasskey(id, adminId) {
      const p = d.passkeys.get(id);
      if (!p || p.admin_id !== adminId) return false;
      return d.passkeys.delete(id);
    },
    async addChallenge(purpose, challenge, adminId, expiresAt) {
      const id = randomUUID();
      d.challenges.set(id, { purpose, challenge, admin_id: adminId, expires_at: expiresAt.toISOString() });
      return id;
    },
    async takeChallenge(id, purpose) {
      const row = d.challenges.get(id);
      d.challenges.delete(id);
      if (!row || row.purpose !== purpose || new Date(row.expires_at).getTime() <= Date.now()) return null;
      return { admin_id: row.admin_id, challenge: row.challenge, expires_at: row.expires_at };
    },
    async addSession(row) {
      d.sessions.set(row.token_hash, { admin_id: row.admin_id, expires_at: row.expires_at, last_seen_at: new Date().toISOString() });
    },
    async session(tokenHash) {
      return d.sessions.get(tokenHash) ?? null;
    },
    async touchSession(tokenHash) {
      const s = d.sessions.get(tokenHash);
      if (s) s.last_seen_at = new Date().toISOString();
    },
    async deleteSession(tokenHash) {
      d.sessions.delete(tokenHash);
    },
    async deleteSessionsOf(adminId) {
      for (const [k, s] of d.sessions) if (s.admin_id === adminId) d.sessions.delete(k);
    },
    async countFailures(ipHash, since) {
      return d.attempts.filter((a) => a.ip_hash === ipHash && !a.success && a.created_at >= since.getTime()).length;
    },
    async recordAttempt(ipHash, _kind, success) {
      d.attempts.push({ ip_hash: ipHash, success, created_at: Date.now() });
    },
    async promos(since) {
      return [...d.promos.values()]
        .filter((p) => new Date(p.fin).getTime() > since.getTime())
        .sort((a, b) => a.debut.localeCompare(b.debut));
    },
    async addPromo(promo) {
      const { created_by: _by, ...rest } = promo;
      const row: Promo = { ...rest, id: randomUUID(), created_at: new Date().toISOString() };
      d.promos.set(row.id, row);
      return row;
    },
    async setPromoFin(id, fin) {
      const p = d.promos.get(id);
      if (!p) return false;
      p.fin = fin;
      return true;
    },
    async deletePromo(id) {
      return d.promos.delete(id);
    },
    async audit(adminId, action, detail) {
      console.log('[dev] journal :', action, adminId ?? '-', detail ?? '');
    },
    async purge() {},
  };
}

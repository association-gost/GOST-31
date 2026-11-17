import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jsonError } from '@/lib/http';
import { isSameOrigin } from '@/lib/server/request';
import { store, type Admin } from '@/lib/store';
import { verifyToken } from './crypto';
import { ENROLL_COOKIE } from './policy';
import { currentAdmin } from './session';

/**
 * Gardes de l'espace admin. Le middleware ne fait qu'une redirection rapide
 * sans cookie ; la vraie vérification (en base) est refaite ICI à chaque page
 * et à chaque requête d'API.
 */
export async function requireAdminPage(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

type Guarded = { admin: Admin } | { response: ReturnType<typeof jsonError> };

/** Route API : admin connecté. Toute écriture doit venir d'une page du site (anti-CSRF, en plus de SameSite=Strict). */
export async function requireAdminApi(request: Request): Promise<Guarded> {
  if (request.method !== 'GET' && !isSameOrigin(request)) return { response: jsonError('Requête refusée.', 403) };
  const admin = await currentAdmin();
  return admin ? { admin } : { response: jsonError('Session expirée. Reconnectez-vous.', 401) };
}

/** Préambule des routes de connexion. */
export function authPreflight(request: Request) {
  return isSameOrigin(request) ? null : jsonError('Requête refusée.', 403);
}

/**
 * Admin autorisé à enregistrer une clé : il vient d'ouvrir une invitation
 * valide (cookie signé, 10 min), ou il est déjà connecté (second appareil).
 */
export async function enrollingAdmin(): Promise<Admin | null> {
  const adminId = verifyToken((await cookies()).get(ENROLL_COOKIE)?.value);
  if (adminId) {
    const admin = await store().adminById(adminId);
    if (admin?.is_active) return admin;
  }
  return currentAdmin();
}

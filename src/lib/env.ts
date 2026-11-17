import 'server-only';

/** Variables d'environnement du serveur. NE JAMAIS importer côté navigateur. */

export const isDev = process.env.NODE_ENV !== 'production';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (.env.local ou Vercel).`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required('SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get hasDatabase(): boolean {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  /** Secret HMAC (jetons signés, empreintes d'IP). 32 caractères minimum. */
  get authSecret(): string {
    const secret = process.env.AUTH_SECRET || (isDev ? 'developpement-local-seulement-pas-en-production' : required('AUTH_SECRET'));
    if (secret.length < 32) throw new Error('AUTH_SECRET doit faire au moins 32 caractères.');
    return secret;
  },
  /** Adresse publique exacte du site (https://…). Obligatoire en production. */
  get siteUrl(): string | null {
    const value = process.env.SITE_URL?.trim().replace(/\/+$/, '');
    if (value) return value;
    if (isDev) return null;
    return required('SITE_URL');
  },
};

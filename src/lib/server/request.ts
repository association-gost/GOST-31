import 'server-only';
import { env, isDev } from '@/lib/env';

/** IP du client (première de x-forwarded-for, posée par Vercel). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'inconnue';
}

export function userAgent(request: Request): string {
  return (request.headers.get('user-agent') || 'inconnu').slice(0, 300);
}

/**
 * Origine attendue des clés d'accès. En production elle est FIGÉE par
 * SITE_URL : une clé ne peut être créée ni utilisée que sur le vrai domaine
 * (ni sur une préversion Vercel, ni sur un faux site). En local, l'hôte servi.
 */
export function siteOrigin(request: Request): { origin: string; rpID: string } {
  const fixed = env.siteUrl;
  if (fixed) {
    const url = new URL(fixed);
    return { origin: url.origin, rpID: url.hostname };
  }
  const host = request.headers.get('host') ?? 'localhost:3000';
  const hostname = host.split(':')[0];
  if (!isDev || (hostname !== 'localhost' && hostname !== '127.0.0.1')) throw new Error('SITE_URL requis.');
  return { origin: `http://${host}`, rpID: hostname };
}

/** La requête vient-elle d'une page du site ? (l'en-tête Origin est toujours posé par un navigateur sur un POST) */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === siteOrigin(request).origin;
  } catch {
    return false;
  }
}

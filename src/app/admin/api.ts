'use client';

/** Appel JSON vers l'API admin ; une session expirée renvoie à la connexion. */
export async function api<T = Record<string, unknown>>(path: string, method = 'POST', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let data: { success?: boolean; error?: string } & Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    /* corps vide */
  }
  if (response.status === 401 && path.startsWith('/api/admin/') && !path.startsWith('/api/admin/auth/')) {
    window.location.assign('/admin/login');
  }
  if (!response.ok || data.success === false) throw new Error(data.error || 'Erreur réseau. Réessayez.');
  return data as T;
}

/** Message lisible pour une erreur WebAuthn (annulation, appareil non compatible…). */
export function passkeyError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return 'Opération annulée ou délai dépassé. Réessayez.';
  if (name === 'InvalidStateError') return 'Cet appareil a déjà une clé pour ce compte.';
  if (name === 'NotSupportedError' || name === 'SecurityError') return 'Cet appareil ou ce navigateur ne gère pas les clés d’accès ici.';
  return (error as Error)?.message || 'Erreur inattendue.';
}

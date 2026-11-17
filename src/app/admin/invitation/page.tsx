'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { useEffect, useRef, useState } from 'react';
import { api, passkeyError } from '../api';

/**
 * Lien d'invitation : /admin/invitation#<jeton>. Le jeton est dans le fragment
 * (#), qui n'est jamais envoyé au serveur dans l'URL ni dans les journaux ; il
 * est effacé de la barre d'adresse dès la lecture.
 */
export default function InvitationPage() {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname);
    if (!token) return;
    api<{ name: string }>('/api/admin/auth/invite', 'POST', { token })
      .then((data) => setName(data.name))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const { challengeId, options } = await api<{ challengeId: string; options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>(
        '/api/admin/auth/register/options',
      );
      const response = await startRegistration({ optionsJSON: options });
      await api('/api/admin/auth/register/verify', 'POST', { challengeId, response });
      window.location.replace('/admin');
    } catch (e) {
      setError(passkeyError(e));
      setBusy(false);
    }
  }

  return (
    <main className="porte">
      <img src="/assets/logo-clair.png" alt="" width={72} height={72} />
      <h1>{name ? `Bienvenue, ${name}` : 'Invitation admin'}</h1>
      <p className="discret">
        Créez votre clé d’accès : elle reste dans ce téléphone et se déverrouille avec Face ID, l’empreinte ou le code de
        l’appareil. Vous aurez 10 minutes.
      </p>
      <button className="bouton" type="button" onClick={enroll} disabled={busy}>
        {busy ? 'Enregistrement…' : 'Créer ma clé d’accès'}
      </button>
      {error && <p className="erreur" role="alert">{error}</p>}
    </main>
  );
}

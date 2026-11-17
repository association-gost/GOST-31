'use client';

import { startAuthentication } from '@simplewebauthn/browser';
import { useState } from 'react';
import { api, passkeyError } from '../api';

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { challengeId, options } = await api<{ challengeId: string; options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>(
        '/api/admin/auth/login/options',
      );
      const response = await startAuthentication({ optionsJSON: options });
      await api('/api/admin/auth/login/verify', 'POST', { challengeId, response });
      window.location.replace('/admin');
    } catch (e) {
      setError(passkeyError(e));
      setBusy(false);
    }
  }

  return (
    <main className="porte">
      <img src="/assets/logo-clair.png" alt="" width={72} height={72} />
      <h1>Espace admin</h1>
      <p className="discret">Réservé à l’antenne GOST 31.</p>
      <button className="bouton" type="button" onClick={connect} disabled={busy}>
        {busy ? 'Vérification…' : 'Se connecter avec ma clé d’accès'}
      </button>
      <p className="aide">Face ID, empreinte ou code du téléphone. Aucun mot de passe.</p>
      {error && <p className="erreur" role="alert">{error}</p>}
      <a className="lien" href="/">Retour au site</a>
    </main>
  );
}

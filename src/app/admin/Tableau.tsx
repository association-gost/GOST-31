'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { useMemo, useState, type FormEvent } from 'react';
import type { Rayon } from '@/lib/catalogue';
import type { Promo } from '@/lib/store/types';
import { api, passkeyError } from './api';

interface Cle {
  id: string;
  label: string | null;
  creee: string;
  utilisee: string | null;
}

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;
const DUREES: [string, number][] = [
  ['1 jour', JOUR],
  ['3 jours', 3 * JOUR],
  ['1 semaine', 7 * JOUR],
  ['2 semaines', 14 * JOUR],
  ['1 mois', 30 * JOUR],
];

/* ── Dates : les champs datetime-local sont en heure locale (Paris) ── */
function versChamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
const finDeJournee = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 0, 0);
  return d;
};
const dateLisible = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const euros = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;

function prixPromo(prix: number, type: Promo['type'], valeur: number) {
  return type === 'pourcent' ? Math.round(prix * (100 - valeur)) / 100 : valeur;
}

export default function Tableau({
  nom,
  rayons,
  promosInitiales,
  clesInitiales,
}: {
  nom: string;
  rayons: Rayon[];
  promosInitiales: Promo[];
  clesInitiales: Cle[];
}) {
  const [promos, setPromos] = useState(promosInitiales);
  const [cles, setCles] = useState(clesInitiales);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Formulaire
  const premier = rayons[0]?.produits[0];
  const [cible, setCible] = useState(premier ? `produit:${premier.id}` : '');
  const [type, setType] = useState<Promo['type']>('pourcent');
  const [valeur, setValeur] = useState('20');
  const [debutPlusTard, setDebutPlusTard] = useState(false);
  const [debut, setDebut] = useState(() => versChamp(new Date()));
  const [fin, setFin] = useState(() => versChamp(finDeJournee(new Date(Date.now() + 7 * JOUR))));
  const [titre, setTitre] = useState('');

  const libelleCible = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rayons) {
      map.set(`rayon:${r.id}`, `Tout le rayon « ${r.titre} »`);
      for (const p of r.produits) map.set(`produit:${p.id}`, p.nom);
    }
    return map;
  }, [rayons]);

  const produitsDe = (c: string) => {
    const [t, id] = c.split(':');
    if (t === 'rayon') return rayons.find((r) => r.id === id)?.produits ?? [];
    for (const r of rayons) {
      const p = r.produits.find((x) => x.id === id);
      if (p) return [p];
    }
    return [];
  };

  const vises = produitsDe(cible);
  const estRayon = cible.startsWith('rayon:');
  const v = Number(valeur.replace(',', '.'));
  const apercu =
    vises.length && Number.isFinite(v) && v > 0
      ? estRayon
        ? `−${v} % sur ${vises.length} produit${vises.length > 1 ? 's' : ''}`
        : `${euros(vises[0].prix)} → ${euros(prixPromo(vises[0].prix, type, v))}`
      : '';

  function choisirCible(c: string) {
    setCible(c);
    if (c.startsWith('rayon:')) setType('pourcent');
  }

  function appliquerDuree(ms: number) {
    const depart = debutPlusTard ? new Date(debut) : new Date();
    setFin(versChamp(finDeJournee(new Date(depart.getTime() + ms))));
  }

  async function creer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      const { promo } = await api<{ promo: Promo }>('/api/admin/promos', 'POST', {
        cible,
        type,
        valeur: v,
        debut: (debutPlusTard ? new Date(debut) : new Date()).toISOString(),
        fin: new Date(fin).toISOString(),
        titre: titre.trim() || null,
      });
      setPromos((list) => [...list, promo].sort((a, b) => a.debut.localeCompare(b.debut)));
      setTitre('');
      setMessage({ ok: true, texte: 'Promo enregistrée. Elle apparaît sur le site en moins d’une minute.' });
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  async function arreter(p: Promo) {
    if (!window.confirm(`Arrêter la promo « ${libelleCible.get(`${p.cible_type}:${p.cible_id}`) ?? p.cible_id} » maintenant ?`)) return;
    try {
      await api(`/api/admin/promos/${p.id}`, 'PATCH', { action: 'arreter' });
      setPromos((list) =>
        new Date(p.debut).getTime() > Date.now()
          ? list.filter((x) => x.id !== p.id)
          : list.map((x) => (x.id === p.id ? { ...x, fin: new Date().toISOString() } : x)),
      );
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message });
    }
  }

  async function supprimer(p: Promo) {
    if (!window.confirm('Supprimer définitivement cette promo de l’historique ?')) return;
    try {
      await api(`/api/admin/promos/${p.id}`, 'DELETE');
      setPromos((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message });
    }
  }

  async function ajouterCle() {
    setMessage(null);
    try {
      const { challengeId, options } = await api<{ challengeId: string; options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>(
        '/api/admin/auth/register/options',
      );
      const response = await startRegistration({ optionsJSON: options });
      await api('/api/admin/auth/register/verify', 'POST', { challengeId, response });
      window.location.reload();
    } catch (err) {
      setMessage({ ok: false, texte: passkeyError(err) });
    }
  }

  async function retirerCle(c: Cle) {
    if (!window.confirm(`Retirer la clé « ${c.label ?? 'appareil'} » ? Vous serez déconnecté et devrez vous reconnecter avec une autre clé.`)) return;
    try {
      await api(`/api/admin/passkeys/${encodeURIComponent(c.id)}`, 'DELETE');
      setCles((list) => list.filter((x) => x.id !== c.id));
      window.location.assign('/admin/login');
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message });
    }
  }

  async function deconnexion() {
    await api('/api/admin/auth/logout').catch(() => {});
    window.location.replace('/');
  }

  const maintenant = Date.now();
  const enCours = promos.filter((p) => new Date(p.debut).getTime() <= maintenant && new Date(p.fin).getTime() > maintenant);
  const aVenir = promos.filter((p) => new Date(p.debut).getTime() > maintenant);
  const terminees = promos.filter((p) => new Date(p.fin).getTime() <= maintenant).reverse();

  function Ligne({ p, etat }: { p: Promo; etat: 'cours' | 'venir' | 'fini' }) {
    const produits = produitsDe(`${p.cible_type}:${p.cible_id}`);
    const valeurTexte =
      p.type === 'pourcent' ? `−${p.valeur} %` : produits[0] ? `${euros(produits[0].prix)} → ${euros(p.valeur)}` : euros(p.valeur);
    return (
      <li className={`promo promo-${etat}`}>
        <div>
          <p className="promo-cible">{libelleCible.get(`${p.cible_type}:${p.cible_id}`) ?? `${p.cible_id} (retiré du catalogue)`}</p>
          <p className="promo-valeur">{valeurTexte}</p>
          {p.titre && <p className="promo-titre">« {p.titre} »</p>}
          <p className="promo-dates">
            {etat === 'venir' ? `Du ${dateLisible(p.debut)} ` : ''}
            {etat === 'fini' ? `Terminée le ${dateLisible(p.fin)}` : `jusqu’au ${dateLisible(p.fin)}`}
          </p>
        </div>
        {etat === 'fini' ? (
          <button className="bouton-ligne" type="button" onClick={() => supprimer(p)}>
            Supprimer
          </button>
        ) : (
          <button className="bouton-ligne danger" type="button" onClick={() => arreter(p)}>
            {etat === 'venir' ? 'Annuler' : 'Arrêter'}
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="admin">
      <header className="entete">
        <a className="marque" href="/">
          <img src="/assets/logo-clair.png" alt="" width={34} height={34} />
          GOST 31
        </a>
        <span className="qui">{nom}</span>
        <button className="bouton-ligne" type="button" onClick={deconnexion}>
          Se déconnecter
        </button>
      </header>

      <main className="contenu">
        <h1>Promotions</h1>
        {message && (
          <p className={message.ok ? 'succes' : 'erreur'} role={message.ok ? 'status' : 'alert'}>
            {message.texte}
          </p>
        )}

        <form className="carte formulaire" onSubmit={creer}>
          <h2>Nouvelle promotion</h2>

          <label className="champ">
            <span>Produit</span>
            <select value={cible} onChange={(e) => choisirCible(e.target.value)} required>
              {rayons.map((r) => (
                <optgroup key={r.id} label={r.titre}>
                  {r.produits.length > 1 && <option value={`rayon:${r.id}`}>Tout le rayon « {r.titre} »</option>}
                  {r.produits.map((p) => (
                    <option key={p.id} value={`produit:${p.id}`}>
                      {p.nom} — {euros(p.prix)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <fieldset className="champ">
            <legend>Promotion</legend>
            <div className="bascule">
              <label>
                <input type="radio" name="type" checked={type === 'pourcent'} onChange={() => setType('pourcent')} />
                <span>Réduction en %</span>
              </label>
              <label className={estRayon ? 'inactif' : ''}>
                <input type="radio" name="type" checked={type === 'prix'} disabled={estRayon} onChange={() => setType('prix')} />
                <span>Prix promo</span>
              </label>
            </div>
            <div className="valeur">
              <input
                type="number"
                inputMode="decimal"
                min={type === 'pourcent' ? 1 : 0.01}
                max={type === 'pourcent' ? 90 : undefined}
                step={type === 'pourcent' ? 1 : 0.01}
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                required
                aria-label={type === 'pourcent' ? 'Réduction en pourcentage' : 'Prix promo en euros'}
              />
              <span>{type === 'pourcent' ? '%' : '€'}</span>
              {apercu && <output className="apercu">{apercu}</output>}
            </div>
          </fieldset>

          <fieldset className="champ">
            <legend>Début</legend>
            <div className="bascule">
              <label>
                <input type="radio" name="debut" checked={!debutPlusTard} onChange={() => setDebutPlusTard(false)} />
                <span>Tout de suite</span>
              </label>
              <label>
                <input type="radio" name="debut" checked={debutPlusTard} onChange={() => setDebutPlusTard(true)} />
                <span>Plus tard</span>
              </label>
            </div>
            {debutPlusTard && (
              <input type="datetime-local" value={debut} min={versChamp(new Date())} onChange={(e) => setDebut(e.target.value)} required />
            )}
          </fieldset>

          <fieldset className="champ">
            <legend>Durée</legend>
            <div className="puces">
              {DUREES.map(([label, ms]) => (
                <button key={label} type="button" className="puce" onClick={() => appliquerDuree(ms)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="sous-champ">
              <span>Jusqu’au (date limite)</span>
              <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} required />
            </label>
          </fieldset>

          <label className="champ">
            <span>
              Texte de l’affiche <em>(facultatif)</em>
            </span>
            <input type="text" maxLength={60} placeholder="Ex. : Spécial fête des pères" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </label>

          <button className="bouton" type="submit" disabled={envoi || !cible}>
            {envoi ? 'Enregistrement…' : 'Mettre en ligne'}
          </button>
        </form>

        <section className="carte">
          <h2>En cours ({enCours.length})</h2>
          {enCours.length ? <ul className="liste">{enCours.map((p) => <Ligne key={p.id} p={p} etat="cours" />)}</ul> : <p className="vide">Aucune promo en ligne.</p>}
          {aVenir.length > 0 && (
            <>
              <h2>À venir ({aVenir.length})</h2>
              <ul className="liste">{aVenir.map((p) => <Ligne key={p.id} p={p} etat="venir" />)}</ul>
            </>
          )}
          {terminees.length > 0 && (
            <>
              <h2>Terminées (30 derniers jours)</h2>
              <ul className="liste">{terminees.map((p) => <Ligne key={p.id} p={p} etat="fini" />)}</ul>
            </>
          )}
        </section>

        <section className="carte">
          <h2>Mes clés d’accès</h2>
          <ul className="liste">
            {cles.map((c) => (
              <li key={c.id} className="promo">
                <div>
                  <p className="promo-cible">{c.label ?? 'Appareil'}</p>
                  <p className="promo-dates">
                    Créée le {dateLisible(c.creee)}
                    {c.utilisee ? ` · dernière connexion ${dateLisible(c.utilisee)}` : ''}
                  </p>
                </div>
                {cles.length > 1 && (
                  <button className="bouton-ligne danger" type="button" onClick={() => retirerCle(c)}>
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button className="bouton-ligne" type="button" onClick={ajouterCle}>
            Ajouter cet appareil
          </button>
        </section>
      </main>
    </div>
  );
}

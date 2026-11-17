import 'server-only';
import { produitsVises } from '@/lib/catalogue';
import type { CibleType, NewPromo, Promo, PromoType } from '@/lib/store/types';

const DAY = 86_400_000;
export const PROMO_LIMITS = {
  /** Durée maximale d'une promo. */
  maxDays: 92,
  /** Début au plus tard dans… */
  maxStartDays: 366,
  /** Promos en cours ou à venir, au plus. */
  maxActive: 40,
  titreMax: 60,
} as const;

/** Nettoie le texte d'affiche : sans caractères de contrôle ni balises, espaces resserrés. */
function cleanTitre(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const text = value
    .normalize('NFC')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, PROMO_LIMITS.titreMax) : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Valide une promo saisie dans l'admin. Tout est revérifié ici : le formulaire n'est qu'une aide. */
export function validatePromo(
  body: unknown,
  adminId: string,
  now = new Date(),
): { promo: Omit<NewPromo, never> } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const cible = typeof b.cible === 'string' ? b.cible : '';
  const match = /^(produit|rayon):([a-z0-9-]{1,40})$/.exec(cible);
  if (!match) return { error: 'Choisissez un produit ou un rayon.' };
  const cibleType = match[1] as CibleType;
  const cibleId = match[2];
  const produits = produitsVises(cibleType, cibleId);
  if (!produits) return { error: 'Ce produit ou ce rayon n’existe pas.' };

  const type = b.type as PromoType;
  if (type !== 'pourcent' && type !== 'prix') return { error: 'Type de promotion inconnu.' };
  const valeur = typeof b.valeur === 'number' ? b.valeur : Number(b.valeur);
  if (!Number.isFinite(valeur)) return { error: 'Indiquez la valeur de la promotion.' };

  if (type === 'pourcent') {
    if (!Number.isInteger(valeur) || valeur < 1 || valeur > 90) return { error: 'La réduction va de 1 à 90 %.' };
  } else {
    if (cibleType !== 'produit') return { error: 'Un prix promo se fixe produit par produit (en % pour un rayon entier).' };
    if (Math.round(valeur * 100) !== valeur * 100 || valeur <= 0) return { error: 'Prix promo invalide (en euros, 2 décimales au plus).' };
    if (valeur >= produits[0].prix) return { error: `Le prix promo doit être inférieur au prix normal (${produits[0].prix} €).` };
  }

  const debut = parseDate(b.debut);
  const fin = parseDate(b.fin);
  if (!debut || !fin) return { error: 'Dates invalides.' };
  // Un début légèrement passé (formulaire ouvert depuis un moment) est ramené à maintenant.
  const start = debut.getTime() < now.getTime() ? now : debut;
  if (debut.getTime() < now.getTime() - DAY) return { error: 'La date de début est passée.' };
  if (start.getTime() > now.getTime() + PROMO_LIMITS.maxStartDays * DAY) return { error: 'Début trop lointain (un an au plus).' };
  if (fin.getTime() <= start.getTime() + 60_000) return { error: 'La fin doit être après le début.' };
  if (fin.getTime() - start.getTime() > PROMO_LIMITS.maxDays * DAY) {
    return { error: `Une promotion dure ${PROMO_LIMITS.maxDays} jours au plus.` };
  }

  return {
    promo: {
      cible_type: cibleType,
      cible_id: cibleId,
      type,
      valeur,
      debut: start.toISOString(),
      fin: fin.toISOString(),
      titre: cleanTitre(b.titre),
      created_by: adminId,
    },
  };
}

/** Champs publiés sur la vitrine (rien d'autre ne sort). */
export function publicPromo(p: Promo) {
  return { id: p.id, cible_type: p.cible_type, cible_id: p.cible_id, type: p.type, valeur: p.valeur, debut: p.debut, fin: p.fin, titre: p.titre };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

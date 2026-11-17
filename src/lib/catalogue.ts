import 'server-only';
import { readFileSync } from 'fs';
import path from 'path';
import vm from 'vm';

/**
 * Le catalogue de la vitrine (public/shared/catalogue.js) est la SOURCE UNIQUE
 * des produits et des prix. Le serveur le relit pour valider les promos : une
 * promo ne peut viser qu'un produit ou un rayon qui existe, à un prix cohérent.
 */
export interface Produit {
  id: string;
  nom: string;
  prix: number;
  unite: string;
  img: string;
}
export interface Rayon {
  id: string;
  titre: string;
  court: string;
  produits: Produit[];
}

let cache: Rayon[] | null = null;

export function catalogue(): Rayon[] {
  if (cache) return cache;
  const code = readFileSync(path.join(process.cwd(), 'public', 'shared', 'catalogue.js'), 'utf8');
  const sandbox: { window: { CATALOGUE?: unknown } } = { window: {} };
  vm.runInNewContext(code, sandbox, { timeout: 200 });
  const rayons = sandbox.window.CATALOGUE as Rayon[] | undefined;
  if (!Array.isArray(rayons)) throw new Error('Catalogue illisible.');
  cache = rayons.map((r) => ({
    id: String(r.id),
    titre: String(r.titre),
    court: String(r.court),
    produits: (r.produits ?? []).map((p) => ({
      id: String(p.id),
      nom: String(p.nom),
      prix: Number(p.prix),
      unite: String(p.unite),
      img: String(p.img),
    })),
  }));
  return cache;
}

/** Produits visés par une cible, ou null si la cible n'existe pas. */
export function produitsVises(cibleType: string, cibleId: string): Produit[] | null {
  const rayons = catalogue();
  if (cibleType === 'rayon') {
    const rayon = rayons.find((r) => r.id === cibleId);
    return rayon && rayon.produits.length ? rayon.produits : null;
  }
  if (cibleType === 'produit') {
    for (const r of rayons) {
      const p = r.produits.find((x) => x.id === cibleId);
      if (p) return [p];
    }
  }
  return null;
}

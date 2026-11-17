# GOST 31 · Les goodies

La vitrine de GOST 31 (page statique `public/index.html`, inchangée) avec, en plus :

- **des promotions** : affiches « En ce moment » après l'intro, prix barrés dans les rayons et dans le catalogue ;
- **un espace admin caché** pour les gérer : **6 appuis rapides sur le logo GOST 31** de la barre du haut ouvrent `/admin`.

Next.js 15 sur Vercel, base Supabase (ou autre : voir *Changer de base*).

## Ce que fait l'admin

Choisir un **produit** (ou un rayon entier), la **promotion** (réduction en % ou prix promo en €), le **début**
(tout de suite ou plus tard), la **durée** (1 jour → 1 mois en un clic) ou la **date limite**, et un **texte
d'affiche** facultatif (« Spécial fête des pères »). La promo apparaît sur le site en moins d'une minute et
disparaît seule à la date limite. Une promo en cours peut être **arrêtée** à tout moment.

Garde-fous côté serveur : produit existant (lu dans `public/shared/catalogue.js`), 1 à 90 %, prix promo
inférieur au prix normal, 92 jours au plus, 40 promos actives au plus, texte d'affiche nettoyé (60 caractères).

## Sécurité

- **Connexion par clé d'accès (passkey)** : Face ID, empreinte ou code du téléphone. Pas de mot de passe,
  rien à taper ; la clé privée ne quitte jamais le téléphone et ne fonctionne **que sur le vrai domaine**
  (`SITE_URL`), donc inutilisable sur un faux site ou une préversion.
- **Comptes créés en ligne de commande uniquement** (`npm run admin:invite`), qui donne un **lien d'invitation à
  usage unique, valable 48 h**. Le jeton est dans le `#` du lien : il n'est jamais transmis dans l'URL au
  serveur ni noté dans les journaux, et il est effacé de la barre d'adresse dès l'ouverture. Seule son empreinte
  SHA-256 est en base.
- **Session** : cookie `__Host-` httpOnly / Secure / SameSite=Strict, seule l'empreinte du jeton en base ;
  déconnexion après **30 min d'inactivité**, **8 h** au maximum. Chaque page et chaque requête revérifie la session.
- **Anti-CSRF** : toute écriture doit venir d'une page du site (en-tête `Origin` contrôlé) en plus de SameSite=Strict.
- **Limite d'essais** : 10 échecs (connexion ou invitation) par IP en 15 min, puis blocage. L'IP n'est pas
  stockée, seulement son empreinte HMAC.
- **Base fermée** : RLS sur toutes les tables, aucune policy ; seul le serveur (clé `service_role`) y accède.
  Le navigateur ne reçoit aucune clé.
- **En-têtes** : CSP stricte (GSAP et Lenis hébergés sur le site, aucun script externe), HSTS, anti-iframe,
  `noindex` sur l'admin et l'API. Journal (`audit_log`) de chaque connexion, clé ajoutée et promo.
- Téléphone perdu : se connecter depuis un autre appareil et **retirer** la clé, ou `npm run admin:desactiver`.

## Mise en ligne (nouveau Supabase + nouveau Vercel)

1. **Supabase** → nouveau projet → *SQL Editor* → coller et exécuter `supabase/migrations/0001_init.sql`.
   Noter *Project URL* et la clé *service_role* (*Project Settings → API*).
2. **GitHub** : pousser ce dossier dans un dépôt (privé de préférence).
3. **Vercel** → *Add New Project* → importer le dépôt (Next.js détecté) → *Environment Variables* :
   | Variable | Valeur |
   |---|---|
   | `SUPABASE_URL` | Project URL Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé service_role (secrète) |
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `SITE_URL` | l'adresse finale, ex. `https://gost31.vercel.app` (sans `/` final) |
   Déployer. Si l'adresse change (nom de domaine), mettre à jour `SITE_URL` : les clés créées avant ne
   marcheront plus, il faudra une nouvelle invitation.
4. **Premier admin**, depuis ce dossier : copier `.env.example` en `.env.local`, le remplir avec les mêmes valeurs, puis
   ```
   npm run admin:invite -- adresse@exemple.fr "Prénom Nom"
   ```
   Envoyer le lien affiché par SMS ou Signal. Sur son téléphone : ouvrir le lien → *Créer ma clé d'accès*.
5. Ensuite : 6 appuis sur le logo du site → *Se connecter avec ma clé d'accès*.

## En local

`npm install` puis `npm run dev`. **Sans `.env.local`**, une base en mémoire est utilisée (jamais en
production) : le lien d'invitation d'un admin de test s'affiche dans le terminal. Elle se vide à chaque redémarrage.

## Changer de base

Tout l'accès aux données passe par l'interface `Store` (`src/lib/store/types.ts`). Pour Redis, Neon…, écrire
un nouveau `Store` à côté de `supabase.ts` et le choisir dans `src/lib/store/index.ts` ; le reste ne bouge pas.

## Modifier les produits

Toujours dans `public/shared/catalogue.js` (vitrine et admin le lisent tous les deux). Une promo sur un
produit retiré du catalogue ne s'affiche plus.

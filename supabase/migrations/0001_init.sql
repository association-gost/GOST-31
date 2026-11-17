-- GOST 31 — promotions et espace admin.
-- À exécuter une fois dans Supabase → SQL Editor, sur un projet DÉDIÉ.
--
-- Sécurité : RLS activée sur toutes les tables et AUCUNE policy. Les rôles
-- publics (anon, authenticated) ne peuvent rien lire ni écrire ; seul le
-- serveur, avec la clé service_role, accède à la base, après avoir vérifié la
-- session de l'admin à chaque requête.

create extension if not exists pgcrypto;

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  full_name text not null check (char_length(full_name) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Invitation à enregistrer une clé d'accès : seul le SHA-256 du jeton est stocké.
create table public.invites (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  admin_id uuid not null references public.admins(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.passkeys (
  id text primary key,
  admin_id uuid not null references public.admins(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkeys_admin on public.passkeys (admin_id);

create table public.auth_challenges (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id) on delete cascade,
  purpose text not null check (purpose in ('login', 'register')),
  challenge text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Sessions : seul le SHA-256 du jeton (cookie httpOnly) est stocké.
create table public.sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  admin_id uuid not null references public.admins(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);
create index sessions_admin on public.sessions (admin_id);

-- Tentatives (connexion, invitation) : empreinte HMAC de l'IP, jamais l'IP en clair.
create table public.login_attempts (
  id bigserial primary key,
  ip_hash text not null,
  kind text not null check (kind in ('login', 'invite')),
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_ip on public.login_attempts (ip_hash, created_at);

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  cible_type text not null check (cible_type in ('produit', 'rayon')),
  cible_id text not null check (cible_id ~ '^[a-z0-9-]{1,40}$'),
  type text not null check (type in ('pourcent', 'prix')),
  valeur numeric(8, 2) not null check (valeur >= 0 and valeur < 100000),
  debut timestamptz not null,
  fin timestamptz not null,
  titre text check (titre is null or char_length(titre) <= 60),
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fin > debut),
  check (type <> 'pourcent' or (valeur >= 1 and valeur <= 90))
);
create index promos_fin on public.promos (fin);

-- Journal : qui a fait quoi (connexions, clés, promos).
create table public.audit_log (
  id bigserial primary key,
  admin_id uuid references public.admins(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.invites enable row level security;
alter table public.passkeys enable row level security;
alter table public.auth_challenges enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.promos enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

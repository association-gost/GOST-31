import 'server-only';
import { env, isDev } from '@/lib/env';
import { memoryStore } from './memory';
import { supabaseStore } from './supabase';
import type { Store } from './types';

let instance: Store | null = null;

/** Supabase si configuré ; base en mémoire en local uniquement ; sinon erreur (jamais de repli silencieux en production). */
export function store(): Store {
  if (instance) return instance;
  if (env.hasDatabase) instance = supabaseStore();
  else if (isDev) instance = memoryStore();
  else throw new Error('Base de données non configurée (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  return instance;
}

export type { Admin, Passkey, Promo } from './types';

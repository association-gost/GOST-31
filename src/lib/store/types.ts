export interface Admin {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface Passkey {
  id: string;
  admin_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

export type CibleType = 'produit' | 'rayon';
export type PromoType = 'pourcent' | 'prix';

export interface Promo {
  id: string;
  cible_type: CibleType;
  cible_id: string;
  type: PromoType;
  valeur: number;
  debut: string;
  fin: string;
  titre: string | null;
  created_at: string;
}

export type NewPromo = Omit<Promo, 'id' | 'created_at'> & { created_by: string };

export interface Challenge {
  admin_id: string | null;
  challenge: string;
  expires_at: string;
}

export interface SessionRow {
  admin_id: string;
  last_seen_at: string;
  expires_at: string;
}

/**
 * Accès aux données, toujours côté serveur. Les opérations « take » lisent ET
 * suppriment en une seule requête : un défi ou une invitation ne sert qu'une fois,
 * même si deux requêtes arrivent en même temps.
 */
export interface Store {
  adminById(id: string): Promise<Admin | null>;
  takeInvite(tokenHash: string): Promise<string | null>;

  passkeysOf(adminId: string): Promise<Passkey[]>;
  passkeyById(id: string): Promise<Passkey | null>;
  addPasskey(passkey: Omit<Passkey, 'created_at' | 'last_used_at'>): Promise<void>;
  touchPasskey(id: string, counter: number): Promise<void>;
  deletePasskey(id: string, adminId: string): Promise<boolean>;

  addChallenge(purpose: 'login' | 'register', challenge: string, adminId: string | null, expiresAt: Date): Promise<string>;
  takeChallenge(id: string, purpose: 'login' | 'register'): Promise<Challenge | null>;

  addSession(row: { token_hash: string; admin_id: string; expires_at: string; user_agent: string }): Promise<void>;
  session(tokenHash: string): Promise<SessionRow | null>;
  touchSession(tokenHash: string): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsOf(adminId: string): Promise<void>;

  countFailures(ipHash: string, since: Date): Promise<number>;
  recordAttempt(ipHash: string, kind: 'login' | 'invite', success: boolean): Promise<void>;

  /** Promos dont la fin est postérieure à `since`, par date de début. */
  promos(since: Date): Promise<Promo[]>;
  addPromo(promo: NewPromo): Promise<Promo>;
  setPromoFin(id: string, fin: string): Promise<boolean>;
  deletePromo(id: string): Promise<boolean>;

  audit(adminId: string | null, action: string, detail?: Record<string, unknown>): Promise<void>;
  /** Ménage : défis, sessions et invitations expirés, vieilles tentatives. */
  purge(): Promise<void>;
}

/** Règles de sécurité de l'espace admin — source unique. Sans dépendance Node (importable par le middleware). */
export const AUTH_POLICY = {
  /** Déconnexion après cette durée sans activité. */
  inactivityMinutes: 30,
  /** Durée maximale d'une session, même active. */
  sessionMaxHours: 8,
  /** Après une invitation valide : délai pour enregistrer la clé d'accès. */
  enrollmentMinutes: 10,
  /** Validité d'un défi WebAuthn. */
  challengeMinutes: 5,
  /** Échecs tolérés par IP sur la fenêtre (connexion + invitation). */
  maxFailuresPerIp: 10,
  failureWindowMinutes: 15,
  /** Clés d'accès par compte (téléphone, ordinateur…). */
  maxPasskeys: 5,
} as const;

const secure = process.env.NODE_ENV === 'production';
/** Préfixe __Host- en production : cookie HTTPS, sans domaine, chemin / (impossible à poser depuis un sous-domaine). */
export const SESSION_COOKIE = secure ? '__Host-gost_session' : 'gost_session';
export const ENROLL_COOKIE = secure ? '__Host-gost_enroll' : 'gost_enroll';

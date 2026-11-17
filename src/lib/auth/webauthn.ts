import 'server-only';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { store, type Admin } from '@/lib/store';
import { siteOrigin } from '@/lib/server/request';
import { AUTH_POLICY } from './policy';

/**
 * Clés d'accès (passkeys) : Face ID, Touch ID, empreinte, Windows Hello. La clé
 * privée ne quitte jamais l'appareil ; le serveur ne garde que la clé publique.
 * `userVerification: 'required'` impose la biométrie (ou le code de l'appareil)
 * à chaque connexion : possession + biométrie, sans mot de passe.
 *
 * Connexion sans identifiant : la clé est « découvrable », le téléphone propose
 * directement le compte. Rien à taper, et rien à deviner pour un attaquant.
 */
const RP_NAME = 'GOST 31 · Admin';
const expiry = () => new Date(Date.now() + AUTH_POLICY.challengeMinutes * 60_000);
const isChallengeId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

export async function loginOptions(request: Request) {
  const { rpID } = siteOrigin(request);
  const options = await generateAuthenticationOptions({ rpID, allowCredentials: [], userVerification: 'required' });
  const challengeId = await store().addChallenge('login', options.challenge, null, expiry());
  return { challengeId, options };
}

/** Vérifie la signature de l'appareil ; retourne l'admin (actif) ou null. */
export async function verifyLogin(request: Request, challengeId: unknown, response: AuthenticationResponseJSON): Promise<Admin | null> {
  if (!isChallengeId(challengeId) || typeof response?.id !== 'string' || response.id.length > 1024) return null;
  const db = store();
  const challenge = await db.takeChallenge(challengeId, 'login');
  if (!challenge) return null;
  const passkey = await db.passkeyById(response.id);
  if (!passkey) return null;
  const admin = await db.adminById(passkey.admin_id);
  if (!admin?.is_active) return null;

  const { origin, rpID } = siteOrigin(request);
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.public_key),
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });
    if (!verified) return null;
    await db.touchPasskey(passkey.id, authenticationInfo.newCounter);
    return admin;
  } catch {
    return null;
  }
}

export async function registrationOptions(request: Request, admin: Admin) {
  const { rpID } = siteOrigin(request);
  const existing = await store().passkeysOf(admin.id);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: admin.email,
    userDisplayName: admin.full_name,
    userID: isoBase64URL.toBuffer(isoBase64URL.fromUTF8String(admin.id)),
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  const challengeId = await store().addChallenge('register', options.challenge, admin.id, expiry());
  return { challengeId, options, count: existing.length };
}

export async function verifyRegistration(
  request: Request,
  admin: Admin,
  challengeId: unknown,
  response: RegistrationResponseJSON,
  deviceLabel: string,
): Promise<boolean> {
  if (!isChallengeId(challengeId)) return false;
  const db = store();
  const challenge = await db.takeChallenge(challengeId, 'register');
  if (!challenge || challenge.admin_id !== admin.id) return false;
  if ((await db.passkeysOf(admin.id)).length >= AUTH_POLICY.maxPasskeys) return false;

  const { origin, rpID } = siteOrigin(request);
  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verified || !registrationInfo) return false;
    const { credential } = registrationInfo;
    await db.addPasskey({
      id: credential.id,
      admin_id: admin.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      device_label: deviceLabel,
    });
    return true;
  } catch {
    return false;
  }
}

/** Libellé lisible de l'appareil (« Safari · iOS »), pour la liste des clés. */
export function deviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg/') ? 'Edge' : ua.includes('firefox') ? 'Firefox' : ua.includes('chrome') ? 'Chrome' : ua.includes('safari') ? 'Safari' : 'Navigateur';
  const os = ua.includes('iphone') || ua.includes('ipad') ? 'iOS' : ua.includes('android') ? 'Android' : ua.includes('windows') ? 'Windows' : ua.includes('mac os') ? 'macOS' : 'Autre';
  return `${browser} · ${os}`;
}

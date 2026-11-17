/**
 * Gestion des comptes admin (lit .env.local : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL).
 *
 *   npm run admin:invite -- <email> "<Prénom Nom>"
 *       Crée (ou réactive) le compte et affiche un lien d'invitation à usage
 *       unique, valable 48 h. Le lien sert à enregistrer une clé d'accès
 *       (Face ID / empreinte). Téléphone perdu : on refait une invitation.
 *
 *   npm run admin:desactiver -- <email>
 *       Bloque le compte : sessions fermées tout de suite, clés et invitations effacées.
 *
 * Envoyez le lien par un canal sûr (SMS, Signal…), jamais sur un groupe.
 */
import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const [commande, emailArg, nomArg] = process.argv.slice(2);
const email = (emailArg ?? '').trim().toLowerCase();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL } = process.env;

function stop(message) {
  console.error(message);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) stop('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local).');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop('Adresse e-mail invalide.');

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = (result, label) => {
  if (result.error) stop(`${label} : ${result.error.message}`);
  return result.data;
};

async function inviter() {
  if (!SITE_URL) stop('SITE_URL est requis (.env.local).');
  const nom = (nomArg ?? '').trim();
  if (!nom) stop('Usage : npm run admin:invite -- <email> "<Prénom Nom>"');
  const admin = ok(
    await db.from('admins').upsert({ email, full_name: nom.slice(0, 80), is_active: true }, { onConflict: 'email' }).select('id').single(),
    'compte',
  );
  // Une seule invitation valable à la fois.
  ok(await db.from('invites').delete().eq('admin_id', admin.id), 'anciennes invitations');
  const token = randomBytes(32).toString('base64url');
  ok(
    await db.from('invites').insert({
      token_hash: createHash('sha256').update(token).digest('hex'),
      admin_id: admin.id,
      expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
    }),
    'invitation',
  );
  console.log(`\n✓ ${nom} <${email}>\n\nLien d'invitation (usage unique, 48 h) :\n${SITE_URL.replace(/\/+$/, '')}/admin/invitation#${token}\n`);
}

async function desactiver() {
  const admin = ok(await db.from('admins').select('id').eq('email', email).maybeSingle(), 'compte');
  if (!admin) stop('Aucun compte avec cette adresse.');
  ok(await db.from('admins').update({ is_active: false }).eq('id', admin.id), 'désactivation');
  await db.from('sessions').delete().eq('admin_id', admin.id);
  await db.from('passkeys').delete().eq('admin_id', admin.id);
  await db.from('invites').delete().eq('admin_id', admin.id);
  console.log(`✓ ${email} désactivé : sessions fermées, clés effacées.`);
}

if (commande === 'inviter') await inviter();
else if (commande === 'desactiver') await desactiver();
else stop('Commande inconnue (inviter | desactiver).');

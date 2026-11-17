import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './admin.css';

// Seul l'espace admin passe par Next.js : la vitrine est la page statique public/index.html.
export const metadata: Metadata = {
  title: 'GOST 31 · Admin',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  icons: { icon: '/assets/logo-clair.png' },
};
export const viewport: Viewport = { themeColor: '#050506', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

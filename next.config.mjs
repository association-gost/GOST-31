const isDev = process.env.NODE_ENV !== 'production';

/**
 * Politiques de sécurité de contenu. Tout vient du site lui-même (GSAP et Lenis
 * sont hébergés dans public/vendor) ; seules les polices Google sont externes,
 * et uniquement sur la vitrine.
 *  - 'unsafe-inline' (scripts) : script de la vitrine et amorçage de Next.js ;
 *  - 'unsafe-eval' : rechargement à chaud, en développement seulement.
 */
const commun = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "img-src 'self' data: blob:",
  "media-src 'self'",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];
const cspVitrine = [
  ...commun,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
].join('; ');
const cspAdmin = [...commun, "style-src 'self' 'unsafe-inline'", "font-src 'self'"].join('; ');

const communs = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },

  // Le serveur lit le catalogue de la vitrine (source unique des produits et des prix).
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/shared/catalogue.js'],
    '/admin/**/*': ['./public/shared/catalogue.js'],
    '/admin': ['./public/shared/catalogue.js'],
  },

  async rewrites() {
    // La vitrine reste la page statique d'origine.
    return { beforeFiles: [{ source: '/', destination: '/index.html' }] };
  },

  async headers() {
    return [
      { source: '/((?!admin|api).*)', headers: [...communs, { key: 'Content-Security-Policy', value: cspVitrine }] },
      {
        source: '/admin/:path*',
        headers: [
          ...communs,
          { key: 'Content-Security-Policy', value: cspAdmin },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/admin',
        headers: [
          ...communs,
          { key: 'Content-Security-Policy', value: cspAdmin },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          ...communs,
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;

import { NextResponse } from 'next/server';
import { publicPromo } from '@/lib/promos';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Promos EN COURS, pour la vitrine. Lecture seule, mise en cache 1 min par Vercel. */
export async function GET() {
  try {
    const now = new Date();
    const promos = (await store().promos(now)).filter((p) => new Date(p.debut).getTime() <= now.getTime());
    return NextResponse.json(
      { promos: promos.map(publicPromo) },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (error) {
    console.error('[promos]', error);
    return NextResponse.json({ promos: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

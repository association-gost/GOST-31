import { NextResponse } from 'next/server';

export function jsonOk<T extends object>(data?: T) {
  return NextResponse.json({ success: true, ...(data ?? {}) }, { headers: { 'Cache-Control': 'no-store' } });
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Corps JSON d'une requête (16 Ko au plus) ; undefined s'il est illisible ou trop gros. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (text.length > 16_384) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

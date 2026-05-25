import { NextResponse } from 'next/server';

const SNAPSHOT_URL =
  'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c?networks=Vermont&dataTypes=cctvSnapshotData';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing camera id' }, { status: 400 });
  }

  try {
    const res = await fetch(SNAPSHOT_URL, {
      signal: AbortSignal.timeout(45000),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Snapshot feed unavailable' }, { status: 502 });
    }

    const xml = await res.text();
    const pattern = new RegExp(
      `<cctvSnapshot\\s+id="${escapeRegExp(id)}"[\\s\\S]*?<fileType>([^<]+)<\\/fileType>[\\s\\S]*?<snippet>([^<]+)<\\/snippet>`,
    );
    const match = xml.match(pattern);
    if (!match?.[2]) {
      return NextResponse.json({ error: 'Camera snapshot unavailable' }, { status: 404 });
    }

    const fileType = match[1]?.toLowerCase() === 'png' ? 'png' : 'jpeg';
    const image = Buffer.from(match[2], 'base64');

    return new Response(image, {
      headers: {
        'Content-Type': `image/${fileType}`,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Snapshot fetch failed' }, { status: 502 });
  }
}

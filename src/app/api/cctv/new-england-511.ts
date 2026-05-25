import type { CctvCamera } from './types';

const STATUS_URL =
  'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c?networks=Vermont&dataTypes=cctvStatusData';
const SNAPSHOT_URL =
  'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c?networks=Vermont&dataTypes=cctvSnapshotData';
const SNAPSHOT_FRESHNESS_MS = 30 * 60 * 1000;

function ne511ImageUrl(cameraId: string): string {
  const refreshBucket = Math.floor(Date.now() / 60000);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.OSIRIS_BASE_PATH || '';
  return `${basePath}/api/cctv/ne511-image?id=${encodeURIComponent(cameraId)}&t=${refreshBucket}`;
}

function parseMicroCoord(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) > 180 ? n / 1_000_000 : n;
}

function parseNeTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, year, month, day, hour, minute, second] = m;
  const offset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour))))
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '-05:00';
  // NEC Compass timestamps are New England local time; using that zone avoids
  // comparing a fresh evening image as if it were UTC.
  return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`);
}

/** Vermont DOT / New England 511 traffic cameras with fresh snapshots only. */
export async function fetchNewEngland511VermontCameras(): Promise<CctvCamera[]> {
  try {
    const [statusRes, snapshotRes] = await Promise.all([
      fetch(STATUS_URL, { signal: AbortSignal.timeout(20000) }),
      fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(45000) }),
    ]);
    if (!statusRes.ok) return [];

    const statusXml = await statusRes.text();
    const freshSnapshotIds = new Set<string>();
    if (snapshotRes.ok) {
      const snapXml = await snapshotRes.text();
      for (const m of snapXml.matchAll(/<cctvSnapshot\s+id="([^"]+)"[\s\S]*?<timestamp>([^<]+)<\/timestamp>[\s\S]*?<size>([^<]+)<\/size>[\s\S]*?<snippet>([^<]+)<\/snippet>/g)) {
        const timestamp = parseNeTimestamp(m[2]);
        const size = Number(m[3]);
        if (
          timestamp != null &&
          Date.now() - timestamp <= SNAPSHOT_FRESHNESS_MS &&
          Number.isFinite(size) &&
          size > 0 &&
          m[4].length > 0
        ) {
          freshSnapshotIds.add(m[1]);
        }
      }
    }

    const cams: CctvCamera[] = [];
    const blocks = statusXml.split('<cctvStatus ');
    for (const block of blocks.slice(1)) {
      const idMatch = block.match(/^id="([^"]+)"/);
      if (!idMatch) continue;
      const id = idMatch[1];
      const name = block.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() || id;
      const lat = parseMicroCoord(block.match(/<lat>([^<]*)<\/lat>/)?.[1]);
      const lng = parseMicroCoord(block.match(/<lon>([^<]*)<\/lon>/)?.[1]);
      const status = block.match(/<status>([^<]*)<\/status>/)?.[1]?.trim();
      if (lat == null || lng == null) continue;
      if (status !== 'Device Online') continue;
      if (!freshSnapshotIds.has(id)) continue;

      cams.push({
        id: `ne511-vt-${id.replace(/\s+/g, '-').toLowerCase()}`,
        lat,
        lng,
        name,
        city: 'Vermont',
        country: 'US',
        feed_url: ne511ImageUrl(id),
        external_url: 'https://newengland511.org/map',
        source: 'New England 511',
      });
    }
    return cams;
  } catch {
    return [];
  }
}

/** Optional REST API when NEW_ENGLAND_511_API_KEY is set (same schema as 511on.ca). */
export async function fetchNewEngland511ApiCameras(apiKey: string): Promise<CctvCamera[]> {
  try {
    const url = `https://newengland511.org/api/v2/get/cameras?key=${encodeURIComponent(apiKey)}&format=json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.cameras || [];
    const cams: CctvCamera[] = [];
    for (const cam of list) {
      const lat = cam.Latitude ?? cam.latitude;
      const lng = cam.Longitude ?? cam.longitude;
      if (!lat || !lng) continue;
      if (lat < 42.5 || lat > 45.2 || lng < -73.6 || lng > -71) continue;
      const id = String(cam.Id ?? cam.id ?? cams.length);
      const views = cam.Views || cam.views || [];
      const feed =
        views[0]?.Url ||
        views[0]?.url ||
        cam.ImageUrl ||
        cam.imageUrl ||
        ne511ImageUrl(cam.Location || cam.location || id);
      cams.push({
        id: `ne511-api-vt-${id}`,
        lat,
        lng,
        name: cam.Location || cam.location || cam.Description || cam.description || 'VT 511 Camera',
        city: 'Vermont',
        country: 'US',
        feed_url: feed,
        external_url: 'https://newengland511.org/map',
        source: 'New England 511 API',
      });
    }
    return cams;
  } catch {
    return [];
  }
}

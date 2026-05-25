import type { CctvCamera } from './types';

const NS = 'http://its.gov/c2c_icd';
const STATUS_URL =
  'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c?networks=Vermont&dataTypes=cctvStatusData';
const SNAPSHOT_URL =
  'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c?networks=Vermont&dataTypes=cctvSnapshotData';
const IMAGE_BASE = 'https://newengland511.org/map/Cctv/GetCameraImage';

function ne511ImageUrl(cameraId: string): string {
  return `${IMAGE_BASE}?cameraId=${encodeURIComponent(cameraId)}`;
}

function parseMicroCoord(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) > 180 ? n / 1_000_000 : n;
}

/** Vermont DOT / New England 511 traffic cameras (public NEC Compass + map image URLs). */
export async function fetchNewEngland511VermontCameras(): Promise<CctvCamera[]> {
  try {
    const [statusRes, snapshotRes] = await Promise.all([
      fetch(STATUS_URL, { signal: AbortSignal.timeout(20000) }),
      fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(45000) }),
    ]);
    if (!statusRes.ok) return [];

    const statusXml = await statusRes.text();
    const snapshotIds = new Set<string>();
    if (snapshotRes.ok) {
      const snapXml = await snapshotRes.text();
      for (const m of snapXml.matchAll(/<cctvSnapshot\s+id="([^"]+)"/g)) {
        snapshotIds.add(m[1]);
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
      if (lat == null || lng == null) continue;
      if (snapshotIds.size > 0 && !snapshotIds.has(id)) continue;

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

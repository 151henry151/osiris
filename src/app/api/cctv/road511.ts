import type { CctvCamera } from './types';
import { fetchNewEngland511RegionalCameras } from './new-england-511';

const ROAD511_URL = 'https://api.road511.com/api/v1/features';
const UPDATED_WITHIN_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 1000;
const MAX_CAMERAS_PER_STATE = 500;

const US_JURISDICTIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

type Road511Feature = {
  id?: string;
  source_id?: string;
  jurisdiction?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  road_name?: string;
  direction?: string;
  is_active?: boolean;
  properties?: Record<string, unknown>;
  last_updated?: string;
};

function isRecent(value: string | undefined): boolean {
  if (!value) return false;
  const ts = Date.parse(value);
  return Number.isFinite(ts) && Date.now() - ts <= UPDATED_WITHIN_MS;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeUrl(url: string | undefined): string | undefined {
  return url ? encodeURI(url) : undefined;
}

function makeCamera(feature: Road511Feature): CctvCamera | null {
  const props = feature.properties || {};
  const imageUrl = normalizeUrl(asString(props.image_url));
  const videoUrl = normalizeUrl(asString(props.video_url));
  const state = feature.jurisdiction || 'US';

  if (!feature.is_active || !isRecent(feature.last_updated)) return null;
  if (!feature.latitude || !feature.longitude) return null;
  if (!imageUrl && !videoUrl) return null;

  const base = {
    id: `road511-${feature.id || feature.source_id || `${state}-${feature.latitude}-${feature.longitude}`}`,
    lat: feature.latitude,
    lng: feature.longitude,
    name: feature.name || `${state} traffic camera`,
    city: state,
    country: 'US',
    external_url: `https://map.road511.com/?jurisdiction=${encodeURIComponent(state)}`,
    source: `Road511 ${state}`,
  };

  if (videoUrl && /\.m3u8(\?|$)/i.test(videoUrl)) {
    return {
      ...base,
      stream_url: videoUrl,
      stream_type: 'hls',
      feed_url: imageUrl,
    };
  }

  return imageUrl ? { ...base, feed_url: imageUrl } : null;
}

async function fetchRoad511State(jurisdiction: string): Promise<CctvCamera[]> {
  const cameras: CctvCamera[] = [];

  for (let offset = 0; offset < 20000 && cameras.length < MAX_CAMERAS_PER_STATE;) {
    try {
      const url = `${ROAD511_URL}?type=cameras&jurisdiction=${jurisdiction}&limit=${PAGE_LIMIT}&offset=${offset}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;

      const data = await res.json();
      const features: Road511Feature[] = Array.isArray(data?.data) ? data.data : [];
      for (const feature of features) {
        const camera = makeCamera(feature);
        if (camera) cameras.push(camera);
        if (cameras.length >= MAX_CAMERAS_PER_STATE) break;
      }

      if (!data?.has_more || features.length === 0) break;
      offset += features.length;
    } catch {
      break;
    }
  }

  return cameras;
}

async function fetchRoad511AllStates(): Promise<CctvCamera[]> {
  const cameras: CctvCamera[] = [];
  const chunkSize = 6;

  for (let i = 0; i < US_JURISDICTIONS.length; i += chunkSize) {
    const chunk = US_JURISDICTIONS.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map((state) => fetchRoad511State(state)));
    cameras.push(...results.flat());
  }

  return cameras;
}

export async function fetchUsLiveCameras(): Promise<CctvCamera[]> {
  const [road511, newEngland] = await Promise.all([
    fetchRoad511AllStates(),
    fetchNewEngland511RegionalCameras(),
  ]);

  return [...road511, ...newEngland];
}

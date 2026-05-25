import type { CctvCamera } from './types';
import {
  fetchNewEngland511ApiCameras,
  fetchNewEngland511VermontCameras,
} from './new-england-511';

function camstreamer(
  embedPath: string,
  youtubeId: string,
  name: string,
  lat: number,
  lng: number,
  city: string,
  external_url: string,
): CctvCamera & { youtube_id: string } {
  return {
    id: `vt-cs-${slug(name)}`,
    youtube_id: youtubeId,
    lat,
    lng,
    name,
    city,
    country: 'US',
    stream_url: `https://camstreamer.com/embed/${embedPath}?autoplay=1&rel=0&showinfo=0`,
    stream_type: 'iframe',
    external_url,
    source: 'CamStreamer',
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

type YoutubeCamera = CctvCamera & { youtube_id: string };

const CAMSTREAMER_CAMERAS: YoutubeCamera[] = [
  camstreamer(
    'bTcqcQsmHOENtNR6r5bshdLwLcYV2abBDZPN5tYd',
    'DWDl1riEgr0',
    'Sugarbush - Mountain Live',
    44.136,
    -72.894,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'B4zWOP7M8bTjYu4g27EhjVAL9SWgFVtkx8vcUqAl',
    'jhCh3dsEv-M',
    'Sugarbush - Gate House Plaza',
    44.147,
    -72.898,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'DhlhgO70iUnmfRQuuejOIZO59FrW09AIcUg1iNYb',
    'E_dnBJd6OZQ',
    'Sugarbush - Gadd Peak / Lincoln Peak',
    44.152,
    -72.902,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'c140c59184d25e6/S-21047',
    'omVjZZRsrPo',
    'Killington - Snowshed Live',
    43.6045,
    -72.8201,
    'Killington',
    'https://camstreamer.com/live/stream/6467-killington-resort-snowshed-live-webcam',
  ),
  camstreamer(
    'vRodvCUPPe15UFUP4XVpIRsqRjyapa5zeRNgXFFx',
    '9E00W9R_Cnc',
    'Stratton - Summit Cam',
    43.1122,
    -72.9064,
    'Stratton',
    'https://camstreamer.com/live/stream/411100532-summit-cam-at-stratton-mountain-resort',
  ),
  camstreamer(
    '70ccf46040b5642/S-19241',
    'H-_sGi4Sbtk',
    'Stratton - Base Cam',
    43.108,
    -72.912,
    'Stratton',
    'https://camstreamer.com/live/stream/5764-base-cam-at-stratton-mountain-resort',
  ),
  camstreamer(
    '76a10c75a4d8eee/S-16145',
    'VX9ANOUYO1k',
    'Bolton Valley',
    44.405,
    -72.949,
    'Richmond',
    'https://camstreamer.com/live/stream/4739-bolton-valley-vermont',
  ),
  camstreamer(
    '5f68f8edaf383f3/S-47426',
    'wVOqgmbvCrY',
    'Mad River Glen - Single Chair',
    44.1902,
    -72.8248,
    'Waitsfield',
    'https://camstreamer.com/live/stream/17598',
  ),
];

const LIVE_IFRAME_CAMERAS: CctvCamera[] = [
  {
    id: 'vt-stowe-earthcam-trapp',
    lat: 44.4655,
    lng: -72.7485,
    name: 'Stowe - Trapp Family Lodge (EarthCam)',
    city: 'Stowe',
    country: 'US',
    stream_url: 'https://www.earthcam.com/embed/stowe/?cam=windjammer',
    stream_type: 'iframe',
    external_url: 'https://www.earthcam.com/usa/vermont/stowe/?cam=windjammer',
    source: 'EarthCam',
  },
];

async function isYoutubeLiveAvailable(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OSIRIS/1.0; +https://hromp.com/osiris)',
        Accept: 'text/html',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;

    const html = await res.text();
    const playabilityStart = html.indexOf('"playabilityStatus"');
    const playabilityChunk = playabilityStart >= 0 ? html.slice(playabilityStart, playabilityStart + 5000) : html;
    const status = playabilityChunk.match(/"status":"([^"]+)"/)?.[1];
    const reason = playabilityChunk.match(/"reason":"([^"]+)"/)?.[1] || '';

    return (
      status === 'OK' &&
      /"liveStreamability":/.test(playabilityChunk) &&
      !/not available|unavailable|offline|ended|private|removed/i.test(reason)
    );
  } catch {
    return false;
  }
}

async function fetchAvailableCamStreamerCameras(): Promise<CctvCamera[]> {
  const checks = await Promise.all(
    CAMSTREAMER_CAMERAS.map(async (camera) => ({
      camera,
      available: await isYoutubeLiveAvailable(camera.youtube_id),
    })),
  );

  return checks
    .filter(({ available }) => available)
    .map(({ camera }) => {
      const publicCamera: Partial<YoutubeCamera> = { ...camera };
      delete publicCamera.youtube_id;
      return publicCamera;
    }) as CctvCamera[];
}

export async function fetchVermontCameras(): Promise<CctvCamera[]> {
  const apiKey = process.env.NEW_ENGLAND_511_API_KEY?.trim();
  const [camstreamer, ne511, ne511Api] = await Promise.all([
    fetchAvailableCamStreamerCameras(),
    fetchNewEngland511VermontCameras(),
    apiKey ? fetchNewEngland511ApiCameras(apiKey) : Promise.resolve([]),
  ]);
  return [
    ...camstreamer,
    ...LIVE_IFRAME_CAMERAS,
    ...ne511,
    ...ne511Api,
  ];
}

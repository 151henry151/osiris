import type { CctvCamera } from './types';
import {
  fetchNewEngland511ApiCameras,
  fetchNewEngland511VermontCameras,
} from './new-england-511';

function camstreamer(
  embedPath: string,
  name: string,
  lat: number,
  lng: number,
  city: string,
  external_url: string,
): CctvCamera {
  return {
    id: `vt-cs-${slug(name)}`,
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

/** WorldCam.pl snapshot (refreshed by provider; stable path without ?03 cache-buster). */
function worldcam(path: string): string {
  return `https://www.worldcam.pl/images/webcams/200x113/${path}`;
}

/** img2.worldcam.pl uses a date folder; rebuild URL on each fetch. */
function worldcamDated(imageId: string, size: '200x113' | '90x68' = '200x113'): string {
  const day = new Date().toISOString().slice(0, 10);
  return `https://img2.worldcam.pl/webcams/${size}/${day}/${imageId}.jpg`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

/** Approximate coordinates from "City - …" labels (WorldCam / public feeds). */
const CITY_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  Bennington: { lat: 42.8781, lng: -73.1968, city: 'Bennington' },
  Burlington: { lat: 44.4759, lng: -73.2121, city: 'Burlington' },
  Charlotte: { lat: 44.283, lng: -73.368, city: 'Charlotte' },
  'East Burke': { lat: 44.587, lng: -71.944, city: 'East Burke' },
  'Island Pond': { lat: 44.814, lng: -71.878, city: 'Island Pond' },
  Jay: { lat: 44.938, lng: -72.506, city: 'Jay' },
  Jericho: { lat: 44.504, lng: -72.998, city: 'Jericho' },
  Killington: { lat: 43.6045, lng: -72.8201, city: 'Killington' },
  Ludlow: { lat: 43.4015, lng: -72.7176, city: 'Ludlow' },
  Mendon: { lat: 43.6595, lng: -72.8425, city: 'Mendon' },
  Middlebury: { lat: 44.0153, lng: -73.1673, city: 'Middlebury' },
  Montpelier: { lat: 44.2601, lng: -72.5754, city: 'Montpelier' },
  Newport: { lat: 44.9362, lng: -72.2051, city: 'Newport' },
  'North Hero': { lat: 44.8137, lng: -73.2025, city: 'North Hero' },
  Peru: { lat: 43.1765, lng: -72.9385, city: 'Peru' },
  Quechee: { lat: 43.646, lng: -72.418, city: 'Quechee' },
  Richmond: { lat: 44.405, lng: -72.949, city: 'Richmond' },
  Rutland: { lat: 43.6106, lng: -72.9726, city: 'Rutland' },
  Smugglers: { lat: 44.588, lng: -72.811, city: 'Smugglers Notch' },
  Stowe: { lat: 44.4655, lng: -72.7485, city: 'Stowe' },
  Tunbridge: { lat: 43.889, lng: -72.4948, city: 'Tunbridge' },
  Waitsfield: { lat: 44.1902, lng: -72.8248, city: 'Waitsfield' },
  Warren: { lat: 44.136, lng: -72.894, city: 'Warren' },
  Woodford: { lat: 42.884, lng: -73.078, city: 'Woodford' },
};

function coordsForLabel(label: string, index: number): { lat: number; lng: number; city: string } {
  const key = Object.keys(CITY_COORDS).find((k) => label.startsWith(k));
  const base = key ? CITY_COORDS[key] : { lat: 44.0, lng: -72.7, city: 'Vermont' };
  const jitter = index * 0.002;
  return { lat: base.lat + jitter, lng: base.lng + jitter * 0.5, city: base.city };
}

type Curated = { name: string; feed_url: string; external_url?: string };

const WORLD_CAM_CURATED: Curated[] = [
  { name: 'Bennington - Southwestern Vermont Medical Center', feed_url: worldcam('bennington-na-zywo.jpg') },
  { name: 'Burlington - Burlington Harbor Marina', feed_url: worldcam('burlington-cam.jpg') },
  { name: 'Burlington - Church Street', feed_url: worldcam('668d1c663f393.jpg') },
  { name: 'Burlington - Church Street Marketplace', feed_url: worldcam('668d1c14e6526.jpg') },
  { name: 'Burlington - Panoramic view (harbor)', feed_url: worldcam('burlington-panorama-kameros.jpg') },
  { name: 'Burlington - Panoramic view (Church St)', feed_url: worldcam('burlington-church-st-camera.jpg') },
  { name: 'Burlington - Patrick Leahy Burlington International Airport', feed_url: worldcam('668d1bbe1b9be.jpg') },
  { name: 'Burlington - University of Vermont', feed_url: worldcam('662261458ca44.jpg') },
  { name: 'Charlotte - Point Bay Marina', feed_url: worldcam('charlotte-point-bay-marina-live.jpg') },
  { name: 'East Burke - Burke Mountain', feed_url: worldcam('charlotte-point-bay-marina-obraz.jpg') },
  { name: 'Island Pond - Cross St', feed_url: worldcam('668d1b62e02ed.jpg') },
  { name: 'Jay - Jay Peak Resort', feed_url: worldcam('65df8eb38a709.jpg') },
  { name: 'Jericho - Nashville - Mount Mansfield', feed_url: worldcam('jericho-nashville-weather-statio.jpg') },
  { name: 'Killington Ski Resort', feed_url: worldcam('killington.jpg') },
  { name: 'Ludlow - Okemo Mountain Resort', feed_url: worldcam('67601e47ea5d9-ludlow-okemo-mountain-resort-str.jpg') },
  { name: 'Mendon - Pico Mountain Ski Resort', feed_url: worldcam('668d1b1872085-mendon-pico-mountain-ski-resort-.jpg') },
  { name: 'Mendon - Pico Ski Club', feed_url: worldcam('mendon-pico-ski-club-ip-camera.jpg') },
  { name: 'Middlebury - Middlebury College', feed_url: worldcam('668d1aefa79af.jpg') },
  { name: 'Montpelier - Vermont State House', feed_url: worldcam('montpelier-vermont-state-house-k.jpg') },
  { name: 'Newport - Lake Memphremagog', feed_url: worldcam('668d1a5ce5b74.jpg') },
  { name: 'North Hero - City Bay', feed_url: worldcam('north-hero-city-bay-obraz.jpg') },
  { name: 'Peru - Bromley Mountain', feed_url: worldcam('peru-bromley-mountain-kamerka.jpg') },
  { name: 'Quechee - VINS Nature Center - Bald Eagles nest', feed_url: worldcamDated('40346') },
  { name: 'Richmond - Bolton Valley Resort', feed_url: worldcam('bolton.jpg') },
  { name: 'Rutland - Panoramic view', feed_url: worldcam('668d1a2e876e8.jpg') },
  { name: 'Smugglers Notch', feed_url: worldcam('smugglers-notch-preview.jpg') },
  { name: 'Stowe - Spruce Peak Village', feed_url: worldcam('stowe-spruce-peak-village-kamera.jpg') },
  { name: 'Stowe - Trapp Family Lodge', feed_url: worldcam('stowe-trapp-family-lodge-webcam.jpg') },
  { name: 'Tunbridge - Farm', feed_url: worldcam('tunbridge-farma-na-zywo.jpg') },
  { name: 'Waitsfield - Great Eddy Covered Bridge, Mad River Valley', feed_url: worldcam('6388dc49ed960.jpg') },
  { name: 'Warren - Sugarbush Resort', feed_url: worldcam('warren-sugarbush-resort-kamerka.jpg') },
  { name: 'Warren Store', feed_url: worldcam('6388dc2a5efcc.jpg') },
  { name: 'Woodford - Prospect Mountain Ski Area', feed_url: worldcam('woodford-prospect-mountain-camer.jpg') },
];

const CAMSTREAMER_CAMERAS: CctvCamera[] = [
  camstreamer(
    'bTcqcQsmHOENtNR6r5bshdLwLcYV2abBDZPN5tYd',
    'Sugarbush - Mountain Live',
    44.136,
    -72.894,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'B4zWOP7M8bTjYu4g27EhjVAL9SWgFVtkx8vcUqAl',
    'Sugarbush - Gate House Plaza',
    44.147,
    -72.898,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'DhlhgO70iUnmfRQuuejOIZO59FrW09AIcUg1iNYb',
    'Sugarbush - Gadd Peak / Lincoln Peak',
    44.152,
    -72.902,
    'Warren',
    'https://www.sugarbush.com/mountain/webcams',
  ),
  camstreamer(
    'c140c59184d25e6/S-21047',
    'Killington - Snowshed Live',
    43.6045,
    -72.8201,
    'Killington',
    'https://camstreamer.com/live/stream/6467-killington-resort-snowshed-live-webcam',
  ),
  camstreamer(
    'vRodvCUPPe15UFUP4XVpIRsqRjyapa5zeRNgXFFx',
    'Stratton - Summit Cam',
    43.1122,
    -72.9064,
    'Stratton',
    'https://camstreamer.com/live/stream/411100532-summit-cam-at-stratton-mountain-resort',
  ),
  camstreamer(
    '70ccf46040b5642/S-19241',
    'Stratton - Base Cam',
    43.108,
    -72.912,
    'Stratton',
    'https://camstreamer.com/live/stream/5764-base-cam-at-stratton-mountain-resort',
  ),
  camstreamer(
    '76a10c75a4d8eee/S-16145',
    'Bolton Valley',
    44.405,
    -72.949,
    'Richmond',
    'https://camstreamer.com/live/stream/4739-bolton-valley-vermont',
  ),
  camstreamer(
    '5f68f8edaf383f3/S-47426',
    'Mad River Glen - Single Chair',
    44.1902,
    -72.8248,
    'Waitsfield',
    'https://camstreamer.com/live/stream/17598',
  ),
];

const EXTRA_CAMERAS: CctvCamera[] = [
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
  {
    id: 'vt-stowe-mountain-resort',
    lat: 44.5303,
    lng: -72.7814,
    name: 'Stowe Mountain Resort',
    city: 'Stowe',
    country: 'US',
    external_url: 'https://www.stowe.com/the-mountain/mountain-conditions/webcams.aspx',
    source: 'Stowe Mountain Resort',
  },
  {
    id: 'vt-stratton-resort',
    lat: 43.1122,
    lng: -72.9064,
    name: 'Stratton Mountain Resort',
    city: 'Stratton',
    country: 'US',
    external_url: 'https://www.stratton.com/the-mountain/webcams',
    source: 'Stratton',
  },
  {
    id: 'vt-magic-mountain',
    lat: 43.1976,
    lng: -72.7738,
    name: 'Magic Mountain',
    city: 'Londonderry',
    country: 'US',
    external_url: 'https://magicmountainresort.com/snow-report/web-cams/',
    source: 'Magic Mountain',
  },
  {
    id: 'vt-mt-snow',
    lat: 42.9583,
    lng: -72.897,
    name: 'Mount Snow',
    city: 'West Dover',
    country: 'US',
    external_url: 'https://www.mountsnow.com/the-mountain/mountain-conditions/webcams.aspx',
    source: 'Mount Snow',
  },
];

function buildWorldcamCameras(): CctvCamera[] {
  return WORLD_CAM_CURATED.map((c, i) => {
    const { lat, lng, city } = coordsForLabel(c.name, i);
    return {
      id: `vt-wc-${slug(c.name)}`,
      lat,
      lng,
      name: c.name,
      city,
      country: 'US',
      feed_url: c.feed_url,
      external_url: c.external_url ?? 'https://worldcam.eu/webcams/north-america/vermont-usa',
      source: 'WorldCam',
    };
  });
}

export async function fetchVermontCameras(): Promise<CctvCamera[]> {
  const apiKey = process.env.NEW_ENGLAND_511_API_KEY?.trim();
  const [ne511, ne511Api] = await Promise.all([
    fetchNewEngland511VermontCameras(),
    apiKey ? fetchNewEngland511ApiCameras(apiKey) : Promise.resolve([]),
  ]);
  return [
    ...buildWorldcamCameras(),
    ...CAMSTREAMER_CAMERAS,
    ...EXTRA_CAMERAS,
    ...ne511,
    ...ne511Api,
  ];
}

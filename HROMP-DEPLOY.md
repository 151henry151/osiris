# OSIRIS on hromp.com

Custom deployment of [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris) at **https://hromp.com/osiris** (use this URL without a trailing slash; Next.js `basePath` serves there).

## Changes from upstream

- `basePath` / `assetPrefix`: `/osiris`
- `src/lib/api-url.ts` — API fetches work under the subpath
- `.env` — production port **17336** and public URL
- **Default map** opens on **Vermont** (`44.0°N, 72.7°W`, zoom 7); **VERMONT** region preset in the UI
- **`src/app/api/cctv/vermont.ts`** — WorldCam, CamStreamer (Sugarbush, Killington, Stratton, Bolton, Mad River Glen), EarthCam, resort links
- **`src/app/api/cctv/new-england-511.ts`** — **~87 VTrans / I-89 / I-91 traffic cameras** via public [NEC Compass](https://nec-por.ne-compass.com/DeveloperPortal) XML + `newengland511.org/map/Cctv/GetCameraImage` (no API key required). Optional `NEW_ENGLAND_511_API_KEY` in `.env` for the REST `api/v2/get/cameras` endpoint

## Deploy / rebuild

```bash
/home/henry/webserver/scripts/deploy-osiris.sh
sudo cp /home/henry/webserver/scripts/osiris.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now osiris
sudo cp /home/henry/webserver/nginx/conf.d/00-hromp.com.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

Requires **Node 20** (`~/.nvm/versions/node/v20.20.0`).

## Verify

```bash
curl -sSI http://127.0.0.1:17336/osiris/
curl -sSI https://hromp.com/osiris
curl -sS https://hromp.com/osiris/api/health
curl -sS 'https://hromp.com/osiris/api/cctv?region=vermont' | jq '.total,.sources'
```

## New England 511 (Vermont highway cameras)

Traffic cameras are loaded automatically from the NEC Compass data portal (same source as [newengland511.org](https://newengland511.org/map)). No signup required for the default integration.

Optional REST API key (if you register at [Developer Portal](http://nec-por.ne-compass.com/DeveloperPortal)):

```bash
# In osiris/.env
NEW_ENGLAND_511_API_KEY=your_key_here
```

## Optional: RECON scanner

Set `SCANNER_URL` and `SCANNER_KEY` in `osiris/.env` (see upstream `DOCKER.md`). Without them, map layers work; RECON toolkit returns 503.

## Upstream

```bash
cd /home/henry/webserver/osiris
git pull origin master
# Re-apply hromp patches if needed, then deploy-osiris.sh
```

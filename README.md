# Aurora Nowcast

Northern lights forecast for one place, built from the sources that actually carry skill:

- **Next two hours**: the solar wind already measured 1.5 million km upstream (SOLAR-1, IMAP, ACE via NOAA), time-shifted to Earth, run through the Newell coupling function and OVATION Prime's 4-hour weighting, mapped to Kp/Hp30 with coefficients calibrated on two years of GFZ Hp30, compared with the auroral oval's equatorward edge at your magnetic local time, and gated by the substorm phase seen at Finnish IMAGE magnetometers.
- **Next three nights**: NOAA's 3-hourly Kp forecast and storm probabilities, GFZ's 72-hour ensemble, NASA DONKI CME arrival predictions (±7 h, Kp range by field orientation) and WSA-Enlil's predicted solar wind at Earth, turned into a probability per night for your latitude.

Clouds and daylight are deliberately ignored. Everything else about where the data comes from, what is predictable and what is not is in [PLAN.md](PLAN.md); the verified source notes and agent research reports are in [research/](research/).

## Run locally

```bash
npm install
npm run dev          # http://localhost:8787  (static site + /api proxy in one Node process)
npm test             # 92 offline unit tests (node:test)
npm run smoke        # pull live data and print the two-hour forecast for Copenhagen in the terminal
npm run calibrate    # refit Hp30 coefficients from GFZ + OMNI (downloads ~150 MB once, cached)
```

The dev server serves `web/` and answers `/api/*` with the same allow-listed proxy code the Cloudflare Worker runs, so the full dashboard works locally without any deployment.

## Deploy

The page is static (GitHub Pages); the Worker only proxies the handful of feeds that send no CORS headers (GFZ, FMI, IRF, Met Office, SIDC) and runs a 5-minute cron.

```bash
npm run worker:kv        # once: creates the SNAP KV namespace; paste the id into wrangler.jsonc
npm run worker:deploy    # deploys aurora-proxy to your Cloudflare account (free plan is enough)
```

Then set `apiBase` in `web/config.js` to the Worker URL. GitHub Pages deploys from `.github/workflows/pages.yml` on every push to `main`.

Optional: set `NTFY_TOPIC` in `wrangler.jsonc` to an [ntfy.sh](https://ntfy.sh) topic and the cron will push a notification when the modeled oval edge comes within view of the configured observer (`OBSERVER_LAT`/`OBSERVER_LON`).

## Layout

```
web/            static app: index.html, verify.html, src/{data,model,ui}, data/ (coefficients, AACGM grid), vendor/ (d3, topojson, land)
worker/src/     Cloudflare Worker: proxy.mjs (shared with the dev server), scheduled.mjs (cron), index.mjs
scripts/        dev-server.mjs, smoke.mjs
calibration/    Node job that fits web/data/coefficients.json from GFZ Hp30 + OMNI, plus CME Scoreboard statistics
test/           node:test suites and fixtures captured from the live feeds on 2026-09-17
research/       verified endpoint inventory, three research reports, coefficient tables
```

## Data and licences

NOAA SWPC (public domain) · NASA CCMC DONKI and iSWA (public) · GFZ Potsdam Kp/Hp30 and forecasts (CC BY 4.0, cite Matzka et al. 2021 and Yamazaki et al. 2022) · Finnish Meteorological Institute IMAGE real-time data (CC BY 4.0) · INTERMAGNET via BGS (CC BY-NC 4.0, fallback only) · UK Met Office (Crown copyright) · SIDC/ROB · Natural Earth land (public domain) · D3 (ISC).

This is a personal, non-commercial tool. INTERMAGNET data may not be used commercially without permission; drop that fallback or ask before any public or commercial deployment.

# Aurora Nowcast

Northern lights forecast for one place, built from the sources that actually carry skill:

- **Next two hours**: the solar wind already measured 1.5 million km upstream (SOLAR-1, IMAP, ACE via NOAA), time-shifted to Earth, run through the Newell coupling function and OVATION Prime's 4-hour weighting, mapped to Hp30 with a regression calibrated on two years of GFZ Hp30 and blended with the last observed Hp30 using weights and spreads fitted per lead on the same archive, compared with the auroral oval's equatorward edge at your magnetic local time (OVATION Prime, the Starkov oval, and the ring-current edge from Dst during storms), and turned into visibility tiers: camera on a dark northern horizon (edge within 8°, the Case et al. 2016 envelope), naked eye from a dark site (5°, the headline number outside the auroral zone), naked eye from a light-polluted city (3°), overhead. Outside the auroral zone the substorm phase only modulates the faint tiers; inside it the substorm section is the forecast. Local magnetometers (Tormestorp 130 km from Copenhagen, Hel, AuroraWatch UK's level) floor the tiers they already show for the next half hour, and the sky line gives sun elevation, tonight's dark window and the moon.
- **Substorms**: the twelve Finnish IMAGE magnetometers combined into the IL/IU electrojet indicators the way FMI does it, onsets by the Newell & Gjerloev criterion (provisional after 3 minutes, confirmed after 30), the latitude of the westward electrojet from the X and Z profile across the chain, the phase, the chance of the next onset from a minimal substorm model, and, for your place, whether that onset would be in your sky (onset climatology: median 23 MLT, latitude 73° − 5.2√Em) with the prime window tonight, FMI's own dB/dt aurora indicator and the nearest Tromsø Geophysical Observatory K-index. In the auroral zone (Tromsø, Lapland) this section is the forecast: the oval is overhead on most nights there and the substorm cycle decides between a faint arc and a display. See [research/substorms_auroral_zone.md](research/substorms_auroral_zone.md).
- **Next three nights**: NOAA's 3-hourly Kp forecast and storm probabilities, GFZ's 72-hour ensemble, NASA DONKI CME arrival predictions (±7 h, Kp range by field orientation) WSA-Enlil's predicted solar wind at Earth and, for the days after the Enlil run ends, the 27-day recurrence (the solar wind measured one solar rotation ago, the benchmark that matches numerical models near solar minimum, Owens et al. 2013; it replaced NASA's CLEAR ambient model, whose runs stopped on 2026-09-23), turned into a probability per night for your latitude.

Clouds are ignored; the sky line shows sun elevation, tonight's dark window and the moon. Everything else about where the data comes from, what is predictable and what is not is in [PLAN.md](PLAN.md); the verified source notes and agent research reports are in [research/](research/). Places in the picker: Nordic cities plus the auroral zone (Tromsø, Alta, Nordkapp, Abisko, Kiruna, Levi, Saariselkä, Inari, Rovaniemi) and any coordinates; picking one from the list shows it at once, Apply is for typed coordinates.

**Loading.** Every source is its own feed (`web/src/data/feeds.mjs`): it lands on its own and redraws only the sections it feeds, so a slow or failing upstream (DONKI, iSWA, a proxy route) never holds back the rest; a failed feed retries after 15 s, doubling up to its cadence, and the line above the freshness strip names what is still loading or not answering. The last data seen is kept in the browser (IndexedDB, `web/src/data/snapshot.mjs`), so a return visit draws at once while the live feeds replace it: the two-hour and substorm sections from saved data up to 45 minutes old, the three nights up to a day old.

**Verification loop.** The Worker's 5-minute job logs, for every place in `OBSERVERS`, the tier probabilities at +10, +30 and +60 min together with the observed Hp30, Dst, AuroraWatch UK's level and Tormestorp's K at that moment (KV keys `fc:YYYY-MM-DD`, kept 60 days, read back through `GET /api/trail?days=N`). The [model check](https://aurora.birovince.com/verify.html) page scores them against what followed (Hp30 exceedances, AuroraWatch levels) and against your own sighting reports: the buttons above the timeline ("Saw it by eye", "Only on camera", "Nothing") post to `/api/sighting`, guarded by the `SIGHTING_TOKEN` secret (`wrangler secret put SIGHTING_TOKEN`; the page asks for it once and remembers it). NOAA's Geospace Kp enters the blend after a linear correction refitted every 15 minutes on the last week of overlap with observed Hp30, and every ensemble member reads the propagated solar wind with its own arrival-time offset (10-minute spread), the timing error of the flat-plane L1 shift.

## Run locally

```bash
npm install
npm run dev          # http://localhost:8787  (static site + /api proxy in one Node process)
npm test             # 188 offline unit tests (node:test)
npm run smoke        # pull live data and print the two-hour forecast for Copenhagen in the terminal
npm run calibrate    # refit Hp30 coefficients, blend weights and spreads from GFZ + OMNI (downloads ~150 MB once, cached)
node calibration/hindcast.mjs 2 52.42 23   # two-year hindcast of the decision for one magnetic latitude: base rates, skill by lead, Brier, reliability
```

The dev server serves `web/` and answers `/api/*` with the same allow-listed proxy code the Cloudflare Worker runs, so the full dashboard works locally without any deployment.

## Deploy

Production is **https://aurora.birovince.com**: one Cloudflare Worker (`aurora-proxy`, free plan) serves `web/` as static assets, answers `/api/*` for the feeds that send no CORS headers (GFZ, FMI, IRF Kiruna and Tormestorp, TGO, Met Office, SIDC) with edge caching, and runs a 5-minute cron. The custom domain is declared in `wrangler.jsonc` (`routes` with `custom_domain: true`), so `wrangler deploy` creates the DNS record and certificate itself. The same build is also reachable at `aurora-proxy.birovince.workers.dev`, and GitHub Pages (`https://codingbiro.github.io/aurora/`, deployed by `.github/workflows/pages.yml`) keeps working as a mirror that calls the workers.dev proxy.

```bash
npm run worker:kv        # once: creates the SNAP KV namespace; paste the id into wrangler.jsonc
npm run worker:deploy    # uploads assets + Worker, (re)creates the custom domain and cron trigger
```

**Push to deploy.** `.github/workflows/deploy.yml` runs on every push to `main`: the tests first, then, only if they pass, the Worker with `wrangler deploy` and the GitHub Pages mirror. The Worker step needs one repository secret, a Cloudflare API token made from the "Edit Cloudflare Workers" template (`gh secret set CLOUDFLARE_API_TOKEN`); until it is set the step is skipped with a notice and `npm run worker:deploy` deploys by hand. Other branches and pull requests run the tests (`test.yml`).

`web/config.js` picks the API origin: same origin on localhost, the custom domain and workers.dev; the workers.dev proxy from anywhere else.

The scheduled job can also be run on demand: `GET /api/cron` with `Authorization: Bearer <CRON_TOKEN>` (secret set with `wrangler secret put CRON_TOKEN`; the token only counts in that header). It is skipped when the 5-minute Cloudflare cron ran less than 4 minutes earlier (add `?force=1` to run it anyway), so `.github/workflows/cron.yml`, which calls it at :07 and :37 as a safety net, never races the cron; that workflow fails when the Worker errors. Each run writes two KV values (the latest state with the 6-hour driving history, and the day's forecast log, appended as text), about 576 writes a day against the free plan's 1,000; alerts go out before the log is written and are claimed in KV first, so a full quota or an overlapping run can cost the log but never an alert, and a stalled solar-wind feed never alerts. `/api/state` carries only the delivery outcome of an alert (channel, ok, status), not the upstream replies, which name the ntfy topic.

### Alerts

Channels, all optional and used together when several are set: **ntfy** (topic per place or the `NTFY_TOPIC` secret; on ntfy.sh this needs a paid tier, because free accounts are metered per IP and Cloudflare's egress IPs are shared), **Telegram** (`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets, free), or a **Slack/Discord incoming webhook** (`ALERT_WEBHOOK_URL` secret). An alert counts as delivered when at least one channel accepts it.


The cron evaluates every place listed under `OBSERVERS` in `wrangler.jsonc` and posts to [ntfy.sh](https://ntfy.sh) when the modeled oval comes within view. Each entry takes `name`, `lat`, `lon`, and optionally `alertOn` (`horizon` = edge within 8° so visible low in the north, the default; `overhead`), `minKpLead` (alert only when the Kp expected within the next hour is at least this) and `topic` (a per-place ntfy topic). The default topic is the `NTFY_TOPIC` secret (`wrangler secret put NTFY_TOPIC`); alerts are off while it is empty. **An ntfy access token is required in practice**: ntfy.sh meters anonymous publishing per client IP, and Cloudflare's shared egress IPs exhaust that quota (429 "daily message quota reached"), so create a free ntfy.sh account, make an access token and store it with `wrangler secret put NTFY_TOKEN`. `NTFY_SERVER` (optional var) points at a self-hosted ntfy instead. Alternatively set the `NTFY_PROXY` secret to an HTTP proxy URL (`http://user:pass@host:port`): the Worker then sends its ntfy publishes through that proxy over a TCP socket as plain HTTP (ntfy.sh accepts it; TLS inside the tunnel is not available to Workers), so ntfy meters the proxy's address. The ntfy account token is never sent on that unencrypted leg, and alert texts contain nothing sensitive. `GET /api/cron?test=1` sends a test message to every place and returns ntfy's answer; the last failure is kept in KV under `notify:lasterror`. At most one alert per place every two hours. Example:

```jsonc
"OBSERVERS": [
  { "name": "Copenhagen", "lat": 55.676, "lon": 12.568, "alertOn": "horizon", "minKpLead": 0 },
  { "name": "Tromsø", "lat": 69.649, "lon": 18.956, "alertOn": "overhead", "minKpLead": 2 }
]
```

Redeploy after editing (`npm run worker:deploy`). The place shown in the dashboard is separate: it is chosen in the page and remembered per browser, or given in the link as `?lat=69.649&lon=18.956`.

## Layout

```
web/            static app: index.html, verify.html, src/{data,model,ui}, data/ (coefficients, AACGM grid), vendor/ (d3, topojson, land)
                model/electrojet.mjs: chain baselines, IL/IU/IE, onset criterion, electrojet location; model/substorm.mjs: phase, hazard, onset climatology, observer outlook
worker/src/     Cloudflare Worker: proxy.mjs (shared with the dev server), scheduled.mjs (cron), index.mjs
scripts/        dev-server.mjs, smoke.mjs
calibration/    Node job that fits web/data/coefficients.json from GFZ Hp30 + OMNI, plus CME Scoreboard statistics
test/           node:test suites and fixtures captured from the live feeds on 2026-09-17, plus the IMAGE chain and FMI IE index for the 2026-08-18 substorm
research/       verified endpoint inventory, research reports (sources, models, substorms), coefficient tables
```

## Data and licences

NOAA SWPC (public domain) · NASA CCMC DONKI and iSWA (public) · GFZ Potsdam Kp/Hp30 and forecasts (CC BY 4.0, cite Matzka et al. 2021 and Yamazaki et al. 2022) · Finnish Meteorological Institute IMAGE real-time data (CC BY 4.0; the archived chain day used in tests follows the IMAGE rules of the road, cite Tanskanen 2009) · Tromsø Geophysical Observatory, UiT, provisional K-indices · Swedish Institute of Space Physics, Tormestorp and Kiruna provisional data (no licence stated; personal use) · AuroraWatch UK, Lancaster University (API, attribution) · World Data Center for Geomagnetism Kyoto, Dst via NOAA · INTERMAGNET via BGS (CC BY-NC 4.0: Hel minute data and the NUR/HRN fallback) · UK Met Office (Crown copyright) · SIDC/ROB · Natural Earth land (public domain) · D3 (ISC).

This is a personal, non-commercial tool. INTERMAGNET data may not be used commercially without permission; drop that fallback or ask before any public or commercial deployment.

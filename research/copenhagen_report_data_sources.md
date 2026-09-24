<!-- Research report produced by a background research agent on 2026-09-24 for the Copenhagen short-term efficacy audit; every item marked verified was fetched that day. Consolidated in copenhagen_short_term_efficacy.md. -->
# Mid-latitude ground observations for a Copenhagen aurora nowcast (agent B3)

Audit date: 2026-09-24 (UTC). Observer: Copenhagen 55.68N 12.57E, MLAT ~52.4.
Method: every endpoint below was fetched with curl (status, Last-Modified, latest data timestamp, CORS via `Origin:` header) and/or WebFetch. Items not verified are marked UNVERIFIED.

## 1a. IRF Tormestorp (LND) 1-s variometer CSV — VERIFIED LIVE

- URL fetched: https://www2.irf.se/maggraphs/tormestorp/2026/09/24/lnd_20260924000000.csv (pattern `.../tormestorp/YYYY/MM/DD/lnd_YYYYMMDD000000.csv`)
- HTTP 200, `Content-Type: text/csv`, `Last-Modified: Thu, 24 Sep 2026 17:33:13 GMT`, file 2.56 MB at 17:33 UT (grows ~3.6 MB/day; no gzip offered).
- Latest data row `2026-09-24T17:33:22` fetched at 17:33:39 UT → **latency ~17 s** (file is appended roughly every 10-20 s).
- Format sample (ISO UTC time, c1, c2, c3; no header; 1 Hz):
  ```
  2026-09-24T00:00:00,128.61,499.83,471.98
  2026-09-24T17:33:22,78.84,494.98,501.68
  ```
  Values are variometer deviations in nT (hundreds of nT baseline offset, not the ~17,000 nT absolute H), so only *changes* are meaningful; over today c1 (X/H-like) drifted 128→79 nT and c3 (Z-like) 472→502 nT (diurnal Sq + the mild activity AuroraWatch UK flagged yellow 07-11 UT). Component labelling (c1=X? c2=Y? c3=Z?) is NOT documented in the file — see page notes below.
- CORS: `Access-Control-Allow-Origin: https://www3.irf.se` (fixed, not `*`) → a browser dashboard on another origin cannot fetch it directly; needs a server-side proxy/edge function. `Access-Control-Allow-Credentials: true`.
- Licence: see 1a-notes below (fetched separately).
- What it gives: the closest (~130 km NE of Copenhagen, MLAT ~53) 1-s magnetometer; a negative X bay here means the westward electrojet has expanded to within a few degrees of the observer's own latitude.

## 1e. AuroraWatch UK API (Lancaster) — VERIFIED LIVE, CORS `*`

- URLs fetched: https://aurorawatch-api.lancs.ac.uk/0.2/status/current-status.xml (HTTP 200, 462 B, `last-modified` 17:33:35, `cache-control: max-age=180`), https://aurorawatch-api.lancs.ac.uk/0.2/status/alerting-site-activity.xml (HTTP 200, 3.1 kB), https://aurorawatch-api.lancs.ac.uk/0.2/ (directory index).
- `updated` = 2026-09-24T17:33:31Z at 17:33:41 fetch → status recomputed every ~3 min (nginx cache 180 s).
- CORS: `access-control-allow-origin: *`, methods GET/POST/OPTIONS → directly fetchable from the browser.
- Format (XML, api_version 0.2.5): thresholds green 0 / yellow 50 / amber 100 / red 200 nT; 24 hourly `<activity status_id=.. ><datetime/><value/>` records for the alerting site `site:AWN:SUM` (a summary/combination site). Today: 17.6-62.2 nT, yellow 07-11 UT.
- Hourly activity value = the hourly range/deviation of H from the quiet-day curve (see 1e-notes on the definition).

### 1a-notes: IRF maggraphs index page and Tormestorp directory (fetched 17:34 UT)
- https://www2.irf.se/maggraphs/ HTTP 200. The "[Technical problems with Tormestorp Magnetometer. Troubleshooting in progress]" text is still in the HTML source but **inside an HTML comment** (`<!--<font color="red">…</font>-->`, line 375), i.e. NOT displayed; likewise the "No realtime uppdates and archive due to disk problems" line (361) is commented out. The Tormestorp feed is therefore considered healthy by IRF and the data confirm it.
- https://www2.irf.se/maggraphs/tormestorp/ (Apache index, HTTP 200) exposes extra real-time products:
  - `kindex_realtime.txt` (21 B): `2026-09-24T15:00:00,1` = K for the current 3-h block (updated every ~2 min; mtime 19:32 CEST).
  - `get_kindex_tormestorp.php`: today's eight K values `2 2 2 3 3 _ _ _`.
  - `comprehensive.txt` (43 kB): daily K[8]+sum since 2018-02-07 (`YYYYMMDD K[8] Sum`) → free climatology for a Tormestorp-K threshold.
  - `quiet_day_ascii` (5.6 kB, 10-min steps `HHMMSS c1 c2 c3`, e.g. `000000 112.54 499.63 475.17`): the quiet-day curve in the same units/baseline as the 1-s CSV → the dashboard can compute ΔX = c1 − Sq directly.
  - `todayyesterday.csv` (5.8 MB, 1-s, 48 h) and `iaga2002/` archive; `2026/09/24/` also has PNG/SVGZ plots incl. `_fmi_fluctuation` and `harmonicfit`.
  - `latest_quiest_days*`, `kindex_timestamp.txt` (535 kB).
- Licence: no licence/copyright text on the maggraphs page (grep for licen|copyright|creative|terms = nothing). IRF terms UNVERIFIED here — see IRF data-policy search below.
- Also confirmed on the same page: Kiruna real-time text feeds (`rt1hour_secondary.txt`, `rt_iaga_last_hour_secondary.txt`, `rt_iaga_last_hour_1sec_secondary.txt`, `rt_last_hour_1sec_primary.csv` …), which the dashboard already uses; "primary DTU magnetometer (suspended)".

## 1c. INTERMAGNET GIN (BGS) — VERIFIED; CORS `*`; UK data embargoed, continental data 4-40 min behind

- Lag query (HTTP 200, JSON, one observatory per request because an unknown code such as TAR or SOL makes the whole request fail with HTTP 400 "Unable to find observatory"): `https://imag-data.bgs.ac.uk/GIN_V1/GINServices?Request=GetDataLagTime&format=json&observatoryIagaCodeList=<CODE>&dataStartDate=2026-09-24&dataDuration=1`. Lag values are in **milliseconds**; today's min / average / max:

| IAGA | site (lat) | min | avg | max | note |
|---|---|---|---|---|---|
| ESK | Eskdalemuir 55.3N | 12 s | 2.1 min | 5.4 min | arrives fast, but **embargoed** (see below) |
| HAD | Hartland 51.0N | 16 s | 2.0 min | 5.5 min | embargoed |
| LER | Lerwick 60.1N | 22 s | 2.0 min | 5.7 min | embargoed |
| HLP | Hel 54.6N 18.8E | 2.4 min | 6.0 min | 11 min | **best continental feed for Copenhagen** (MLAT ~51, 1 h MLT east) |
| BEL | Belsk 51.8N 20.8E | 4 min | 6.5 min | 8 min | |
| NUR | Nurmijärvi 60.5N | 2.1 min | 4.8 min | 7.7 min | |
| DOU | Dourbes 50.1N 4.6E | 1 min | 5.7 min | 11 min | |
| MAB | Manhay 50.3N 5.7E | 1 min | 5.8 min | 10.6 min | |
| NGK | Niemegk 52.1N 12.7E | 3 min | 20.6 min | 2.8 h | same longitude as Copenhagen, 3.6° south |
| WNG | Wingst 53.7N 9.1E | 3 min | 28.8 min | 2.8 h | 250 km SW of Copenhagen |
| KIR | Kiruna | 3.4 min | 10.5 min | 70 min | |
| UPS / ABK / LYC / SOD | Sweden/Finland (SGU/IRF/SGO) | 3-4 min | 32-34 min | 62-66 min | hourly batches |
| CLF | Chambon-la-Forêt | 12 min | 25 min | 75 min | |
| BDV | Budkov | 2.5 h | 2.9 h | 3.4 h | |
| BFE | Brorfelde 55.6N 11.7E | lag = 451,785,665 s ≈ **14.3 years** | | | **dead in GIN** (nothing since ~2012) |

- GetData test 17:36:33 UT, `Request=GetData&format=json&testObsys=0&observatoryIagaCode=<C>&samplesPerDay=minute&publicationState=adj-or-rep&dataStartDate=2026-09-24&dataDuration=1&orientation=Native`, all HTTP 200 with `access-control-allow-origin: *`; JSON keys `datetime,S,X,Y,Z` (1440 rows for the day, nulls for the future) + `@info` metadata:
  - WNG last non-null 17:14 (22 min old), NGK 17:24 (12 min), HLP 17:32 (4.5 min, X null but Y/Z present in newest row), BEL 17:32 (4.5 min), DOU 17:29 (7.5 min), NUR 17:31 (5.5 min), UPS 16:59 (37 min).
  - ESK, HAD, LER: 1440 rows, **all null**, `"embargo_applied": true` → BGS UK observatories are not real-time on the GIN (embargo length measured below).
- Format sample (WNG, adjusted, HDZ reported / XYZ served): `2026-09-24T17:14:00.000Z  S=50115.29 X=18146.45 Y=1320.27 Z=46695.84` (nT, absolute).
- BGS UK observatories on the GIN: `embargo_applied: true` for every day from today back to 10 days ago (all-null rows, `data_type: reported`); from 11 days back the flag is false but `best-avail` returns **zero rows** for ESK on 2026-09-13, -11, -04, 08-20 and 07-26 (data_type quasi-def), i.e. no 1-min ESK data are publicly served for at least the last 60 days. Reason UNVERIFIED (BGS distributes its own observatories via its own services), but the conclusion is firm: ESK/HAD/LER are not a real-time source through the GIN.
- HAPI: `https://imag-data.bgs.ac.uk/GIN_V1/hapi/catalog` HTTP 200, CORS `*`, 3074 dataset ids of the form `<obs>/<adjusted|quasi-def|definitive|reported|best-avail>/<PT1M|PT1S>/<native|xyzf|hdzf|diff>`; `info?id=hlp/best-avail/PT1M/xyzf` describes `Time` + `Field_Vector[3]` (X,Y,Z nT, fill 99999) + `Field_Magnitude`. `data?…time.max=<future or now>` returned HAPI error 1405 "time outside valid range" (see startDate/stopDate check below) — the GINServices GetData call is the reliable near-real-time route.
- Licence: the INTERMAGNET data licence text was not on the GIN landing page (https://imag-data.bgs.ac.uk/GIN_V1/ HTTP 200 lists GINForms2, GINStatistics, HAPI). INTERMAGNET data are CC BY-NC 4.0 (checked separately below).

## 1b. DTU Space Brorfelde (BFE) via TGO K-index text — VERIFIED (3-hourly K only)

- URL: https://flux.phys.uit.no/Kindice/k_bfe6d.txt HTTP 200, `Content-Type: text/plain`, `Last-Modified: Thu, 24 Sep 2026 15:17:01 GMT` (i.e. the 12-15 UT block was posted 17 min after it ended). No `Access-Control-Allow-Origin` header → proxy needed.
- Format (7 days, provisional, two groups of four 3-h K values per line):
  ```
  K-Indices for Brorfelde

  23 sep. 2026 0110 1122
  24 sep. 2026 2223 4xxx
  ```
  → today 00-03:2, 03-06:2, 06-09:2, 09-12:3, 12-15:4.
- Index page https://flux.phys.uit.no/Kindice/ (HTTP 200): "Provisional K-indices – last seven days" for Ny-Ålesund, Bjørnøya, Tromsø, Andenes, Leirvogur, Dombås, Brorfelde (files `k_nal1a.txt, k_bjn1a.txt, k_tro2a.txt, k_and1a.txt, k_lrv1a.txt, k_dob1a.txt, k_bfe6d.txt`), plus `kindex-mapview.html` and a manual at `Kindice/Manual/index.html`.
- The 1-min/1-s BFE data behind TGO's `cgi-bin/mkascii.cgi` need a password (already documented in research/sources_european_ground_and_gfz.md); BFE on the INTERMAGNET GIN is dead (14.3-year lag). So Brorfelde is only usable as a **3-hourly K with ~15-20 min posting delay**, i.e. a confirmation, not a nowcast.
- K9 lower limit for Brorfelde: see GFZ table below.

## 4. Latency of the solar-wind / index feeds the dashboard already uses (measured 17:35:17 UT)

| feed | newest time_tag | Last-Modified | lag at fetch | CORS |
|---|---|---|---|---|
| `json/rtsw/rtsw_mag_1m.json` (1.4 MB, source SOLAR1 active, ACE/IMAP present) | 17:28:00 | 17:32:24 | 7.3 min (file rebuilt every ~4-5 min, `max-age=60`) | `*` |
| `json/rtsw/rtsw_wind_1m.json` | 17:27:00 | 17:32:24 | 8.3 min | `*` |
| `products/geospace/propagated-solar-wind-1-hour.json` | 17:24:00 (propagated_time_tag 18:22:39) | 17:32:10 | 11.3 min | `*` |
| `json/planetary_k_index_1m.json` (estimated_kp, 1-min) | 17:27:00 (Kp est 2.0) | 17:29:46 | 8.3 min | `*` |
| `products/noaa-planetary-k-index.json` (3-h) | 12:00 block (Kp 3.67) | 17:34:12 | block-based | `*` |
| GFZ `kp.gfz.de/app/files/Hp30_ap30_nowcast.txt` (CC BY 4.0 in header) | 17.0 (17:00-17:30 interval) Hp30 2.000 ap30 7 | 17:27:43 | the 17:00-17:30 value was published at 17:27:43, i.e. **~2 min before the interval closed** (computed from partial data; may be revised) | none (no ACAO) |
| GFZ `kp.gfz.de/app/json/?start=…&end=…&index=Hp30&status=all` | 17:00 → 2.0 (at 17:36:43) | — | same | none |
| `products/solar-wind/mag-5-minute.json` | HTTP 404 | | | |

- Verdict: the raw RTSW files are ~4 min fresher than the propagated product (17:28 vs 17:24 at the same fetch), but both are batch-rebuilt on a ~4-5 min cycle; nothing on services.swpc.noaa.gov beats the raw RTSW json for L1 latency. NOAA's 1-min estimated Kp (`planetary_k_index_1m.json`) is a real 1-min nowcast with ~3-8 min lag.
- FMI: `https://space.fmi.fi/image/realtime/IL/` → HTTP 404; the IL/IE index is not exposed as a real-time file on that path. FMI R-index page https://space.fmi.fi/image/realtime/SSA/r-index/ (HTTP 200) is a Plotly page driven by `js/rindex.js` loading `*_en.json` / `map-en-esa.json` (details below).

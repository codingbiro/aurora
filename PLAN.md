# Aurora Dashboard — Plan

Two forecasts for one observer location, ignoring weather and daylight:

| Panel | Horizon | Question it answers | Refresh |
|---|---|---|---|
| Short-term | 10 to 120 min | Will aurora be visible from here in the next two hours, and when? | every 60 s |
| Long-term | 1 to 3 days | Which of the next three nights is worth planning for? | every 15 min |

Every source below was fetched and inspected on 2026-09-17 (13:00 to 14:40 UTC). CORS was tested by sending an `Origin` header and checking `Access-Control-Allow-Origin`. Nothing here is from memory.

## 1. What is physically predictable (sets the design)

| Link in the chain | Best lead time | Skill | Consequence for the dashboard |
|---|---|---|---|
| CME launch to Earth arrival | 1 to 4 days | arrival ±7 h (DONKI's own stated error); Bz inside the CME unknown | long-term panel is probabilistic: arrival windows and Kp ranges, never a point forecast |
| Solar wind at L1 to Earth | 30 to 88 min (median 56 min measured today from NOAA's propagated series) | high | the first ~50 min of the short-term panel are "already measured", only the transit remains |
| Driving to oval size and hemispheric power | 0 to 60 min | good (OVATION Prime, correlations ~0.7 to 0.8) | boundary latitude vs observer latitude is the core short-term quantity |
| Substorm onset timing | minutes | unsolved; only statistics | onset is detected from ground magnetometers and forecast as a hazard rate, never as a time |

So the short-term panel = measured-and-in-transit solar wind (deterministic part) + a 30 to 70 min extrapolation (probabilistic part) + a substorm state machine. The long-term panel = NOAA/GFZ Kp forecasts + CME arrival predictions with their explicit Kp-range scenarios + high-speed-stream timing from WSA-Enlil.

## 2. Data sources

### 2.1 Tier 1: browser can fetch directly (CORS `*`)

All NOAA SWPC files are US public domain, regenerated every minute (`Cache-Control: max-age=60`), and answered in 50 to 400 ms.

| # | Source | URL (services.swpc.noaa.gov unless noted) | Gives | Cadence / latency measured | Window | Panel |
|---|---|---|---|---|---|---|
| 1 | NOAA propagated solar wind, 1 h | `products/geospace/propagated-solar-wind-1-hour.json` (6.5 KB) | Bz, By, Bx, Bt, speed, density, temperature, vx/vy/vz with **Earth arrival time** (`propagated_time_tag`) | 1 min; arrival stamps run 30 to 88 min ahead of now | last hour | ST core |
| 2 | NOAA propagated solar wind, 7 d | `products/geospace/propagated-solar-wind.json` (1.2 MB) | same, 7 days | fetch once at load, then merge #1 | 7 d | ST history, calibration |
| 3 | NOAA RTSW raw L1 mag | `json/rtsw/rtsw_mag_1m.json` (1.4 MB) | per-spacecraft IMF in GSE and GSM; `source` (SOLAR1 active today; IMAP, ACE present), `active`, quality flags | 1 min; ~5 min behind real time | 24 h | ST status strip (which spacecraft, data quality) |
| 4 | NOAA RTSW raw L1 plasma | `json/rtsw/rtsw_wind_1m.json` (2.5 MB) | proton speed/density/temperature/velocity vector per spacecraft | 1 min; ~5 min | 24 h | ST status strip |
| 5 | NOAA RTSW ephemerides | `json/rtsw/rtsw_ephemerides_1h.json` | spacecraft positions (SOLAR-1 at x ≈ 1.57 million km GSE) | hourly | 30 d | propagation cross-check |
| 6 | NOAA Geospace model Kp | `json/geospace/geospace_pred_est_kp_1_hour.json` (+ `geospce_pred_est_kp_7_day.json`, typo is real) | modeled Kp, 1-min, extends 25 to 45 min into the future | 1 min | 1 h / 7 d | ST second opinion |
| 7 | NOAA Geospace model Dst | `json/geospace/geospace_dst_1_hour.json` (+ 7-day) | modeled Dst | 1 min | 1 h / 7 d | ST context |
| 8 | OVATION Prime raw output | `text/ovation_latest_aurora_n.txt` (and `_s`) | 96 MLT × 80 MLAT (50 to 89.5°, 0.5° steps) energy flux erg/cm²/s for diffuse, mono, wave, ion aurora; header: hemispheric power (GW) and "Forecast Kp" | 5 min; forecast time ≈ obs + 60 min | current run | ST core (boundary at observer's MLT) |
| 9 | OVATION geographic grid | `json/ovation_aurora_latest.json` (0.9 MB) | 360×181 grid, NOAA aurora index 0 to 100, observation + forecast time | 5 min | current run | ST map |
| 10 | Hemispheric power | `text/aurora-nowcast-hemi-power.txt` | north/south HP (GW) per 5 min | 5 min | today | ST trend |
| 11 | Estimated Kp, 1-min | `json/planetary_k_index_1m.json` | `estimated_kp`, `kp_index` | 1 min; 6 min behind | 6 h | ST observed anchor |
| 12 | Kp 3-h | `products/noaa-planetary-k-index.json` | Kp, running a, station count | 3 h | 7 d | both |
| 13 | Kp forecast | `products/noaa-planetary-k-index-forecast.json` | 3-h Kp labelled observed / estimated / predicted, `noaa_scale` | updated at 00:30 and 12:30 UTC (3-day forecast) and ~22:05 UTC | 7 d back, to end of day 3 | LT core |
| 14 | NOAA scales | `products/noaa-scales.json` | G/S/R scale now, plus predicted G for today, +1, +2 | 1 min | 3 d | LT header |
| 15 | 3-day geomagnetic forecast | `text/3-day-geomag-forecast.txt` | predicted Ap; **probabilities per day of Active / Minor / Moderate / Strong-Extreme storm**; 3-h Kp table | daily 22:05 UTC | 3 d | LT core |
| 16 | 3-day forecast + discussion | `text/3-day-forecast.txt`, `text/discussion.txt` | Kp table with G tags; forecaster rationale ("Solar Wind .Forecast", "Geospace .Forecast") | 00:30, 12:30 UTC | 3 d | LT text |
| 17 | 27-day outlook, 45-day Ap | `text/27-day-outlook.txt`, `json/45-day-forecast.json` | daily F10.7, Ap, max Kp | weekly (Mon) / daily 00:00 UTC | 27 / 45 d | LT recurrence tail |
| 18 | WSA-Enlil at Earth | `json/enlil_time_series.json` (1.6 MB) | predicted density, temperature, v_r, v_theta, v_phi, B_r, B_theta, B_phi, polarity, **cloud** (CME ejecta tracer) at Earth | ~2.3 min steps; content changes a few times per day | run start −5 d to **+48 h** | LT core (HSS ramps, CME cloud arrival) |
| 19 | Alerts, warnings, watches | `products/alerts.json` | messages; codes `WATA20/30/50/99` = G1 to G4 watch by day, `WARK04..09` warnings, `ALTK04..09` alerts, `ALTTP2` type II radio sweep (CME shock signature) | 1 min | 30 d | both |
| 20 | GOES X-rays, flares | `json/goes/primary/xrays-1-day.json`, `xray-flares-7-day.json`, `xray-flares-latest.json` | 1-min flux in two bands; flare list with class and times | 1 min / event | 1 d / 7 d | LT precursors |
| 21 | Kyoto Dst | `products/kyoto-dst.json` | hourly Dst | hourly | 7 d | context |
| 22 | NASA DONKI (keyless host) | `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=…&endDate=…` (also `WSAEnlilSimulations`, `GST`, `FLR`, `notifications?type=CME`) | analysed CMEs with nested WSA-Enlil runs: `estimatedShockArrivalTime` (stated ±7 h), `isEarthGB` (glancing), `isEarthMinorImpact`, `estimatedDuration`, `rmin_re`, **`kp_90`, `kp_135`, `kp_180`** = max Kp if the CME field points west / south-west / south (`kp_18` is always null) | event-based; median 6.6 h from CME onset to Enlil run, p25 3.7 h | any range | LT core |
| 23 | CCMC CME Scoreboard | `https://kauai.ccmc.gsfc.nasa.gov/CMEscoreboard/WS/get/predictions` (7 MB) | per-CME predictions from ~10 agencies and observed arrivals: error statistics | retrospective; no pending CMEs seen | 2013 to now | LT error bars (cache in proxy) |
| 24 | iSWA HAPI | `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=…&time.min=…&time.max=…&format=json` | `gfz_obs_geo_30m_indices` (GFZ **Hp30**, ~50 min behind GFZ's own feed), `GFZ_Indices_P3H` (Kp), `NOAA_KP_P3H`, `CLEAR_daily_forecast_sw_P1H` (ambient solar wind forecast at Earth, hourly, to +5.5 d, includes bz), `swpc_27day` | 30 min / 3 h / hourly | ≤31 d per call | ST anchor fallback, LT HSS second opinion |
| 25 | INTERMAGNET GIN HAPI (BGS) | `https://imag-data.bgs.ac.uk/GIN_V1/hapi/data?id=nur/best-avail/PT1M/xyzf&time.min=…&time.max=…` | 1-min X, Y, Z, F per observatory. Lags measured: NUR (Nurmijärvi) 4 min, HRN (Hornsund) 4 min, NAQ/THL/GDH (Greenland) 13 min; ABK, KIR, SOD 20 to 32 min; BFE (Brorfelde) dead; LER/ESK embargoed 10 days | 1 min | ≤366 d | ST substorm fallback. **CC BY-NC 4.0** |

### 2.2 Tier 2: needs the proxy (no CORS header)

| # | Source | URL | Gives | Cadence / latency measured | License | Panel |
|---|---|---|---|---|---|---|
| 26 | **GFZ Hp30 / ap30 / Kp nowcast** | `https://kp.gfz.de/app/json/?start=<ISO>&end=<ISO>&index=Hp30` (also `Hp60`, `ap30`, `Kp`, `ap`) | 30-min open-ended activity index; running-interval Kp with `status: pre` | 30 min; **published within ~60 s of interval end** (14:00–14:30 value present at 14:30:32 UTC); 1 year = one 0.5 s call | CC BY 4.0 | ST primary observed anchor; calibration target |
| 27 | **GFZ Hpo forecast (ISDC)** | `https://isdc-data.gfz.de/geomagnetism/HpoForecast/v0102/output/Hpo/json/hpo_forecast_{aceprop,enlil,swpc,mean,mean_bars}_{Hp30,Hp60,Kp}.json` | Hp30 forecast per half-hour, 3 days; drivers: L1 propagation (`aceprop`), Enlil, SWPC; `mean_bars` gives MEDIAN and MAX | hourly at ~:02 | GFZ, attribution (license not stated on files) | ST (+30 to +120 min) and LT |
| 28 | **GFZ SWIFT/PAGER ensemble** | `https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.json`, `…/hp60_…`, `https://spaceweather.gfz.de/fileadmin/Kp-Forecast/CSV/kp_product_file_FORECAST_PAGER_SWIFT_LAST.json` | 72 h ensemble: min, quartiles, median, max, **P(Kp 4–5), P(5–6), P(6–7), P(7–8), P(≥8)**, members | ~3-hourly, was 2.5 h old when fetched | GFZ, attribution | LT ensemble vs NOAA |
| 29 | **FMI IMAGE real-time magnetometers** | `https://space.fmi.fi/image/realtime/UT/<STN>/<STN>data_01.txt` (1 h) and `…data_24.txt` (24 h); stations KEV MAS KIL IVA MUO PEL RAN OUJ MEK HAN NUR TAR (58 to 70°N) | 10-s X, Y, Z (nT); `99999.9` missing | **35 to 60 s** latency, refreshed every minute | CC BY 4.0 (FMI stations); SOD excluded | ST substorm detector (primary) |
| 30 | IRF Kiruna secondary magnetometer | `https://www2.irf.se/maggraphs/rt_iaga_last_hour_secondary.txt` (1-min IAGA-2002), `rt1hour_secondary.txt` (1-s) | Kiruna X, Y, Z | 2 to 4 min; files rewritten ~every 10 min | not stated ("IMAGE rules of the road") | ST extra auroral-zone station |
| 31 | iSWA WSA-Enlil+Cone Earth timelines | `https://iswa.gsfc.nasa.gov/iswa_data_tree/model/heliosphere/wsa-enlil-cone/{velocity-density-timeline-DATA,KP-DATA}/YYYY/MM/<run>_2.0_ENLIL_{time_line,Kp_timeline}.dat` | per-run B, V, n, T and Kp_90/135/180 at Earth, ~6-min steps, to +9 d | per CME run | NASA research product | LT: plot the run behind each DONKI arrival |
| 32 | UK Met Office overview | `https://data.consumer-digital.api.metoffice.gov.uk/v1/space-weather/forecast-overview` | 4-day prose with Kp in words | ~2×/day | Crown copyright; undocumented endpoint | LT agreement indicator |
| 33 | SIDC (Belgium) URSIGRAM | `https://www.sidc.be/spaceweatherservices/managed/services/archive/product/meu/latest` | daily Ap for today/+1/+2, categorical geomagnetism, CME prose | daily ~12:30 UTC | ROB attribution | LT agreement indicator |

### 2.3 Checked and rejected

| Source | Why not |
|---|---|
| NOAA `products/solar-wind/*.json` (mag/plasma 1-day, 7-day…) | **Removed ~30 Apr 2026** (Service Change Notice 26-21). DSCOVR retired; ACE programmatic support ended 30 Jun 2026 (SCN 26-66). SOLAR-1 (ex SWFO-L1) is the active source, IMAP the backup. |
| SuperMAG SML/SMU | login required, no real-time (holdings ~1 year behind), no redistribution |
| Kyoto real-time AE/AL | digital files 11 days behind; only PNG in real time |
| Tromsø Geophysical Observatory magnetograms | data CGI is password-protected; only 3-hourly K-index text and images are open |
| DTU Space (Brorfelde, Greenland) | no numeric real-time endpoint; BFE dead in INTERMAGNET; Greenland stations via INTERMAGNET at 13 min lag |
| Sodankylä SGO 10-s files | licence forbids non-academic use without written permission |
| ESA SWE network, IRF Lund | login wall / unreachable |
| BoM (Australia) API | key would be exposed in the browser; regional indices only |
| `api.nasa.gov` DONKI | rate-limited keys; use the keyless kauai host instead |
| Claude Artifact hosting | artifact pages block **all** outbound fetch/XHR, so a live dashboard cannot run there |

## 3. Short-term model (10 to 120 min)

Runs in the browser every minute. Constants are in §6.

1. **Ingest** #1 (+#2 at load). Index by Earth arrival time. Three zones: arrived (past), in transit (measured at L1, arrives in the next 30 to 88 min), beyond (extrapolated). NOAA propagates to 32 R_E, so add ≈5 min for the remaining distance to the magnetopause.
2. **Coupling** per minute: Newell `dΦ/dt = v^(4/3) · Bt^(2/3) · sin^(8/3)(θc/2)` with GSM By, Bz; Newell's viscous term `√n · v²`; Akasofu power `v · B² · sin⁴(θc/2)` for the substorm loading integral.
3. **Integrated driving**: OVATION's own scheme, hourly means of the current and three preceding hours weighted 1, 0.65, 0.42, 0.27, evaluated at each horizon h ∈ {10, 20, …, 120} min. For h beyond the transit zone, extrapolate the coupling with persistence decaying toward the 3-h mean, and take the uncertainty from the empirical distribution of coupling changes over lag h in the last 7 days (analog ensemble, ~200 members).
4. **Activity mapping**: Kp(h) from the Newell 2008 regression as the day-1 model; Hp30(h) from our own fit (GFZ Hp30 history as target, OMNI 1-min as input, refit nightly). Blend with the NOAA Geospace Kp (#6) for h ≤ 45 min and the GFZ `aceprop` Hp30 forecast (#27) for h ≥ 30 min. Show the observed anchors: GFZ Hp30 (#26), NOAA estimated Kp (#11). Expected skill ceiling: RMSE ≈ 0.55 Kp inside the transit window, ≈ 0.7 at 2 h.
5. **Oval geometry**: equatorward boundary at the observer's magnetic local time straight from the OVATION grid (#8): most equatorward bin with summed electron flux ≥ 1 erg/cm²/s (NOAA's 18 % contour), for now and +60 min; Starkov/Feldstein boundary driven by predicted Kp for +90 and +120. Observer AACGM latitude and MLT from the shipped grid (§6). Margin = boundary − observer latitude, translated to classes: overhead (≤ 0°), visible low in the north (0 to 8°, the citizen-science view-line offset), not visible.
6. **Substorm state**: minimal-substorm-model state machine: energy loads with Akasofu power since the last onset; the hazard of onset rises as loaded energy approaches the threshold that reproduces the 2.7 h recurrence; onset detected when ≥ 2 FMI IMAGE stations (#29; #25 NUR/HRN as browser-only fallback) show a drop of ≥ 15 nT/min in X sustained for 3 min after quiet-day baseline removal. Output: phase label (quiet, growth, expansion, recovery) with the median durations (31 / 12 / 31 min), and P(onset in next 30 / 60 min).
7. **Output** per horizon: P(visible from here) = P(boundary within view) × phase factor (expansion ≫ growth ≫ quiet); a plain-language verdict with confidence; a freshness badge per source; explicit degraded mode when SOLAR-1 and IMAP are both inactive or when NOAA falls back to Kp-driven OVATION (no lead time).

## 4. Long-term model (1 to 3 days)

Refreshes every 15 minutes; inputs change a few times a day.

1. **Kp timeline**: NOAA 3-h forecast (#13) as bars; GFZ ensemble median and quartiles (#28) overlaid; observer's threshold lines for horizon and overhead visibility.
2. **CME arrivals**: from DONKI (#22): dedupe by `cmeid`, keep the latest `modelCompletionTime` among `isMostAccurate` inputs; draw an arrival window of ±7 h, the glancing/direct flag, and the Kp range `kp_90 → kp_180`. If a fresh flare + type II sweep (#19, #20) exists without a DONKI analysis yet, flag "eruption under analysis".
3. **High-speed streams**: WSA-Enlil `v_r`, density and `cloud` (#18) for the next 48 h; CLEAR ambient forecast (#24) to +5 d as a second opinion; 27 days ago (#17 and GFZ Kp history via proxy) as the recurrence analog.
4. **Night cards**: for each of the next three nights, P(Kp ≥ threshold for this latitude) from NOAA's Active / Minor / Moderate / Strong probabilities (#15) blended with the Kp table and the GFZ ensemble probabilities. Shown with the active WATCH (#19) and the forecaster's Geospace paragraph (#16).
5. **Honesty band**: printed skill statement (arrival ±7 h; field orientation unknown until measured at L1); CME Scoreboard (#23) statistics for the method's historical error.

## 5. Architecture

```
aurora-dashboard/
  PLAN.md  README.md
  web/                      static single-page app (vanilla JS + one chart lib), runs from file://, `npx serve`, or Cloudflare
    index.html  app.js  styles.css
    model/  coupling.js  propagate.js  oval.js  substorm.js  longterm.js  magcoords.js
    data/   coefficients.json  stations.json
  worker/                   Cloudflare Worker: static assets + /api proxy + cron
    wrangler.jsonc  src/index.ts  src/upstreams.ts
  calibration/              offline Python: fetch history, fit regression, write coefficients.json
  research/                 verified source notes, agent reports, coefficient tables, AACGM grid (already in place)
```

- **Browser-direct** for everything in Tier 1. Payload budget: every 60 s ≈ 50 KB (#1, #6, #10, #11, summary files); every 5 min ≈ 0.6 MB (#8; #9 only if the map is open); every 15 min ≈ 0.5 MB (#13 to #16, #19, #20, #22); every 30 min #18 (1.6 MB); once at load #2 (1.2 MB) and #3/#4 (status only, then hourly).
- **Worker proxy** for Tier 2: allow-listed upstream URLs, edge cache (Cache API) with per-route TTL (GFZ Hp30: expire at :00/:30 + 60 s; FMI: 60 s; forecasts: 15 min), CORS restricted to the dashboard origin. Free plan is enough: a 5-minute cron (288 KV writes/day, limit 1,000) can snapshot Tier 2 data for calibration; KV reads 100k/day.
- **Graceful degradation**: if `/api` is unreachable the page still runs NOAA-only, labelled as such.
- **Calibration job**: Python, run nightly (GitHub Action or locally); pulls GFZ Hp30 history and OMNI 1-min, fits the Hp30 regression and the analog-ensemble error tables, writes `coefficients.json`; the page never depends on it being fresh.

## 6. Model constants and calibration data

Everything below was read from source code, downloaded papers or live data on 2026-09-17; items a paywall blocked are marked. Full notes: `research/models_and_calibration_literature.md`.

**Coupling and integration (OVATION Prime, from the OvationPyme and auroramaps code)**
- `dΦ/dt = v^(4/3) · Bt^(2/3) · sin^(8/3)(θc/2)`, v in km/s, Bt in nT; solar-cycle mean 4421 in these units.
- 4-hour average: hourly means weighted 0.65^k for k = 0..3 hours back (1, 0.65, 0.4225, 0.2746), normalized; NOAA's IDL also weights the partial current hour by its elapsed fraction.
- Hemispheric power (computed by running OP-2010 at equinox): HP ≈ 7.4 + 0.00435 · dΦ/dt GW (4421 → 26 GW, 10 000 → 52 GW, 20 000 → 95 GW). Diffuse aurora is 55 to 85 % of the total.
- NOAA map value: P(%) = 10 + 8 · Σ electron energy flux (erg/cm²/s), clipped at 100 (Case et al. 2016).
- Validity: OP-2013 fitted up to dΦ/dt ≈ 3.0 MWb/s (≈ Kp 8+); electron flux clipped at 5 to 10 erg/cm²/s.

**Kp from solar wind**
- Newell et al. 2008: `Kp = 0.05 + 2.244e-4 · dΦ/dt + 2.844e-6 · √n · v²` (n cm⁻³, v km/s); the pair explains ~61 % of the variance across ten indices. Averaging window not confirmed (paywalled).
- Skill ceiling from neural-network models (Wintoft et al. 2017; Shprits et al. 2019): RMSE ≈ 0.55 Kp at 20 to 90 min lead, ≈ 0.7 at 3 h; beyond ~1 day recurrence beats solar-wind-driven models.
- Hp30: no published regression exists, so we fit our own. Target: GFZ `https://kp.gfz.de/app/files/Hp30_ap30_complete_series.txt` (1985 → yesterday, 44 MB, CC BY 4.0). Input: OMNI 1-min `https://spdf.gsfc.nasa.gov/pub/data/omni/high_res_omni/omni_min{YYYY}.asc` (about two weeks behind real time; format `HRO_format.txt`), plus the rolling NOAA 7-day propagated file for the most recent fortnight. No public archive of NOAA hemispheric power exists; recompute it from OvationPyme if needed.

**Oval boundary vs activity**
- NOAA rule of thumb: ≈ 66° at Kp 0, about 2° equatorward per Kp step, ≈ 48° at Kp 9.
- Starkov 1994 / Feldstein oval (formulas via Sigernes et al. 2011): colatitude as a three-harmonic series in MLT with coefficients cubic in log10|AL|; Kp → AL: `|AL| = 18 − 12.3 Kp + 27.2 Kp² − 2.0 Kp³` nT (valid to Kp 7). Computed midnight boundary of the diffuse aurora: Kp 0 → 65.9°, 1 → 64.9°, 2 → 63.1°, 3 → 61.1°, 4 → 59.1°, 5 → 57.1°, 6 → 55.4°, 7 → 54.1°. Coefficients: `research/starkov1994_coeffs.csv` (transcription from a third-party repository; check against the paper before shipping).
- Zhang & Paxton 2008: `research/zhangpaxton2008_coeffs.csv`; midnight boundary at 0.25 erg/cm²/s: Kp 1 → 63.1°, 3 → 59.8°, 5 → 57.8°, 7 → 53.1°; `HP(Kp) = 38.66 e^(0.1967 Kp) − 33.99` GW for Kp ≤ 5.
- OP-2010 winter diffuse boundary (≥ 1 erg) at midnight: dΦ/dt 2000 → 66.2°, 4421 → 63.7°, 8000 → 61.1°, 12 000 → 60.1°, 20 000 → 58.6°.
- View line (Case et al. 2016, 321 citizen reports, median Kp 5): boundary = most equatorward cell with P ≥ 18 % (Σ electron flux ≥ 1 erg/cm²/s) shifted 8° equatorward puts 95 % of sightings poleward of the line (fit 7.65 ± 2.06°). NOAA's own view line had only 44 % accuracy. We use 8°.

**Substorms**
- Onset criterion (Newell & Gjerloev 2011, SML): drop ≥ 15 nT/min sustained ≥ 3 min (≥ 45 nT in 3 min). Applied per IMAGE station to X after quiet-day baseline removal; require two stations.
- Phase durations, medians (Partamies et al. 2013, 54 519 expansions): growth 31 min, expansion 12 min, recovery 31 min, quiet 75 min. Growth length depends on driving (Li et al. 2013): 91 / 62 / 32 min for weak / moderate / strong reconnection electric field; onset needs E ≥ 0.6 mV/m and v ≥ 280 km/s.
- Recurrence under steady driving: 2.7 to 2.75 h (Freeman & Morley 2004; Borovsky et al. 1993). Minimal substorm model: energy loads at `P = (v B² / μ₀) · sin⁴(θc/2) · 4π L₀²` with L₀ = 7 R_E; unload when the store reaches a fixed threshold; release D · P with D ≈ 2.7 h. Isolated-onset waiting times: median 3.7 to 3.9 h, SD 2.4 h (Forsyth et al. 2015).
- Triggering: prior loading is necessary, a northward turning is not (Morley & Freeman 2007), so the hazard is a function of loaded energy, not of IMF turnings.

**Propagation**
- NOAA's propagated product targets X = 32 R_E (the Geospace model inflow boundary); ≈ 5 more minutes to the magnetopause. Delays measured over the last 7 days: 30.5 to 88 min, median 56 min.
- Flat-delay error is within ±10 min in most cases, RMSE ≈ 9 min for shocks; minimum-variance or ML propagation (PRIME, public GRU weights, Python 3.8 to 3.12) roughly halves it. The browser uses NOAA's product; PRIME is an optional Worker-side upgrade later.

**Magnetic coordinates**
- AACGM-v2 latitudes (epoch 2026.7, 110 km): Copenhagen 52.4°, Aarhus 53.0°, Skagen 54.7°, Stockholm 56.4°, Oslo 57.2°, Reykjavik 64.2°, Kiruna 65.4°, Tromsø 67.3°.
- A centered dipole is +2.9° off in Denmark (about 1.5 Kp steps) and up to +9° elsewhere in Europe: not acceptable.
- No AACGM implementation exists in JavaScript. We ship a precomputed AACGM grid, `research/aacgm_europe_grid.json` (0.5° over 45–72°N and 30°W–40°E, 46 KB, bilinear interpolation), and use the `apexcoords` npm package (MIT, quasi-dipole coordinates, within 0.4° of AACGM here) for locations outside it. MLT from AACGM magnetic longitude and UT.

## 7. Dashboard layout

- **Header**: location (geolocation or typed; default Copenhagen), corrected geomagnetic latitude, current MLT; the verdict now; a freshness strip (active spacecraft, age of each feed, degraded-mode flag).
- **Short-term panel**: −6 h to +2 h timeline with Bz/Bt, speed, coupling (arrived solid, in-transit shaded, extrapolated band); predicted Hp30 curve vs observed Hp30/estimated Kp/Geospace Kp; boundary-vs-latitude margin strip; substorm phase strip from FMI stations; probability tiles for +10/+30/+60/+90/+120 min; small polar map from #9 with the observer marked.
- **Long-term panel**: 72-h Kp bars with GFZ ensemble band; three night cards; CME arrival markers with windows and Kp ranges; Enlil speed/density/cloud trace; active watches; forecaster text; recurrence row.
- **Footer**: attributions (NOAA SWPC, NASA CCMC/DONKI, GFZ CC BY 4.0, FMI CC BY 4.0, INTERMAGNET CC BY-NC 4.0, BGS) and method notes.

## 8. Milestones

| Step | Scope | Needs |
|---|---|---|
| M1 | Browser-only dashboard: both panels from Tier 1 (NOAA + DONKI + iSWA + INTERMAGNET fallback), published coefficients | nothing to deploy |
| M2 | Cloudflare Worker proxy: GFZ Hp30 anchor, GFZ Hpo forecast, FMI IMAGE substorm detector, GFZ ensemble | Cloudflare account, `wrangler` |
| M3 | Calibration job and verification page (reliability diagrams, Brier score vs persistence and vs Geospace Kp) | OMNI history download |
| M4 | Extras: notifications when P(visible) crosses a threshold, Met Office / SIDC agreement row, CME Scoreboard error bars | — |

## 9. Decisions (resolved 2026-09-17)

1. **Hosting**: local-first with Node.js (`npm run dev`); production on one Cloudflare Worker (free plan) at https://aurora.birovince.com serving the static page, the `/api` proxy and the cron; GitHub Pages kept as a mirror.
2. **Default location**: Copenhagen, with geolocation and manual entry.
3. **Use**: personal. INTERMAGNET (CC BY-NC 4.0) stays as the browser-only fallback; for a public or commercial deployment it must be removed or licensed.
4. **Scope**: full (M1 to M4) in `codingbiro/aurora`.

## 10. What was built

- `web/`: the dashboard (both panels, tiles, timeline, boundary chart, substorm strip, polar map, night cards, CME cards, Enlil chart, agreement row, alerts, forecaster text, table view) and `verify.html` (calibration skill, reliability, live hindcast, CME scoreboard).
- `worker/`: allow-listed proxy shared with the Node dev server; 5-minute cron keeping a rolling driving history in KV, writing a verification trail and optionally pushing ntfy notifications.
- `calibration/`: Node job fitting Hp30 = 0.052 + 2.251e-4·coupling + 2.463e-6·√n·v² on 33 094 half-hours (2024-09 to 2026-09); test RMSE 0.75 versus 0.78 for the published Newell coefficients and 0.62 for 30-minute persistence, so the dashboard anchors the first horizons on the observed index. Storm-only fit blended in above Hp30 ≈ 3. Climatological log-ratio tables for the extrapolation ensemble. CME Scoreboard: NASA M2M WSA-Enlil runs land within ±7 h 47 % of the time (MAE 10.3 h) and their Kp ranges have been high.
- `test/`: 92 offline tests on fixtures captured from the live feeds.

## Decisions history

The original open questions were:

1. **Hosting**: Cloudflare Worker with static assets (recommended, one deploy for page + proxy) or local-only for now.
2. **Default location**: Copenhagen (55.7°N, 12.6°E; ~52.5° corrected geomagnetic) assumed; browser geolocation and manual entry both supported.
3. **Use**: personal / internal use is fine for every source. A public or commercial deployment must drop INTERMAGNET (CC BY-NC) or get permission, and should keep GFZ and FMI attribution visible.
4. **M1 first or M1+M2 together**: M1 alone already delivers both forecasts; M2 adds the fastest observed anchor (GFZ Hp30) and the substorm detector.

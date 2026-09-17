<!-- Research report produced by a background research agent on 2026-09-17; every endpoint marked Verified was fetched with curl that day. -->

All verification is complete; nothing further to fetch. Final report follows.

# Long-term (1–3 day) aurora panel: verified data sources

All fetches done 2026-09-17 13:13–14:31 UTC with curl from this machine; raw responses saved under `/private/tmp/claude-501/-Users-quick-Documents-GitHub/ba9cd858-04ff-4ff1-ac3c-1bf13ef7a947/scratchpad/agentB/` (181 files, 28 MB). "Verified" = fetched and inspected data. CORS = value of `Access-Control-Allow-Origin` when sent `Origin: https://example.com`.

## 1. NASA CCMC DONKI

**Name:** DONKI web service (keyless host)
**Verified:** yes — all six endpoints, 30-day window 2026-08-18..09-17, HTTP 200 JSON in 0.5–4.7 s
**URLs:** `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/{CME|CMEAnalysis|WSAEnlilSimulations|GST|FLR|notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (notifications also needs `&type=all|CME|FLR|SEP|IPS|MPC|GST|RBE|report`; `type=CME` verified). CMEAnalysis extra params verified: `mostAccurateOnly=true&speed=500&halfAngle=30&catalog=ALL` (returned 20 rows, min speed 510, min halfAngle 30).
**What it provides:** M2M/CCMC human-analysed CMEs, cone-model parameters, WSA-Enlil+Cone runs with Earth arrival predictions, storms, flares, and the human-written notifications.
**Key fields (exact, from data):**
- `WSAEnlilSimulations[]`: `simulationID, modelCompletionTime, au (2.0|5.5), cmeInputs[{cmeStartTime, cmeid, latitude, longitude, speed, halfAngle, time21_5, featureCode, isMostAccurate, levelOfData, ipsList[]}], estimatedShockArrivalTime, estimatedDuration, rmin_re, kp_18, kp_90, kp_135, kp_180, isEarthGB, isEarthMinorImpact, impactList[{location, arrivalTime, isGlancingBlow, isMinorImpact}], link`
- Earth arrival semantics (confirmed against the DONKI view page labels): `estimatedShockArrivalTime` = "Earth Shock Arrival Time … (+- 7 hours)"; null means no Earth impact predicted. `isEarthGB` = Earth glancing blow (flank hit). `isEarthMinorImpact` = minor impact flag. `estimatedDuration` = "Duration of disturbance (hr) … (+- 8 hours)". `rmin_re` = "Minimum magnetopause standoff distance: Rmin(Re)". `impactList` = other locations only (Mars, STEREO A, Solar Orbiter, Juice, BepiColombo, Psyche…) — Earth is never in it; Earth lives in the top-level fields. `kp_90 / kp_135 / kp_180` = "Possible Kp index: (kp)90=3 (kp)135=4 (kp)180=4" — estimated maximum Kp for assumed IMF clock angle 90° (westward), 135° (south-westward), 180° (southward), integers 1–9; use 90→180 as the low→high range (the notifications phrase it as "roughly estimated expected range of the maximum Kp index is 4-6"). `kp_18` (18° near-northward scenario) is a legacy field: null in all 884 simulations of 2026 and in a July-2012 sample; treat as always null.
- Population (2026-01-01..09-17, 884 sims): 208 have `estimatedShockArrivalTime` (112 glancing, 96 direct); kp_90/135/180 set in 204 of those; `estimatedDuration` 84, `rmin_re` 85 (examples all direct hits).
- `CME[]`: `activityID, catalog, startTime, instruments[{displayName}], sourceLocation, activeRegionNum, note, submissionTime, versionId, link, linkedEvents[{activityID}], sentNotifications[], cmeAnalyses[{time21_5, latitude, longitude, halfAngle, speed, type(S|C|O|R|ER), isMostAccurate, levelOfData, featureCode, imageType, measurementTechnique, minorHalfWidth, speedMeasuredAtHeight, tilt, note, submissionTime, link, enlilList[ same fields as WSAEnlilSimulations + cmeIDs ]}]` — one call gives CME → analyses → Enlil arrival predictions nested.
- `CMEAnalysis[]`: flattened analyses (`associatedCMEID, associatedCMEstartTime, associatedCMELink, time21_5, latitude, longitude, halfAngle, speed, type, isMostAccurate, dataLevel, featureCode, imageType, measurementTechnique, minorHalfWidth, speedMeasuredAtHeight, tilt, note, submissionTime, versionId, catalog, link`).
- `GST[]`: `gstID, startTime, allKpIndex[{observedTime, kpIndex, source}], linkedEvents, sentNotifications, submissionTime, versionId, link` (0 in last 30 d; 12 since 2026-03-01; latest 2026-08-08 Kp 5.67, submitted 3 h after start).
- `FLR[]`: `flrID, catalog, instruments, beginTime, peakTime, endTime, classType, sourceLocation, activeRegionNum, note, linkedEvents, sentNotifications, submissionTime, versionId, link`.
- `notifications[]`: `messageType, messageID, messageURL, messageIssueTime, messageBody` (30 d: CME 51, RBE 14, SEP 9, Report 5, FLR 4, IPS 1). Body carries arrival time "(plus minus 7 hours)", Kp range, and iSWA filenames (`…_2.0_ENLIL_CONE_timeline.gif`) that identify the run.
**Cadence/latency measured:** CME `startTime→submissionTime` (n=142): p10 2.3 h, p25 3.7 h, median 6.6 h, p75 11.4 h (tail to 269 h because 37 records are re-submitted v2–v4). CME onset → WSA-Enlil `modelCompletionTime` for Earth-impact runs (n=208): min 1 h, p25 3.7 h, median 6.6 h, p75 12.3 h, max 47.6 h. CME notification issue (n=47): median 5.2 h after onset, min 1.8 h. Lead time model completion → predicted Earth arrival: 16–119 h, median 60 h.
**Horizon/resolution:** event-based; arrivals predicted 1–5 days out, ±7 h.
**Format:** JSON. **Auth:** none.
**CORS:** `Access-Control-Allow-Origin: *` on GET; OPTIONS preflight returns 403 — so browser fetch works only as a "simple" GET (no custom headers).
**Terms:** NASA public data; notifications carry the disclaimer "Experimental Research Information … NOAA SWPC is the official source".
**Sample:**
`{"simulationID":"WSA-ENLIL/48706/1","modelCompletionTime":"2026-09-14T15:32Z","estimatedShockArrivalTime":"2026-09-17T06:00Z","estimatedDuration":null,"rmin_re":null,"kp_18":null,"kp_90":3,"kp_135":4,"kp_180":4,"isEarthGB":true,"isEarthMinorImpact":false,...}`
**Reliability notes:** stable, but payloads grow (CME 30 d = 271 KB); several sims per CME (re-analyses) — pick latest `modelCompletionTime` per `cmeid` with `isMostAccurate:true`.

**Name:** DONKI via api.nasa.gov
**Verified:** yes — same six endpoints with `api_key=DEMO_KEY`, identical data (1.3–6.7 s).
**URL:** `https://api.nasa.gov/DONKI/{endpoint}?…&api_key=KEY`
**Auth/limits:** docs (`/assets/html/authentication.html`): DEMO_KEY 30 req/IP/hour and 50/IP/day; registered key 1,000/hour. Observed headers: `x-ratelimit-limit: 10`, remaining dropped 9→4 over 8 calls and was back to 9 after 13 min (short rolling window). Not usable from a public page.
**CORS:** `*` (OPTIONS 403). Use kauai directly instead; a registered key belongs in a proxy.

## 2. WSA-Enlil predicted solar wind at Earth as data

**Name:** NOAA SWPC WSA-Enlil time series
**Verified:** yes (fetched 3× at 14:14, 14:26, 14:31 UTC)
**URL:** `https://services.swpc.noaa.gov/json/enlil_time_series.json` (1.58 MB). Companion image list: `https://services.swpc.noaa.gov/products/animations/enlil.json` (169 frame URLs, run id 58516, same window — images only). Full NetCDF: `https://nomads.ncep.noaa.gov/pub/data/nccf/com/wsa_enlil/prod/wsa_enlil.YYYYMMDD/wsa_enlil.mridNNNNNNNN.suball.nc` (131 MB, one run `mrid00000000` at 01:20 UTC today; WSA `wsa_vel_21.5rs_HH_gong.fits` every 2 h).
**Key fields:** `time_tag, earth_particles_per_cm3, temperature, v_r, v_theta, v_phi, b_r, b_theta, b_phi, polarity, cloud` (cloud = CME tracer, ~0 in ambient wind). Array is reverse-chronological.
**Cadence/latency:** 4300 points at 2.1–2.3 min; window 2026-09-12T19:00 → 2026-09-19T19:01 (7 days; 1334 points / ~48 h ahead at 14:14 UTC). `Last-Modified` bumps every ~5–10 min but content was byte-identical across 17 min; SWPC states CME runs are on-demand and one 00Z ambient run daily; NOMADS shows one run today. Expect content changes a few times per day at most.
**Horizon/resolution:** ~2 days ahead of fetch time (SWPC: "output files out to 48 hours forecast"), ~2 min steps.
**Format:** JSON. **Auth:** none. **CORS:** `*`. **Terms:** US public domain.
**Sample:** `{"time_tag":"2026-09-18T12:48:23","earth_particles_per_cm3":2.466,"v_r":570.823,...}` (max predicted v_r in the future segment)
**Reliability notes:** no run timestamp inside the file — infer from the animation frame ids or NOMADS; keep the previous copy to detect a new run.

**Name:** NASA CCMC iSWA data tree — WSA-Enlil+Cone Earth timelines (per M2M run)
**Verified:** yes
**URLs:** `https://iswa.gsfc.nasa.gov/iswa_data_tree/model/heliosphere/wsa-enlil-cone/velocity-density-timeline-DATA/YYYY/MM/YYYYMMDD_HHMMSS_2.0_ENLIL_time_line.dat` and `…/wsa-enlil-cone/KP-DATA/YYYY/MM/YYYYMMDD_HHMMSS_2.0_ENLIL_Kp_timeline.dat` (Apache HTML directory listings; 40 runs in 2026/09).
**Key fields:** time_line: `year month day hour minute B_enl[nT] V_enl[km/s] n_enl[cm-3] T_enl[kK]`; Kp_timeline: `year month day hour minute Kp_90 Kp_135 Kp_180`.
**Cadence/horizon:** ~6.2-min steps, from ~1 day before the run to ~9 days after (sample run 20260915_014700: 2026-09-14T00:05 → 2026-09-24T00:04, 2313 rows). File timestamp ≈ DONKI `modelCompletionTime` (20260914_153400 ↔ sim 48706 at 15:32Z); exact filenames appear in DONKI notification bodies/view pages.
**Format:** whitespace text. **Auth:** none. **CORS:** none (only `Access-Control-Allow-Methods: GET`) → proxy required. **Terms:** NASA research product.
**Sample:** `2026 9 24 0 4 5.0943 516.0 6.035 57.321` / `2026 9 24 0 4 3.087 4.380 4.836`
**Reliability notes:** CCMC/M2M runs, not NOAA's; ensemble Kp distributions and arrival histograms exist only as GIFs (ensemble Kp data dir stale since 2023-06).

**Name:** iSWA HAPI server
**Verified:** yes — catalog (323 datasets), info and data calls.
**URL:** `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/{catalog|info?id=…|data?id=…&time.min=…&time.max=…&format=json}`
**What it provides for this panel:** no WSA-Enlil Earth timeline (`ENLIL_KP_P7M` has KP_18/KP_90/KP_180 but stops 2015-01-09; data call → 1406 "No data"). Useful: `CLEAR_daily_forecast_sw_P1H` (ambient, CME-free solar wind forecast at Earth: `bulk_speed, density, b_mag, bx, by, bz, temperature…`, hourly, verified 2026-09-14 → 2026-09-22T23:00), `NOAA_KP_P3H` (SWPC observed/estimated/predicted Kp, verified to 2026-09-20T00:00), `swpc_27day`, `airforce_45day`, `GFZ_Indices_P3H`, `gfz_obs_geo_30m_indices` (Hp30). Data windows limited to 31 days.
**CORS:** `*` (plus allow-headers/methods). **Format:** HAPI JSON/CSV. **Auth:** none.
**Sample:** `["2026-09-20T00:00:00Z",null,null,null,2.33,"2026-09-20T00:00:00Z","2026-09-20T01:30:00Z","2026-09-20T03:00:00Z"]`

## 3. Multi-day Kp forecasts

**Name:** NOAA SWPC planetary Kp forecast JSON
**Verified:** yes. **URL:** `https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json`
**Key fields:** `[{time_tag, kp, observed ("observed"|"estimated"|"predicted"), noaa_scale (null|"G1"…)}]`; today: 60 observed (7 d back), 4 estimated, 17 predicted 3-h values to 2026-09-20T00:00.
**Cadence:** file regenerated every minute (`cache-control: max-age=60`); predicted values change when the 3-Day Forecast is issued (0030 and 1230 UTC, per SWPC product page) and the daily geomag forecast (~2205 UTC).
**Horizon/resolution:** through end of forecast day 3 (~2.4 days at 14 UTC), 3 h. **Format:** JSON. **Auth:** none. **CORS:** `*`. **Terms:** public domain.
**Sample:** `{"time_tag":"2026-09-18T00:00:00","kp":3.67,"observed":"predicted","noaa_scale":null}`

**Name:** NOAA SWPC text forecasts
**Verified:** yes, all four plus two extras.
- `text/3-day-forecast.txt` — issued 2026-09-17 1230 UTC; Kp per 3-h × 3 days with "(G1)" tags, S/R probabilities, rationale.
- `text/3-day-geomag-forecast.txt` — issued 2026-09-16 2205 UTC; Ap (observed/estimated/predicted 3 days), probabilities Active / Minor / Moderate / Strong-Extreme per day (e.g. `Minor storm 45/20/05`), Kp 3-h × 3 days.
- `text/3-day-solar-geomag-predictions.txt` — issued 2200 UTC; `A_Fredericksburg, A_Planetary`, `Pred_Mid_k`, `Pred_High_k` 3-h × 3 days, probabilities.
- `text/27-day-outlook.txt` — issued Monday 2026-09-14 0117 UTC; daily F10.7, Ap, largest Kp for 27 days.
- `json/45-day-forecast.json` (+ `.txt`) — USAF 45-day Ap and F10.7, issued daily 0000 UTC: `{type, product, issued, data:[{time, metric:"ap"|"f107", value}]}`.
- `products/noaa-scales.json` — keys `"-1","0","1","2","3"` → `{DateStamp, TimeStamp, R{Scale,Text,MinorProb,MajorProb}, S{Scale,Text,Prob}, G{Scale,Text}}` (G-scale prediction for day 1–3; today G1 for day 1).
**Format:** text (fixed layout, `:Product:`/`:Issued:` headers) / JSON. **CORS:** `*` on all. **Terms:** public domain.
**Sample:** `21-00UT       4.67 (G1)    3.00         2.67`

**Name:** NOAA SWPC alerts feed
**Verified:** yes. **URL:** `https://services.swpc.noaa.gov/products/alerts.json` — 83 messages over 30 days, fields `product_id, issue_datetime, message`; parse `Space Weather Message Code:` from the body.
**Codes seen:** WATCH `A20F/WATA20` (G1), `A30F/WATA30` (G2) [G3 is `A50F/WATA50`, not seen]; WARNING `K04W/WARK04`, `K05W/WARK05` [K06W…K09W for G2+]; ALERT `K04A/ALTK04`, `K05A/ALTK05` [ALTK06…]; others: `EF3A/ALTEF3`, `TIIA/ALTTP2`, `TIVA/ALTTP4`, `XM5S/SUMXM5`, `XM5A/ALTXMF`, `P20W/WARPC0`, `P11W/WARPX1`, `BHIS/SUM10R`.
**Examples:** WATCH — `WATA20 … WATCH: Geomagnetic Storm Category G1 Predicted / Highest Storm Level Predicted by Day: Sep 16: G1 (Minor) Sep 17: G1 (Minor) Sep 18: None (Below G1)`; WARNING — `WARK05 … WARNING: Geomagnetic K-index of 5 expected / Valid From: 2026 Sep 15 1855 UTC / Valid To: 2026 Sep 16 0600 UTC / Warning Conditions: Onset / NOAA Scale: G1 - Minor`; ALERT — `ALTK04 … ALERT: Geomagnetic K-index of 4 / Threshold Reached: 2026 Sep 16 0030 UTC / Synoptic Period: 0000-0300`.
**CORS:** `*`. **Cadence:** regenerated each minute; messages event-driven.

**Name:** GFZ Potsdam PAGER/SWIFT ensemble Kp forecast (+ Hp30/Hp60)
**Verified:** yes (JSON and CSV, README).
**URLs:** `https://spaceweather.gfz.de/fileadmin/Kp-Forecast/CSV/kp_product_file_FORECAST_PAGER_SWIFT_LAST.json` (5.3 KB) and `.csv`; `https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.{json,csv}`, `hp60_…_LAST.{json,csv}`; README `https://spaceweather.gfz.de/fileadmin/Kp-Forecast/README.rst`.
**Key fields:** `Time (UTC)` ("dd-mm-yyyy HH:MM"), `minimum, 0.25-quantile, median, 0.75-quantile, maximum, prob 4-5, prob 5-6, prob 6-7, prob 7-8, prob >= 8`, members `kp_0…kp_N` (6 today; README says 12–20). JSON is pandas column orientation `{"median":{"0":3.67,"1":3.33,…}}`.
**Cadence/latency:** page says the ML model runs hourly; observed `Last-Modified 12:06 UTC` unchanged at 14:30 UTC (≥2.4 h old), so treat as ~3-hourly with lag.
**Horizon/resolution:** 72 h, 25 rows at 3 h (Kp); Hp30 145 rows at 30 min; Hp60 73 rows at 1 h — all 17-09 12:00 → 20-09 12:00.
**Format:** JSON/CSV. **Auth:** none. **CORS:** none → proxy. **Terms:** Kp products CC BY 4.0 (attribute GFZ); forecast page adds an "as-is" disclaimer.
**Sample:** `17-09-2026 18:00,1.333333,2.666666,2.666666,4.666666,4.666666,0.3333,0.0,0.0,0.0,0.0,4.666666,…`
Also verified: `https://kp.gfz.de/app/json/?start=…&end=…&index=Kp|Hp30` (observed/nowcast, JSON, no CORS).

**Name:** UK Met Office MOSWOC 4-day forecast
**Verified:** yes for HTML and one undocumented JSON; no numeric Kp product found.
**URLs:** HTML `https://weather.metoffice.gov.uk/specialist-forecasts/space-weather` (forecast text "Issued at: 12:03 (GMT)", server-rendered). JSON used by that page: `https://data.consumer-digital.api.metoffice.gov.uk/v1/space-weather/forecast-overview` → `{content (HTML), simplified_content (HTML), saved_dt}`, `cache-control: max-age=540`; `…/v1/space-weather/notifications` → JSON array (empty today). The ovation videos on the same host need a token (403 "Missing Authentication Token").
**What it provides:** prose only, Kp in words ("Active (Kp4) or G1/Minor (Kp5) … Days 2-4 (18-20 Sep) … Quiet or Unsettled (Kp 1-3)"); 4-day horizon; issued ~twice daily.
**Format:** JSON-wrapped HTML. **Auth:** none. **CORS:** none → proxy. **Terms:** Crown copyright; endpoint is undocumented and may change. Numeric MOSWOC Kp JSON exists only for registered specialist users (not verified).

**Name:** SIDC / Royal Observatory of Belgium URSIGRAM
**Verified:** yes (text). **URLs:** `https://www.sidc.be/spaceweatherservices/managed/services/archive/product/meu/latest` (text/plain, 3.7 KB); archive `…/product/meu/YYYY/MM/DD`; also `…/product/presto/latest` (fast warnings), `bul` (weekly), `xut` (GEOALERT), `tot` (ISES ursigram). No JSON/RSS variants (`?format=json` ignored; rss paths 404).
**Key content:** `PREDICTIONS FOR 17 Sep 2026  10CM FLUX: 100 / AP: 007` for today/+1/+2 (daily Ap, not Kp); `GEOMAGNETISM : Quiet (A<20 and K<4)` (24 h categorical); prose on CMEs/coronal holes/solar wind.
**Cadence:** daily ~12:30 UTC (issued 1231 UTC). **Horizon:** 3 days, daily. **Format:** fixed text. **Auth:** none. **CORS:** none → proxy. **Terms:** ROB data policy (attribution; PDF linked in the bulletin footer).

**Name:** Australian BoM Space Weather Services API
**Verified:** docs and auth behaviour (POST without key → 400 `{"errors":[{"code":21,"message":"Missing API key"}]}`); data not verified (no key).
**URL:** POST JSON to `https://sws-data.sws.bom.gov.au/api/v1/{get-a-index|get-k-index|get-dst-index|get-mag-alert|get-mag-warning|get-aurora-alert|get-aurora-watch|get-aurora-outlook}` with `{"api_key":"…","options":{…}}`.
**What it provides:** Australian-region A/K/Dst (latest or historical, ≤10,000 rows), mag alerts, mag warnings with per-day categorical forecast (`start_date, end_date, cause, activity:[{date, forecast:"Unsettled to minor storm"}]`), aurora alert (now), watch (next 48 h), outlook (3–7 days; `k_aus, lat_band, comments`). No multi-day Kp series.
**Auth:** free registration key. **CORS:** reflects Origin, allows `Content-Type` → browser-callable but would expose the key. **Terms:** "no charge, subject to change".

**Name:** ESA Space Weather Service Network
**Verified:** only that everything is behind ESA SSO. `swe.ssa.esa.int/gen_for` lists Kp/Ap forecasts from BGS (72 h Ap), IRF Lund (Kp/Dst), GFZ Hp30 and a SIDC-hosted REST API (`…/prod/API/index.php?component=latest&pc=S109&psc=a&output=json`), but every one redirects to `sso.s2p.esa.int` (Keycloak login), and the portal banner says services are "under review/construction". Not usable without an account. IRF Lund's own host (`lund.irf.se`) was unreachable from here (connection failure) — unverified.

## 4. Solar precursors (services.swpc.noaa.gov, all verified, all CORS `*`, public domain)

- `json/goes/primary/xrays-1-day.json` (650 KB, 2872 rows) / `xrays-7-day.json` (4.5 MB): `time_tag, satellite, flux, observed_flux, electron_correction, electron_contaminaton (sic), energy ("0.05-0.4nm"|"0.1-0.8nm")`; 1-min, two rows per minute; last point ~2 min old.
- `json/goes/primary/xray-flares-latest.json` (1 record): `time_tag, satellite, current_class, current_ratio, current_int_xrlong, begin_time, begin_class, max_time, max_class, max_xrlong, end_time, end_class, max_ratio_time, max_ratio`; `xray-flares-7-day.json` (30 flares, same minus current_*); `xray-background-7-day.json` (`time_tag, satellite, background`, daily).
- `json/solar_regions.json` (daily SRS, 30 days): `observed_date, region, latitude, longitude, location, carrington_longitude, old_carrington_longitude, area, spot_class, extent, number_spots, mag_class, mag_string, status, c_xray_events, m_xray_events, x_xray_events, proton_events, s_flares, impulse_flares_1..4, protons, c_flare_probability, m_flare_probability, x_flare_probability, proton_probability, first_date`.
- `json/solar_probabilities.json` (daily, 31 rows): `date, c_class_1_day..3_day, m_class_1_day..3_day, x_class_1_day..3_day, 10mev_protons_1_day..3_day, polar_cap_absorption`.
- Also present: `json/sunspot_report.json`, `json/edited_events.json` (SWPC event list), `products/summary/solar-wind-speed.json`, `json/ovation_aurora_latest.json` (30-min OVATION grid with `Forecast Time`), `text/discussion.txt` (forecaster discussion, 0030/1230 UTC), `text/advisory-outlook.txt` (weekly 7-day outlook).
- Coronal-hole / WSA ambient speed: no standalone WSA JSON at SWPC; the `enlil_time_series.json` `v_r` is the WSA-Enlil (ambient + CME) prediction; WSA maps only as FITS on NOMADS; CLEAR ambient forecast via iSWA HAPI is the JSON alternative.
- Geospace model: `json/geospace/geospace_pred_est_kp_1_hour.json` `[{model_prediction_time, k}]`, 1-min, extends 23–33 min beyond now; `json/geospace/geospce_pred_est_kp_7_day.json` (filename typo is real; 10003 rows, 623 KB); `json/geospace/geospace_dst_1_hour.json` `[{time_tag, dst}]` (+24 min) and `geospace_dst_7_day.json`; `products/geospace/propagated-solar-wind-1-hour.json` — array-of-arrays with header `["time_tag","speed","density","temperature","bx","by","bz","bt","vx","vy","vz","propagated_time_tag"]`, 1-min, `propagated_time_tag` ≈ time_tag + 50 min (L1→Earth); `propagated-solar-wind.json` (7 days, 1.19 MB). `experimental/json/geospace/` mirrors the Kp files. These are nowcast/≤1 h products, not 1–3 day.

## Extra source found

**Name:** CCMC CME Arrival Time Scoreboard web service
**Verified:** yes. **URL:** `https://kauai.ccmc.gsfc.nasa.gov/CMEscoreboard/WS/get/predictions` (7.1 MB JSON, 470 CMEs 2013–2026-09-13; `startDate/endDate` params are ignored); `…/WS/get/methods` lists method names.
**Key fields:** `cmeID, observedTime, arrivalTime, noArrivalObserved, maxKP, dstMin, dstMinTime, predictions[{predictedMethodName, submissionTime, predictedArrivalTime, uncertaintyMinusInHrs, uncertaintyPlusInHrs, confidenceInPercentage, predictedMaxKpLowerRange, predictedMaxKpUpperRange, predictedDstMin, leadTimeInHrs, differenceInHrs, predictionNote}]`. 2026 methods include WSA-ENLIL+Cone from NASA M2M, Met Office, KSWC, BoM, NOAA/SWPC, SIDC, ELEvo, OSPREI, plus "Average/Median of all Methods".
**CORS:** `*`. **Caveat:** in the current payload every 2026 CME already has an observed `arrivalTime` or `noArrivalObserved`; I found 0 pending (not-yet-arrived) CMEs, so the WS looks retrospective — excellent for showing per-method error statistics, unverified as a live feed.

## Ranked recommendations

**(a) CME arrival prediction**
1. DONKI `CME` (or `WSAEnlilSimulations`) on kauai — keyless, CORS `*`, structured arrival time ±7 h, glancing flag, Kp 90/135/180 range, ~3–7 h after CME onset. Poll every 15–30 min; dedupe by `cmeid`, keep the latest `modelCompletionTime` among `isMostAccurate` inputs. Browser-direct.
2. SWPC `enlil_time_series.json` + `alerts.json` (WATA20/30/50 watches = the official "G-level predicted by day") + `3-day-forecast.txt` rationale — NOAA's official view of the same CMEs, CORS `*`. Browser-direct.
3. iSWA data-tree `.dat` Earth timelines for plotting the CCMC run's B/V/n/T and Kp scenarios — needs a proxy (no CORS, HTML directory listings).
4. CME Scoreboard for multi-agency arrival spread and historical error bars — CORS `*` but 7 MB; cache in the proxy and slice.

**(b) 3-day Kp forecast and cross-agency ensemble**
1. NOAA `noaa-planetary-k-index-forecast.json` (numeric 3-h Kp) + `noaa-scales.json` (G by day) + `3-day-geomag-forecast.txt` (storm probabilities) — browser-direct, CORS `*`.
2. GFZ PAGER ensemble JSON (median, quartiles, P(Kp≥4…8), members) and Hp30 ensemble for 30-min resolution — best second numeric opinion; proxy needed (no CORS), file may lag 2–3 h.
3. Met Office `forecast-overview` (categorical Kp prose, 4 days) and SIDC URSIGRAM (daily Ap ×3, categorical) as qualitative agreement indicators — proxy needed; parse text with regexes; both undocumented/fragile.
4. iSWA HAPI `NOAA_KP_P3H` as a CORS-enabled mirror of NOAA Kp with a clean time-range API; `swpc_27day` / `airforce_45day` for the outlook tail.
Not usable now: BoM (key exposure, no Kp forecast), ESA network and IRF Lund (login wall / unreachable).

**Browser-direct vs proxy:** direct — everything on `services.swpc.noaa.gov`, `kauai.ccmc.gsfc.nasa.gov/DONKI` and `/CMEscoreboard`, iSWA HAPI. Proxy — GFZ files, SIDC text, Met Office consumer API, iSWA data-tree `.dat`, NOMADS NetCDF, BoM (key), api.nasa.gov (key/rate limits).
# NOAA SWPC endpoints verified 2026-09-17 14:14 UTC (all: CORS `*`, Cache-Control max-age=60, fresh Last-Modified)

## Removed (404) — do not use
products/solar-wind/{mag,plasma}-{5-minute,2-hour,6-hour,1-day,3-day,7-day}.json, products/solar-wind/ephemerides.json
(Service Change Notice 26-21: removed ~2026-04-30; DSCOVR retired; ACE programmatic support ended 2026-06-30, SCN 26-66)

## L1 solar wind, raw (1-min)
- json/rtsw/rtsw_mag_1m.json   1.4 MB, 24 h, newest-first, all spacecraft. sources seen: SOLAR1 (active), ACE, IMAP. fields: time_tag, active, source, bt, bx/by/bz_gse, bx/by/bz_gsm, theta/phi_gsm, quality flags. latency ~5 min.
- json/rtsw/rtsw_wind_1m.json  2.5 MB, 24 h. fields: proton_speed, proton_density, proton_temperature, proton_vx/vy/vz_gse+gsm, alpha_*, flags. latency ~5-6 min.
- json/rtsw/rtsw_ephemerides_1h.json 0.8 MB, 30 d, hourly spacecraft positions (x_gse etc.), per source. SOLAR-1 x_gse ≈ 1.574e6 km.
- products/summary/solar-wind-mag-field.json, solar-wind-speed.json: tiny current-value files.

## L1 solar wind, propagated to Earth by SWPC (Geospace pipeline)
- products/geospace/propagated-solar-wind-1-hour.json (6.5 KB, ~55 rows) and propagated-solar-wind.json (1.2 MB, 7 days, 1-min)
  array-of-arrays, header row: time_tag, speed, density, temperature, bx, by, bz, bt, vx, vy, vz, propagated_time_tag
  measured lead (propagated_time_tag - time_tag) over last 7 d: min 30.5, median 56, max 88 min. no Bz nulls.

## Geospace model (SWMF-based) nowcast/forecast
- json/geospace/geospace_pred_est_kp_1_hour.json: {model_prediction_time, k}, 1-min, extends ~30-45 min past now (also geospce_pred_est_kp_7_day.json — note typo in filename).
- json/geospace/geospace_dst_1_hour.json / geospace_dst_7_day.json: modeled Dst, 1-min.

## Aurora model (OVATION Prime 2013), 5-min cadence, ~30-90 min lead
- json/ovation_aurora_latest.json: 360x181 geographic grid [lon, lat, aurora 0-100], Observation Time + Forecast Time. 0.9 MB.
- text/ovation_latest_aurora_n.txt: RAW model output in magnetic coords: 96 MLT bins x 80 MLAT bins (50-89.5, 0.5 deg), columns je_diff, je_mono, je_wav, je_ions (erg/cm2/s); header has Hemispheric Power (GW) and "Forecast Kp". (south: ovation_latest_aurora_s.txt)
- text/aurora-nowcast-hemi-power.txt: 5-min table obs_time, forecast_time, HP north, HP south (GW), today only.
- products/animations/ovation_north_24h.json: list of 24h of image frames (jpg) — display only.

## Indices
- json/planetary_k_index_1m.json: estimated Kp, 1-min, ~6 h: {time_tag, kp_index, estimated_kp, kp}
- products/noaa-planetary-k-index.json: 3-h Kp, 7 days: {time_tag, Kp, a_running, station_count}
- json/boulder_k_index_1m.json: Boulder K 1-min, 24 h
- products/kyoto-dst.json: hourly Kyoto Dst, 7 d
- products/noaa-scales.json: keys -1,0,1,2,3 (yesterday, now, today, +1, +2 days): G/S/R scale + probabilities

## Forecasts (long term)
- products/noaa-planetary-k-index-forecast.json: 3-hourly Kp, past 7 d + 3 d ahead, {time_tag, kp, observed: observed|estimated|predicted, noaa_scale}
- text/3-day-forecast.txt (issued 12:30 UTC daily): Kp table + rationale text. text/3-day-geomag-forecast.txt (22:05 UTC daily): Ap forecast + probabilities Active/Minor/Moderate/Strong-Extreme per day + Kp table.
- text/discussion.txt (12:30 UTC daily): forecaster discussion incl. "Solar Wind .Forecast" and "Geospace .Forecast" sections.
- text/27-day-outlook.txt (weekly, Mondays): daily F10.7, Ap, max Kp for 27 days. text/45-day-forecast.txt + json/45-day-forecast.json: daily Ap + F10.7 45 days.
- json/enlil_time_series.json: WSA-Enlil predicted solar wind AT EARTH, ~2.4-min cadence, window = run start -5 d .. +2 d (currently 09-12T19 .. 09-19T19). fields: earth_particles_per_cm3, temperature, v_r, v_theta, v_phi, b_r, b_theta, b_phi, polarity, cloud (CME ejecta tracer). No Bz by design. products/animations/enlil.json = frames of same run (run id in filename).
- products/alerts.json: {product_id, issue_datetime, message}; codes: A20F/A30F/A50F/A99F = WATA20/30/50/99 G1-G4 WATCH; K04W..K09W = WARK0x warnings; K04A..K09A = ALTK0x alerts; plus EF3A, P/X radio+proton, TIIA (Type II radio sweep = CME shock signature), TIVA.

## Solar precursors
- json/goes/primary/xrays-1-day.json (1-min, 2 channels), xray-flares-latest.json, xray-flares-7-day.json (30 flares/7 d).
- json/edited_events.json: 30 d of solar event reports (XRA flares, RSP radio sweeps type II/IV, etc.) — CME-associated signatures.
- products/ccor1/, ccor2/: coronagraph images (GOES-19 CCOR-1, SOLAR-1 CCOR-2) jpegs.json lists — display only.
- json/solar_regions.json, sunspot_report.json.

## Platform constraints
- Claude Artifact pages: CSP blocks ALL fetch/XHR to external hosts → live dashboard cannot be an artifact.
- Cloudflare KV free: 1,000 writes/day (1-min poller = 1,440 → too many; 5-min = 288 OK), 100k reads/day; paid: unlimited. Cron Triggers: standard cron syntax, UTC.

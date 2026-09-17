<!-- Research report produced by a background research agent on 2026-09-17; every endpoint marked Verified was fetched with curl that day. -->

All verification done. Everything below was fetched with curl between 14:13 and 14:32 UTC on 2026-09-17 (raw responses saved under `/private/tmp/claude-501/-Users-quick-Documents-GitHub/ba9cd858-04ff-4ff1-ac3c-1bf13ef7a947/scratchpad/agentA/`; the GFZ timing poll is in `poll_gfz.log` there).

# 1. GFZ Potsdam indices

## 1a. GFZ Kp / Hp30 / Hp60 / ap30 nowcast JSON API
- **Verified:** yes (GET, OPTIONS, 30-day, 1-year and 5-year pulls, 30-s polling for freshness).
- **URL:** `https://kp.gfz.de/app/json/?start=2026-09-16T00:00:00Z&end=2026-09-17T23:59:59Z&index=Hp30`
  - `index` accepted: `Kp`, `ap`, `Ap`, `Cp`, `C9`, `Hp30`, `Hp60`, `ap30`, `ap60`, `SN`, `Fobs`, `Fadj` (all returned 200).
  - `&status=def` (Kp/ap/Ap/Cp/C9 only) returns definitive values only — for recent days it returns empty arrays.
  - `start`/`end` in ISO 8601 UTC. Calling `/app/json/` without params gives HTTP 500.
  - Old host `kp.gfz-potsdam.de` → 301 to `kp.gfz.de` (same path).
- **What it provides:** nowcast + definitive values; `datetime` = start of interval.
- **Fields:** `{"<index>":[floats], "datetime":[ISO], "meta":{"license":"CC BY 4.0","source":"GFZ Potsdam"}}`; Kp/ap/Cp/C9 add `"status":["pre"|"def"]`; Ap → `Apstatus`, SN → `SNstatus`. Kp/Hp values are thirds (0.333, 0.667, …); Hp30/Hp60 open-ended (>9 possible).
- **Cadence / latency measured:** Hp30 every 30 min. The value for the 14:00–14:30Z interval was absent at 14:30:01Z and present at 14:30:32Z → published within ~30–60 s of interval end (value 1.333). The Kp for the *running* 3-h interval (12:00–15:00Z) is already served with `status:"pre"` and was revised during the interval (2.333 at 14:13Z → 2.0 at 14:23Z). Docs: Hpo "provided in near real-time as nowcast values… might change once more data is available".
- **History depth in one call:** 1 year of Hp30 = 17,549 values, 497 KB, 0.5 s; 5 years of Kp = 14,613 values (14,480 `def`, 133 `pre`). No limit encountered.
- **Format:** JSON (`application/json`). Format doc: `https://kp.gfz.de/app/format/json.txt`.
- **Auth:** none.
- **CORS:** none (no `Access-Control-Allow-Origin` on GET or OPTIONS; OPTIONS returns `Allow: OPTIONS, GET, HEAD` only).
- **Terms:** CC BY 4.0 (in every response `meta`). Cite Matzka et al. 2021, Space Weather, doi:10.1029/2020SW002641 (Kp) and Yamazaki et al. 2022 (Hpo). Note: sunspot numbers in the text files are CC BY-NC 4.0.
- **Sample:**
  ```
  {"Hp30":[...,3.0,2.0,2.333,1.333],"datetime":[...,"2026-09-17T13:00:00Z","2026-09-17T13:30:00Z","2026-09-17T14:00:00Z"],"meta":{"license":"CC BY 4.0","source":"GFZ Potsdam"}}
  {"Kp":[2.667,1.667,1.667,1.667,2.0],"datetime":["2026-09-17T00:00:00Z",...,"2026-09-17T12:00:00Z"],"meta":{...},"status":["pre","pre","pre","pre","pre"]}
  ```
- **Plain-text alternative (also verified, no CORS):** `https://kp.gfz.de/fileadmin/files_for_gfz_cms/Hp30_ap30_nowcast.txt` (Last-Modified 14:14:50Z), `Hp60_ap60_nowcast.txt`, `Kp_ap_nowcast.txt`; `-1` = missing; sample row `2026 09 17 13.5 13.75 34593.56250 34593.57292  2.333    9 0`. Format doc `https://kp.gfz.de/app/format/Kp_ap.txt`.
- **Reliability:** fast (0.1–0.5 s), Apache/Debian, no rate-limit statement found anywhere (searched). Python client at `https://kp.gfz.de/app/webservice/python`.

## 1b. GFZ forecast products (JSON/CSV)
Two independent product families exist; neither is on kp.gfz.de.

**(i) SWIFT-driven ensemble forecasts (PAGER pipeline), spaceweather.gfz.de** — Verified: yes.
- `https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.json` (+`.csv`)
- `https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp60_product_file_FORECAST_HP60_SWIFT_DRIVEN_LAST.json` (+`.csv`)
- `https://spaceweather.gfz.de/fileadmin/Kp-Forecast/CSV/kp_product_file_FORECAST_PAGER_SWIFT_LAST.json` (+`.csv`)
- The file names you guessed (`kp_product_file_FORECAST_SWIFT_LAST.json`, `..._PAGER_SWIFT_LAST.json` under `SW-Monitor/`) return 404; the paths above are the real ones (extracted from the product pages' HTML).
- **Fields:** pandas "columns" orientation: `{"Time (UTC)":{"0":"17-09-2026 12:00",...}, "minimum":{...}, "0.25-quantile", "median", "0.75-quantile", "maximum", "prob 4-5", "prob 5-6", "prob 6-7", "prob 7-8", "prob >= 8", "hp30_0".."hp30_7"}` (ensemble members; Kp file has `kp_0..kp_5`). Time format `DD-MM-YYYY HH:MM`. Rows: Hp30 145 (30-min steps), Hp60 73, Kp 25 — first row = current interval, last = +72 h.
- **Latency:** `Last-Modified: 12:05:34Z`, unchanged through 14:31Z → 2.5 h old when fetched; update cadence **not verified** (looks 3-hourly, aligned to Kp intervals).
- **CORS:** none. **Auth:** none. **Terms:** the product page carries a GFZ liability disclaimer; no explicit license on the files — **license not verified**, assume GFZ attribution required.
- **Sample (CSV):**
  ```
  Time (UTC),minimum,0.25-quantile,median,0.75-quantile,maximum,prob 4-5,prob 5-6,prob 6-7,prob 7-8,prob >= 8,hp30_0,...,hp30_7
  17-09-2026 12:00,3.666666,4.333333,4.666666,5.0,5.333333,0.625,0.375,0.0,0.0,0.0,4.666666,5.0,5.333333,4.333333,4.333333,3.666666,5.333333,4.333333
  17-09-2026 12:30,3.333333,3.666666,4.0,4.333333,4.333333,0.625,0.0,0.0,0.0,0.0,4.333333,4.0,4.333333,4.0,3.666666,3.333333,4.333333,3.666666
  ```

**(ii) Hpo forecast from solar-wind models, isdc-data.gfz.de** — Verified: yes.
- Directory (open listing): `https://isdc-data.gfz.de/geomagnetism/HpoForecast/v0102/output/Hpo/json/` with `hpo_forecast_{aceprop,enlil,euhforia,swpc,mean,mean_bars,mean_bars_dark}_{Hp30,Hp60,Kp}.json`.
- **Fields:** `mean_bars_*`: `{"MEDIAN":{"2026-09-17T14:00:00.000":2.0,...},"MAX":{...}}` (145 entries, 3 days at 30 min for Hp30); others flat `{"<ISO time>": value}` (`swpc_Kp` 25 entries). `euhforia_*` was all `-1.0` (missing) at fetch time.
- **Latency:** `Last-Modified: 14:02:30–14:02:46Z` at 14:16Z; first entry is the current half-hour → hourly refresh at ~:02 (inferred from one observation; page states hourly).
- **CORS:** none. **Auth:** none. **Terms:** not stated on the files; product page is GFZ's — treat as GFZ attribution; **not verified**.
- **Sample:** `{"MEDIAN":{"2026-09-17T14:00:00.000":2.0,"2026-09-17T14:30:00.000":2.0,"2026-09-17T15:00:00.000":2.0,"2026-09-17T15:30:00.000":2.67,...},"MAX":{...}}`

# 2. Real-time ground magnetometers

## 2a. FMI IMAGE real-time files (best substorm feed found)
- **Verified:** yes (13 stations fetched; latency measured twice).
- **URL:** `https://space.fmi.fi/image/realtime/UT/<STN>/<STN>data_01.txt` (last hour) and `<STN>data_24.txt` (last 24 h). Stations that exist: `KEV MAS KIL IVA MUO SOD PEL RAN OUJ MEK HAN NUR TAR` (58.3°N TAR → 69.8°N KEV; SOD is SGO's). Norwegian/Swedish IMAGE stations (TRO, KIR, ABK, …) are **not** here (404).
- **Fields:** `YYYY MM DD HH MM SS  X Y Z` in nT (geographic), 10-s cadence, `99999.9` = missing (PEL was all-missing).
- **Latency:** file `Last-Modified 14:24:25Z`, last sample `14:23:50Z` (35 s); refreshed every minute (next LM 14:30:25Z → last 14:29:50Z). SOD ~4 min, OUJ ~2 min behind.
- **History depth:** 360 rows (1 h) or 8,640 rows (24 h, ~400 KB) per file.
- **Format:** text/plain, two header lines. **Auth:** none. **CORS:** none.
- **Terms (live footer, verified in raw HTML):** FMI real-time data from the 12 FMI stations are provided "under the same conditions that apply to the Institute's open data" = **CC BY 4.0**, credit FMI. An older paragraph ("must not be distributed on any other servers… no commercial use") is present but inside an HTML comment (`<!-- -->`), i.e. no longer in force. **SOD is excluded** — contact SGO (see 2f).
- **Sample:**
  ```
  YYYY MM DD HH MM SS     KEV X   KEV Y   KEV Z 
  2026 09 17 14 23 40    10364.8  2701.8 53308.0
  2026 09 17 14 23 50    10365.2  2702.1 53307.6
  ```
- **Reliability notes:** "Data errors and transfer breaks possible without warning". Archive `data_download.php?starttime=YYYYMMDD[HH]&length=<60..14400 min>&format=iaga|text|text2|wdc|jpg|ie-index&sample_rate=<s>&stations=KIR_TRO_SOD` works only up to **2026-08-15** (2026-08-20 onward: "No data") → archive lags ~4–5 weeks; the IL/IU/IE electrojet indicators exist only in that archive (`format=ie-index`), not in real time. Archived data follow IMAGE rules of the road (acknowledgement + Tanskanen 2009; per-institute licenses: TGO/GFZ/DTU/PGI/SI CC BY-NC 4.0, FMI/SGU/IG PAS CC BY 4.0, IRF/SGO "to be decided").

## 2b. INTERMAGNET GIN (BGS) — GINServices and HAPI
- **Verified:** yes (IAGA-2002 GetData, HAPI catalog/info/data, GetDataLagTime, GetCapabilities).
- **URLs:**
  - `https://imag-data.bgs.ac.uk/GIN_V1/GINServices?Request=GetData&format=IAGA2002&testObsys=0&observatoryIagaCode=NUR&samplesPerDay=minute&publicationState=best-avail&dataStartDate=2026-09-17&dataDuration=1` — valid `publicationState`: `best-avail` (= `adj-or-rep`), `reported`, `adjusted`, `quasi-def`, `definitive`, `test`. Your `Best-available` spelling → HTTP 400. `samplesPerDay=second` also works (HRN: 1-s data present).
  - HAPI 3.1: `https://imag-data.bgs.ac.uk/GIN_V1/hapi/catalog` (3,074 datasets), `/info?id=nur/best-avail/PT1M/xyzf`, `/data?id=nur/best-avail/PT1M/xyzf&time.min=2026-09-17T12:00:00Z&time.max=2026-09-17T14:20:00Z&format=json` (CSV default). `time.max` must be ≤ `info.stopDate` or you get HAPI error 1405.
  - Lag: `…GINServices?Request=GetDataLagTime&format=json&observatoryIagaCodeList=NUR,SOD,ABK&dataStartDate=2026-09-17&dataDuration=1` (param is `observatoryIagaCodeList`; without it you get all 154 observatories, 7 MB).
- **Fields:** IAGA-2002 `DATE TIME DOY X Y Z F` (99999.00 missing); HAPI: `Time`, `Field_Vector[3]` (nT), `Field_Magnitude`.
- **Latency measured (lag service at 14:25Z, minute data):** LER 2.1 / ESK 2.0 / HRN 4.0 / NUR 4.1 / BRW 4.0 / HLP 5.0 / NGK 11.1 / NAQ, THL, GDH 13.1 / SOD 21.1 / ABK 26.0 / UPS 26.1 / WNG 26.1 / KIR 32.1 min; **BFE: no live data** (lag ≈ 14 years, 0 non-missing rows today). **LER/ESK/HAD have a 240-hour (10-day) data embargo** (GetCapabilities `DataEmbargoHours: 240`), so today's GetData returns all-missing for them despite the small lag. DOB, LYR, TRO are not INTERMAGNET observatories (HTTP 400).
- **History depth:** ≤366 days per request (minute), 31 days (second); HAPI `maxRequestDuration P366D`. NUR since 1991.
- **Auth:** none. **CORS:** `access-control-allow-origin: *` on both GINServices and HAPI → **browser-callable directly**.
- **Terms:** CC BY-NC 4.0 by default ("provided for non-commercial use; for commercial use… obtain written permission from the institute"); acknowledgement text per `https://intermagnet.org/data_conditions.html`.
- **Sample (HAPI CSV, HRN):**
  ```
  2026-09-17T14:17Z,7608.7800,1583.0000,54436.7500,99999.0000
  2026-09-17T14:18Z,7607.6100,1583.5100,54438.2800,99999.0000
  2026-09-17T14:19Z,7604.5500,1585.8300,54439.6000,99999.0000
  ```
- **Reliability:** a 2.4 MB 1-second download was cut by "connection reset by peer"; the 7 MB lag JSON likewise — keep requests small (minute data, ≤1 day). Behind an F5 load balancer (cookies set).

## 2c. IRF Kiruna (and Tormestorp)
- **Verified:** yes (all files below fetched; latency measured twice).
- **URLs (secondary = current backup magnetometer, use these):**
  - `https://www2.irf.se/maggraphs/rt_iaga_last_hour_secondary.txt` — IAGA-2002, 1-min, actually ~2 h (121 rows), XYZF nT, "Provisional"
  - `https://www2.irf.se/maggraphs/rt_iaga_last_hour_1sec_secondary.txt` — IAGA 1-s, last hour
  - `https://www2.irf.se/maggraphs/rt1hour_secondary.txt` — 1-s, `hh.hhh X Y Z` deflections from monthly mean
  - `https://www2.irf.se/maggraphs/rt_secondary.txt` (1-s, whole day, `yyyymmddhhmmss X Y Z`, 1.85 MB), `rt_iaga_secondary.txt` (1-min, whole day, 857 rows at 14:21Z), `rt_iaga_1sec_secondary.txt`
  - Primary-magnetometer files (`rt_iaga_last_hour_1min_primary.txt`, `rt_last_hour_1min_primary.csv`, `rt_iaga_1sec_primary.txt`): the page labels the primary "DTU (suspended)"; the feed was **stale** (last sample 13:53Z while the file was rewritten at 14:21Z). `rt_iaga_last_24_hours_primary.txt` is 0 bytes. INTERMAGNET's KIR (32-min lag) is this same primary feed.
  - Tormestorp, 56.0°N (S. Sweden): `https://www2.irf.se/maggraphs/tormestorp/2026/09/17/lnd_20260917000000.csv` — 1-s `ISO-time,c1,c2,c3`, 2.1 MB/day, last row 14:26:14Z at Last-Modified 14:26:14Z (~1 min latency at fetch). Page warns "Technical problems with Tormestorp magnetometer".
  - K-index endpoints `preliminary_real_time_k_index_secondary` and `..._15_minutes_secondary` (documented "to be used in apps") were **0 bytes** (Last-Modified 2026-09-16 08:01) — currently broken; K=3 (12–15 UT) and Q=2 (15-min) were only inside the HTML page.
- **Latency:** secondary IAGA file LM 14:20:06Z → last 14:16Z (4 min); 1-s `rt1hour_secondary` LM 14:20:03Z → last 14:18:11Z (~2 min). Files rewritten roughly every 10 min (LM 14:10, 14:20).
- **Auth:** none. **CORS:** `Access-Control-Allow-Origin: https://www3.irf.se` only → **blocked for other origins; proxy needed**.
- **Terms:** no license page found (the "Data license" nav item resolves to the same page). IMAGE table: IRF/KIR "to be decided, for now IMAGE rules of the road". Page: "data is not yet processed and may contain man-made signals".
- **Sample:**
  ```
  DATE       TIME         DOY     KIRX        KIRY    KIRZ      KIRF   |
  2026-09-17 14:16:00.000 260     10468.88    306.38  52398.35  53381.01
  20260917140812  -650.0 -102.5 -215.2          (rt_secondary.txt)
  ```

## 2d. Tromsø Geophysical Observatory (UiT)
- **Verified:** yes — endpoint exists but is **password-protected**.
- `https://flux.phys.uit.no/cgi-bin/mkascii.cgi?site=tro2a&year=2026&month=9&day=17&res=1min&pwd=&format=asciiUnix&comps=XYZ&getdata=+Get+Data+` → `User error - please contact magnar.g.johnsen@uit.no` for every site/date/res combination (also with the `RTData=+Get+Realtime+Data+` button; `format=iaga*` + RTData → "Not realtime for Iaga"). Form params (from `https://flux.phys.uit.no/ascii/`): `site` ∈ nal1a, lyr2a, hop1a, bjn1a, jan1a, nor1a, sor1a, tro2a, and1a, lek1a, rst1a, jck1a, don1a, rvk1a, dob1a, sol1a, har1a, lah1a, kar1a, … plus DTU sites (bfe6d, roe1d, bor2d, sin2d, thl6d…); `res` ∈ 1min | 1minmnt | 10sec; `format` ∈ html | asciiUnix | asciiWin | XYZhtml | iagahtml | iagaUnix | iagaWin; `comps` ∈ DHZ | XYZ | SXYZ; `pwd`.
- Policy (`/div/DataAccess.html`): "Digital data from DTU Space, GFZ and TGO in ASCII format are available here, but are protected by a password. Requests… to DTU Space for Danish/Greenlandic data and to TGO for… Norwegian magnetometers"; TGO data CC BY-NC 4.0 (IMAGE table); "Commercial use of the data is welcome. Agreements must be made directly".
- **Free machine-readable bits:** provisional K-indices, 7 days, 3-hourly: `https://flux.phys.uit.no/Kindice/k_{tro2a,and1a,bjn1a,nal1a,dob1a,bfe6d,lrv1a}.txt` (Tromsø, Andenes, Bjørnøya, Ny-Ålesund, Dombås, Brorfelde, Leirvogur). Last-Modified 12:08–12:17Z → refreshed ~10–17 min after each 3-h boundary. No CORS.
  ```
  K-Indices for Tromso
  16 sep. 2026 5322 3114
  17 sep. 2026 4302 xxxx
  ```
- Real-time plots only: `https://flux.phys.uit.no/Last24/Last24_tro2a.gif` (LM 14:26:17Z), stackplots, electrojet tracker `https://fox.phys.uit.no/AFFECTS/Affects_RTOval.gif`, NOSWE dH indices GIFs.

## 2e. DTU Space (Denmark/Greenland)
- **Verified:** no public numeric real-time endpoint exists. Website: "A data download website at DTU Space is currently under construction… contact Anna Willer". FTP `ftp://ftp.space.dtu.dk/data/Ground_magnetometers/` holds only old archives (1981–89, "Adjusted" 2014–2018 files); `WDC/indices/` has PCN and a Kp mirror.
- Real-time **plots** only: `http://www.spacecenter.dk/files/data/Greenland-magnetometers/DTU_{H,E,Z}_Greenland_{East,West}.png` (LM 14:22:11Z).
- Numeric routes: INTERMAGNET (NAQ/THL/GDH ~13 min lag; **BFE dead** in GIN), TGO password CGI, TGO Brorfelde K-index text (above). License CC BY-NC 4.0 (IMAGE table).

## 2f. Sodankylä Geophysical Observatory (SGO)
- **Verified:** yes.
- `https://www.sgo.fi/pub_mag/Data/SODimg_10s/SODimg_latest.SOD` (~38 h, 10-s), `SODimg_today.SOD`, `SODimg_last24h.SOD`, `SODimg_diff24h.SOD`; `PSMimg_*` = pulsation magnetometer. `SODimg_X_last60.SOD` is stale (July).
- **Fields:** `X Y Z yymmdd hhmmss` (nT, UT). **Latency:** LM 14:21:26Z, last 14:20:40Z; ~2.5 min at fetch. No `Content-Type`, no CORS, no auth.
- **Terms (SGO Data Licence):** free for academic research; "use or reproduction of data for commercial purpose requires prior written permission from SGO, and it is generally not free of charge"; "Typically SGO requires co-authorship if SGO data are to be published in any media" → not suitable for a public dashboard without an agreement.
- Sample: ` 11057.1  2731.2 52217.2 260917 142040`

## 2g. SuperMAG
- **Verified:** API shape and auth behaviour yes; data content no (requires account).
- URLs (from the official Python client source, `supermag_api.py`): `https://supermag.jhuapl.edu/services/indices.php?fmt=json&logon=YOURNAME&start=2019-10-15T10:40&extent=3600&all`, `services/data-api.php?...&station=NCK`, `services/inventory.php?...`; `extent` in seconds. Without `logon` → HTTP 200 body `ERROR: No username`. Free registration required ("to ensure future funding").
- **Real-time:** FAQ: "SuperMAG is not funded to provide real-time or near-real-time data"; news shows 1-min data for 2023 released April 2024, holdings updated July 2025 → typically ≥1 year behind. Exact latest date **not verified**.
- **CORS:** none seen. **Terms:** "fair use", **no redistribution**, acknowledge collaborators + Gjerloev 2012; co-authorship for key stations. Not usable for a nowcast.

## 2h. Kyoto WDC real-time AE/AL
- **Verified:** yes.
- Real time = **plot only**: `https://wdc.kugi.kyoto-u.ac.jp/ae_realtime/202609/rtae_20260917.png` (LM 14:00:18Z then 14:20:13Z → ~20-min refresh; `Access-Control-Allow-Origin: *`).
- Digital quick-look ASCII: `https://wdc.kugi.kyoto-u.ac.jp/ae_realtime/data_dir/YYYY/MM/DD/{ae,al,ao,au}YYMMDD` — latest day available on 2026-09-17 was **2026-09-06** (≈11-day delay; readme says ≤3 weeks). WDC-like format, one line per hour with 60 minute values. No CORS on the files. Useless for a nowcast; fine for climatology/calibration.
- Sample: `AEALAOAU    260906E00AE QUICKLK       25    25    23    23    21 …`

# 3. Other European feeds checked
- **NOSWE / UiT aurora nowcasts:** `https://spaceweather2.uit.no/noswe/Aurora/Nowcast/{global,kho,oslo,bergen,brocken,hamburgersternwarte}.jpg` (LM 14:23:49Z), `…/noswe/pics/{Kp,RX,dH-Norge,dH-Sverige,dH-Fin}.*` — **images only**, no JSON/text found. Acknowledge NOSWE/TGO.
- **All-sky cameras:** TGO Skibotn `https://fox.phys.uit.no/ASC/ASC01.html` (images, 1/min when Sun < −2°); SGO `https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest_keogram.jpg` (LM 02:32Z — last night); IRF Kiruna `rtasc.php` still points at `LASTv2.JPG` dated 2020 and an archive to 2020 → **stale/not verified live**. No keogram data endpoints anywhere.
- **FMI "Auroras Now!"**: officially terminated ("active maintenance… has been terminated"); products moved to `https://en.ilmatieteenlaitos.fi/auroras-and-space-weather` and `https://rwc-finland.fmi.fi/` which embed PNGs only (`space.fmi.fi/image/realtime/K/NUR_QUASI_K1.png`, `…/SSA/sumgic_FI_RWC_SSA.png`, `~avs/uudet_nettisivut/magforecast_cropped.png`); `.txt` variants 404.
- **ESA SWE Service Network:** HAPI at `https://swe.ssa.esa.int/hapi/*` → HTTP 401; requires portal registration + M2M OIDC client credentials (token from `https://sso.s2p.esa.int/realms/swe/protocol/openid-connect/token`, `scope=swe_hapiserver`, 5-min tokens). Not viable for a public page.
- **IRF Lund dB/dt 30-min forecast:** `https://spaceweather.irf.se/content/irf-dbdt.png` — image only.

# Ranked recommendation

**(a) Official activity-index nowcast**
1. **GFZ Hp30 + ap30 via `kp.gfz.de/app/json/`** — 30-min cadence, published ≤1 min after interval end (measured), CC BY 4.0, a year of history in one 0.5-s call; add `index=Kp` from the same API for the running-interval Kp (`status:"pre"`). For the +30…+120 min horizon, layer the GFZ **ISDC `hpo_forecast_mean_bars_Hp30.json`** (hourly, MEDIAN/MAX per half-hour) and the **SWIFT-driven Hp30 quantile/probability file** (older, ~3-hourly). All GFZ endpoints lack CORS → **server-side proxy required** (a tiny cache that re-fetches each :00/:30 + 1 min is enough).
2. Fallback: GFZ plain-text `Hp30_ap30_nowcast.txt` (same data, same proxy).

**(b) Substorm-onset signal (negative bay in X/H)**
1. **FMI IMAGE real-time 10-s files** (`space.fmi.fi/image/realtime/UT/<STN>/<STN>data_01.txt`, 12 stations 58–70°N incl. KEV/KIL/MAS/IVA/MUO on the auroral oval and NUR/HAN/TAR sub-auroral) — ~35–60 s latency, CC BY 4.0, 24-h history file. No CORS → **proxy** (fetch once per minute for the 4–6 stations you need, compute ΔX against a quiet baseline and dX/dt server-side).
2. **INTERMAGNET GIN / HAPI** — the only feed a **browser can call directly** (`Access-Control-Allow-Origin: *`): NUR and HRN (4-min lag), NAQ/THL/GDH (13 min) give a west-to-east chain; ABK/UPS/SOD/KIR are 20–30 min behind and BFE/LER/ESK are unusable (dead feed / 10-day embargo). Caveat: CC BY-NC (non-commercial) and variable lag — use as browser-only fallback or cross-check, not as the primary trigger.
3. Optional extra auroral-zone station via proxy: **IRF Kiruna secondary** 1-s/1-min files (2–4 min latency; CORS locked to irf.se). Tormestorp gives a 56°N mid-latitude view but is flagged as having technical problems.

Not suitable for nowcasting: SuperMAG (login, no real-time), Kyoto AE ASCII (11+ days), DTU (no numeric endpoint), TGO magnetograms (password), SGO (restrictive license), ESA SWE (auth). TGO's 3-hourly K-index text files and Kyoto's/NOSWE's images are fine as context panels only.
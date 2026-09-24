<!-- Research report produced by a background research agent on 2026-09-24; every item marked verified was fetched that day. Consolidated in substorms_auroral_zone.md. -->
# Substorms vs Kp for aurora observers at 67–70°N (Tromsø / Lapland) — verified source notes

Status: PARTIAL (being extended). Every number below is tagged with the URL actually fetched. "UNVERIFIED" marks things I could not confirm from a primary source.

Observer sites used: Tromsø 69.65°N 18.96°E (IMAGE table: TRO CGM 66.64°N, Frøystein & Johnsen 2025: 66.5°N CGM); Kiruna 67.84°N 20.42°E (CGM 64.69°); Muonio 68.02°N 23.53°E (CGM 64.72°); Rovaniemi ≈ 66.5°N 25.7°E (between PEL 63.55° and RAN 62.09° CGM → ≈63.2° CGM, interpolated); Abisko 68.35°N 18.82°E (CGM 65.30°); Kevo 69.76°N 27.01°E (CGM 66.32°). CGM values are the IMAGE epoch-2001 values (see §2a).

---

## 1. Auroral oval boundaries vs Kp (poleward boundary matters at 67–70°N)

### 1a. Sigernes et al. 2011, JSWSC 1, A03, "Two methods to forecast auroral displays" — VERIFIED (full text)
- Fetched: PDF mirror https://pdfs.semanticscholar.org/8e62/58c16779a904624620895aa05416d13e71c9.pdf (publisher site swsc-journal.org returned 403/captcha to both WebFetch and curl). DOI 10.1051/swsc/2011003. Open access (CC BY-NC 3.0).
- Kp→AL (Starkov 1994b), eq. (1): `AL = c0 + c1·Kp + c2·Kp² + c3·Kp³`, Table 1: c0 = 18, c1 = −12.3, c2 = 27.2, c3 = −2.0 (nT). ("The range of the index is of the order of ± 800 nT.")
- Boundary shape (Starkov 1994a), eq. (2), corrected geomagnetic COLATITUDE θm in degrees:
  `θm = A0m + A1m·cos[15(t + α1m)] + A2m·cos[15(2t + α2m)] + A3m·cos[15(3t + α3m)]`
  t = local (magnetic) time in decimal hours, A in degrees, α in decimal hours; m = 0 poleward boundary, m = 1 equatorward boundary of the oval, m = 2 equatorward boundary of diffuse aurora.
- Coefficient dependence on activity, eq. (3): `Aim or αim = b0m + b1m·log10|AL| + b2m·log10²|AL| + b3m·log10³|AL|`.
- Appendix A (Starkov 1994a coefficients), quoted exactly (columns A0, A1, A2, A3 [deg]; α1, α2, α3 [h]):

  m = 0, poleward boundary of the auroral oval
  | | A0 | A1 | A2 | A3 | α1 | α2 | α3 |
  |---|---|---|---|---|---|---|---|
  | b0 | −0.07 | −10.06 | −4.44 | −3.77 | −6.61 | 6.37 | −4.48 |
  | b1 | 24.54 | 19.83 | 7.47 | 7.90 | 10.17 | −1.10 | 10.16 |
  | b2 | −12.53 | −9.33 | −3.01 | −4.73 | −5.80 | 0.34 | −5.87 |
  | b3 | 2.15 | 1.24 | 0.25 | 0.91 | 1.19 | −0.38 | 0.98 |

  m = 1, equatorward boundary of the auroral oval
  | | A0 | A1 | A2 | A3 | α1 | α2 | α3 |
  |---|---|---|---|---|---|---|---|
  | b0 | 1.61 | −9.59 | −12.07 | −6.56 | −2.22 | −23.98 | −20.07 |
  | b1 | 23.21 | 17.78 | 17.49 | 11.44 | 1.50 | 42.79 | 36.67 |
  | b2 | −10.97 | −7.20 | −7.96 | −6.73 | −0.58 | −26.96 | −24.20 |
  | b3 | 2.03 | 0.96 | 1.15 | 1.31 | 0.08 | 5.56 | 5.11 |

  m = 2, equatorward boundary of the diffuse aurora
  | | A0 | A1 | A2 | A3 | α1 | α2 | α3 |
  |---|---|---|---|---|---|---|---|
  | b0 | 3.44 | −2.41 | −0.74 | −2.12 | −1.68 | 8.69 | 8.61 |
  | b1 | 29.77 | 7.89 | 3.94 | 3.24 | −2.48 | −20.73 | −5.34 |
  | b2 | −16.38 | −4.32 | −3.09 | −1.67 | 1.58 | 13.03 | −1.36 |
  | b3 | 3.35 | 0.87 | 0.72 | 0.31 | −0.28 | −2.14 | 0.76 |

  (Cross-checked against the same table in Sigernes et al., "Real time aurora oval forecasting – SvalTrack II", https://aurora.unis.no/doc/Sigernes_Oval.pdf, Table 2 — identical values.)
- Zhang & Paxton 2008 as implemented by Sigernes: Epstein function for electron energy flux Q (erg cm⁻² s⁻¹) with Fourier-in-MLT coefficients per Kp bin (bin centres k = 0.75, 2.25, 3.75, 5.25, 7.00, 9.00), hemispheric power interpolation `HP(Kp) = 38.66·exp(0.1967·Kp)` for Kp ≤ 5 and `4.592·exp(0.4731·Kp)` for Kp > 5 (GW); oval boundary = flux threshold `Qmin = 0.25 erg cm⁻² s⁻¹`. Full Appendix B coefficients are in the PDF (not reproduced here).
- Statements: "The Zhang & Paxton (2008) ovals are wider in latitude than the Starkov (1994a) ovals. The nightside model ovals coincide fairly well in shape for low to normal auroral conditions." Table 3 gives Kp 0…9 activity labels (0 Minimum, 1 Quiet, 2 Low, 3 Moderate, 4 Active, 5 High, 6 High+, 7 High++, 8 High+++, 9 Maximum) and Qmax (mW m⁻²): 1.65, 2.10, 3.20, 4.34, 5.34, 6.45, 8.36, 12.18, 12.91, 18.10.
- Tromsø/Longyearbyen-in-or-out-of-oval statement: NOT in the paper. The only site-specific statements are for Longyearbyen (78.2°N, 16.0°E): "magnetic noon or cusp located over the site at ~08:50 UT" (→ magnetic midnight at Longyearbyen ≈ 20:50 UT) and "It is possible to view both the day- and nightside aurora from this location midwinter." UNVERIFIED: any published Kp threshold for Tromsø from UNIS/KHO (the KHO page https://kho.unis.no/AuroraForecast.html only says "If you have a clear view of the oval above your head, seen in the Aurora Compass, then you have up to 75% chance to see the aurora").

### 1b. Carbary 2005, Space Weather 3, S10001, "A Kp-based model of auroral boundaries" — PARTIAL
- Wiley full text (https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2005SW000162) returned 403 to WebFetch and a captcha page to curl; Semantic Scholar lists the open-access PDF only at Wiley. Coefficient tables therefore UNVERIFIED so far.
- Verified from the abstract text surfaced by search (Wiley page): boundaries from Polar UVI images binned by Kp, intensity threshold "4 photons cm−2 s−1"; "The boundary and peak locations vary linearly with Kp index, and the coefficients of the linear fits are tabulated for each MLT"; "As a general rule of thumb, the UV intensity peak shifts 1° in magnetic latitude for each increment in Kp. The fits are surprisingly good for Kp < 6 but begin to deteriorate at high Kp".

### 1c. Zhang & Paxton 2008 (JASTP 70, 1231–1242) — PARTIAL
- Paywalled (ScienceDirect). Boundary definition and Kp-bin structure verified via Sigernes 2011 (above): boundary = 0.25 erg cm⁻² s⁻¹ flux contour; six Kp bins. Explicit midnight boundary latitudes vs Kp: UNVERIFIED (to be computed from the Sigernes Appendix B coefficients if time permits).

### 1d. Holzworth & Meng 1975 (GRL 2, 377) — VERIFIED via a code implementation
- Fetched: SPEDAS IDL file https://stereo-ssc.nascom.nasa.gov/instruments/software/impact/TDAS/socware/spedas_5_0/idl/general/missions/fast/fa_general/fast_orbit/auroral_zone.pro ("See Holzworth & Meng, GRL 2, p. 377, 1975"). Companion file plot_fa_crossing.pro gives the formula "θ = A1 + A2 cos(φ + A3) + A4 cos(2φ + 2A5) + A6 cos(3φ + 3A7), θ = corrected geomagnetic co-latitude, φ = 2π(MLT)/24".
- auroral_zone.pro form: `t = A0 + A1 cos(φ + A2) + A3 cos(2(φ + A4)) + A5 cos(3(φ + A6))`, φ = (MLT − 12)/12·π (columns 0,1,3,5 in degrees; 2,4,6 in radians), colatitude t in degrees.
- Poleward boundary (Q = 0…6): [15.22, 2.41, 3.34, −0.85, 1.01, 0.32, 0.90]; [15.85, 2.70, 3.32, −0.67, 1.15, 0.49, 1.00]; [16.09, 2.51, 3.27, −0.56, 1.30, 0.42, 0.94]; [16.16, 1.92, 3.14, −0.46, 1.43, 0.32, 0.96]; [16.29, 1.41, 3.06, −0.09, 1.35, 0.40, 1.03]; [16.44, 0.81, 2.99, 0.14, 1.25, 0.48, 1.05]; [16.71, 0.37, 2.90, 0.63, 1.59, 0.60, 1.00].
- Equatorward boundary (Q = 0…6): [17.36, 3.03, 3.46, 0.42, 2.11, −0.25, 1.13]; [18.66, 3.90, 3.37, 0.16, 2.55, −0.13, 0.96]; [19.73, 4.69, 3.34, −0.57, −1.41, −0.07, 0.75]; [20.63, 4.95, 3.31, −0.66, −1.28, 0.30, −0.58]; [21.56, 4.93, 3.31, −0.44, −0.81, −0.07, −0.75]; [22.32, 4.96, 3.29, −0.39, −0.72, −0.16, −0.52]; [23.18, 4.85, 3.34, −0.38, −0.62, −0.53, −0.16].
- Q is Feldstein's 15-min activity index (0 quiet … 6+ active); the Q↔Kp mapping is not one-to-one (Starkov 1994b gives polynomial conversions; Breedveld thesis p.26–28 confirms AL = c0 + c1 M + c2 M² + c3 M³ with M = Q, Kp or AE). Treat Q ≈ Kp only as a rough guide.

### 1e. Other verified boundary statements
- Breedveld 2020 UNIS MSc thesis (POES TED electrons, 2012), http://aurora.unis.no/doc/Master_thesis_Mikkel.pdf: "Figure 4.1 shows the equatorward boundary to be located at approximately 65° ILAT around midnight MLT, approaching 75° ILAT around noon, for low levels of magnetic disturbance. Under the same conditions, the poleward boundary is located approximately between 70° ILAT and 80° ILAT." … "As the Kp increases, the equatorward boundary expands equatorwards (by almost 10° ILAT on the nigthside), while the poleward boundary moves only a few degrees towards the equator. This increases the width of the auroral oval significantly on the nightside".
- UAF Geophysical Institute aurora forecast page, https://www.gi.alaska.edu/monitors/aurora-forecast: "The 'quiet' state of the aurora is on average a thin oval band situated around 67-68 degrees in geomagnetic latitude" and "Inside the auroral oval, however, Kp is less relevant, since even when global activity is low, auroral activity can be high."

(Model table of midnight boundaries vs Kp: see §6 — computed from the verified Starkov/Sigernes coefficients and Holzworth-Meng coefficients.)

---

## 2. Local ground data near Tromsø

### 2a. IMAGE station list — VERIFIED
- Fetched https://space.fmi.fi/image/www/index.php?page=stations. "Corrected Geomagnetic Coordinates (CGM) were calculated for the year 2001 (altitude 0 km) by the online service at https://omniweb.gsfc.nasa.gov/vitmo/cgm.html."

| Code | Name | Geo lat | Geo lon | CGM lat | CGM lon | Inst. |
|---|---|---|---|---|---|---|
| NAL | Ny Ålesund | 78.92 | 11.95 | 75.25 | 112.08 | TGO |
| LYR | Longyearbyen | 78.20 | 15.82 | 75.12 | 113.00 | TGO |
| HOR | Hornsund | 77.00 | 15.60 | 74.13 | 109.59 | IGF |
| HOP | Hopen Island | 76.51 | 25.01 | 73.06 | 115.10 | TGO |
| BJN | Bear Island | 74.50 | 19.20 | 71.45 | 108.07 | TGO |
| NOR | Nordkapp | 71.09 | 25.79 | 67.73 | 109.39 | TGO |
| SOR | Sørøya | 70.54 | 22.22 | 67.34 | 106.17 | TGO |
| ALT | Alta | 69.86 | 22.96 | 66.63 | 106.21 | FMI |
| KEV | Kevo | 69.76 | 27.01 | 66.32 | 109.24 | FMI |
| TRO | Tromsø | 69.66 | 18.94 | 66.64 | 102.90 | TGO |
| MAS | Masi | 69.46 | 23.70 | 66.18 | 106.42 | FMI |
| AND | Andenes | 69.30 | 16.03 | 66.45 | 100.37 | TGO |
| KIL | Kilpisjärvi | 69.06 | 20.77 | 65.94 | 103.80 | FMI |
| KAU | Kautokeino | 69.02 | 23.05 | 65.77 | 105.59 | FMI |
| IVA | Ivalo | 68.56 | 27.29 | 65.10 | 108.57 | FMI |
| ABK | Abisko | 68.35 | 18.82 | 65.30 | 101.75 | SGU |
| LEK | Leknes | 68.13 | 13.54 | 65.40 | 97.50 | TGO |
| MUO | Muonio | 68.02 | 23.53 | 64.72 | 105.22 | FMI |
| LOZ | Lovozero | 67.97 | 35.08 | 64.23 | 114.49 | PGI |
| KIR | Kiruna | 67.84 | 20.42 | 64.69 | 102.64 | IRF |
| RST | Røst | 67.52 | 12.09 | 64.88 | 95.90 | TGO |
| SOD | Sodankylä | 67.37 | 26.63 | 63.92 | 107.26 | SGO |
| PEL | Pello | 66.90 | 24.08 | 63.55 | 104.92 | FMI |
| JCK | Jäckvik | 66.40 | 16.98 | 63.51 | 98.31 | TGO |
| DON | Dønna | 66.11 | 12.50 | 63.38 | 95.23 | TGO |
| RAN | Ranua | 65.90 | 26.41 | 62.09 | 105.91 | FMI |
| RVK | Rørvik | 64.94 | 10.98 | 62.23 | 93.31 | TGO |
| LYC | Lycksele | 64.61 | 18.75 | 61.44 | 99.29 | SGU |
| OUJ | Oulujärvi | 64.52 | 27.23 | 60.99 | 106.14 | FMI |
| MEK | Mekrijärvi | 62.77 | 30.97 | 59.10 | 108.45 | FMI |
| HAN | Hankasalmi | 62.25 | 26.60 | 58.69 | 104.54 | FMI |
| DOB | Dombås | 62.07 | 9.11 | 59.29 | 90.20 | TGO |
| SOL | Solund | 61.08 | 4.84 | 58.53 | 86.26 | TGO |
| NUR | Nurmijärvi | 60.50 | 24.65 | 56.89 | 102.18 | FMI |
| UPS | Uppsala | 59.90 | 17.35 | 56.51 | 95.84 | SGU |
| KAR | Karmøy | 59.21 | 5.24 | 56.43 | 85.67 | TGO |
| TAR | Tartu | 58.26 | 26.46 | 54.47 | 102.89 | FMI |
(Full 60-station table incl. Greenland/Iceland/Baltic/German stations was fetched; only the Fennoscandian subset is reproduced.)
- Independent check: Frøystein & Johnsen 2025 (Ann. Geophys. 43, 241, https://angeo.copernicus.org/articles/43/241/2025/) Table 1: TRO 69.66°N 19.20°E, CGM 66.5°N 102.4°E; AND 69.30°N 16.01°E, CGM 65.9°N; BJN 74.53°N, CGM 71.5°N; LYR 78.16°N, CGM 75.3°N; NAL 78.93°N, CGM 76.2°N; DOB 62.07°N, CGM 57.9°N (their epoch differs from IMAGE's 2001).

### 2b. IMAGE IL / IU / IE definition — VERIFIED
- FMI page https://space.fmi.fi/image/www/?page=il_index: "IL(t) = min({∆X(t)})", "IU(t) = max({∆X(t)})", "IE = IU − IL", where ∆X is "the variation of (geographic) north components of the magnetic field measured at the selected stations relative to quiet time baselines"; baseline "determined automatically by considering all 3-hour intervals 00-03, 01-04, ..., 21-24 UT in the selected time interval" and choosing "the interval with the smallest average range" across all sites; "Their definition is quite similar to that of the standard AL, AU and AE indices." Station subset is not listed on the page (it is the whole network above a latitude limit in the real-time product).
- Kauristie et al. 1996, Ann. Geophys. 14, 1177–1185 (PDF fetched: https://angeo.copernicus.org/articles/14/1177/1996/angeo-14-1177-1996.pdf): "The local AE indices were constructed with exactly the same procedure as the global AE indices. The base-line values were defined for each month using the average H-component values of the five internationally quiet days (H = √(X²+Y²) …). After subtracting the base lines the H-components of the six stations were superposed and the envelope curves were used as local AU or AL indices, when positive or negative, respectively." Chain: EISCAT Magnetometer Cross 1985–1987, "covers magnetic latitudes 63°–67°". Key results: "the local indices are close (within relative error of 0.2) to the global AU and AL during periods 1500–2000 UT (~1730–2230 MLT) and 2130–0130 UT (~0000–0400 MLT), respectively"; "hereafter we use only UT-periods from which the approximate MLT-sectors are obtained by adding 2.5 h"; "The EISCAT Cross sees ≥70% of the AU activity events during 1430–1700 UT and the AL activity events during 2130–0100 UT"; "when the local chain records significant activity it yields a better representation of the activity than the global index".
- Tanskanen 2009 (JGR 114, A05204, DOI 10.1029/2008JA013682): PRIMARY PDF NOT FETCHED (Wiley 403; Aalto repository 403). Onset criterion "a rapid decrease in the IL index exceeding 80 nT in 15 min, leading to a negative bay development" is quoted consistently in secondary open sources (search snippets from Tanskanen 2011 JGR and later papers) — treat as "verified by secondary quotation".
- Partamies et al. 2021, Ann. Geophys. 39, 69 (https://angeo.copernicus.org/articles/39/69/2021/): regional Lapland IL variant from Kevo, Kilpisjärvi, Muonio, Abisko, Sodankylä; long-term median baseline "−50 nT"; local index "corresponds well to the global AL index in the magnetic midnight sector (20:00–02:00 UT in Lapland)".

### 2c. Electrojet-centre latitude from a meridional chain — PARTIAL
- Kauristie 1996 does not derive the electrojet latitude from Z (checked the full text); it uses envelope indices only. IMAGE's operational product is "1-D equivalent currents" (https://space.fmi.fi/image/www/index.php?page=equiv_currents_1D: "From ground magnetometer data the ionospheric equivalent currents can be calculated. These are currents that flow only within the ionospheric plane (assumed at 100 km altitude)" … "Ionospheric equivalent currents are not necessarily equal to the actual currents!"). Method details (1-D SECS / upward continuation, Vanhamäki & Juusola) — to be added if fetched; otherwise UNVERIFIED here. Physical rule of thumb (textbook, not fetched): for an east-west line current the Z perturbation changes sign directly beneath the current, so the latitude where ΔZ crosses zero between stations with opposite ΔZ signs marks the electrojet centre; ΔX is extremal there.

### 2d. Tromsø Geophysical Observatory K index — VERIFIED
- Frøystein, I. & Johnsen, M. G. (2025), Ann. Geophys. 43, 241–269, https://doi.org/10.5194/angeo-43-241-2025 (fetched HTML): "three different K9 limits spanning the range from 750 to 2000 nT are used"; Table 4: 750 nT Dombås (DOB); 1800 nT Longyearbyen (LYR) and Ny-Ålesund (NAL); "the K9 limit of 2000 nT is shared between AND, TRO and BJN". Test with a lower limit for TRO: "the 1500γ limit is a better fit for the variation experienced at the TRO station" / "the lower limit for K=9 of 2000 nT is too high for TRO", but "the threshold should be kept as is" for continuity. Scaling rule: "the ranges for each station are adjusted to the latitude. This is done by scaling the Niemegk ranges … by a set lower limit for K=9, the K9 limit."
- TGO K-index pages https://flux.phys.uit.no/Kindice/ and https://flux.phys.uit.no/Kindice/Listindex.html show provisional K for Ny-Ålesund, Bjørnøya, Tromsø, Andenes, Leirvogur, Dombås, Brorfelde but carry no K9 numbers on the page itself.
- Standard class limits (Niemegk, K9 = 500 nT): 0, 5, 10, 20, 40, 70, 120, 200, 330, 500 nT — ISGI (https://isgi.unistra.fr/what_are_kindices.php) states "NGK's classes of range limits are multiply by the (L9PAF / L9NGK) = (750 / 500) factor" (the numeric table there is an image). Applying the factor 2000/500 = 4 for Tromsø: K = 0,1,…,9 lower limits 0, 20, 40, 80, 160, 280, 480, 800, 1320, 2000 nT (INFERRED from the verified scaling rule; with the 1500 nT limit: 0, 15, 30, 60, 120, 210, 360, 600, 990, 1500 nT).
- TGO "Activity Index" page https://flux.phys.uit.no/ActIx/: "an index describing the average deviation of the horizontal field component from its normal value", Tromsø "(in the auroral zone)". No thresholds given.

### 2e. Magnetic midnight (UT) — VERIFIED
- Tromsø / EISCAT cross meridian: Kauristie 1996 — MLT ≈ UT + 2.5 h ("approximate MLT-sectors are obtained by adding 2.5 h"; "2130–0130 UT (~0000–0400 MLT)") → magnetic midnight ≈ 21:30 UT at the Tromsø–Kiruna–Kilpisjärvi meridian (CGM lon ≈ 103°).
- Finland (FMI, https://www.ilmatieteenlaitos.fi/missa-ja-milloin): "Se saavuttaa huippunsa noin kello 23.30, jolloin on magneettinen keskiyö" (peak ≈ 23:30 Finnish time = 21:30 UT). Partamies et al. 2021: "magnetic midnight sector (20:00–02:00 UT in Lapland)".
- Longyearbyen: Sigernes 2011 "magnetic noon or cusp located over the site at ~08:50 UT" → magnetic midnight ≈ 20:50 UT (CGM lon 113°).
- Station-by-station estimate from CGM longitude (1 h per 15° of CGM longitude, anchored on 21:30 UT at 103°; INFERRED): Tromsø/Kiruna/Abisko (102–103°) ≈ 21:30 UT; Muonio (105.2°) ≈ 21:21 UT; Rovaniemi/Pello (≈105°) ≈ 21:22 UT; Sodankylä (107.3°) ≈ 21:13 UT; Kevo (109.2°) ≈ 21:05 UT.
- NOSWE (https://site.uit.no/spaceweather/aurora-borealis/): "auroras can be seen best in the evening between 20:00-02:00" (local time, Tromsø).

---

## 3. Guidance from local observatories/scientists

- FMI "Auroras Now" / R-index (https://space.fmi.fi/image/realtime/SSA/r-index/information/): index from "a 10-minute interval of geomagnetic data with a time resolution of 10 seconds. For each component (X, Y, Z), the absolute values of the differences of 10-second averages are summed"; "The last 5 minutes of data are used with a weight factor 1 and the previous 5 minutes with a weight 0.5"; "After this, a station-specific constant is deducted … chosen to correspond to the quiet-time value"; dividing by 1440 converts to nT/s (Laitinen slides say 1350). Yellow = "a 50 % probability of weak auroras. Strong auroras are usually not seen at this value of R." Red = "a 50 % probability of strong auroras. Probability of some (at least weak) auroras at this index value is considerably over 50 %." "The thresholds have been determined by statistical comparison with all-sky camera data." Per-station numeric thresholds are not published on the page (UNVERIFIED numerically).
- FMI press release 24 Jan 2024 (https://en.ilmatieteenlaitos.fi/press-release/4h8gM2x3Us7CW2xjVJYMvB and Finnish https://www.ilmatieteenlaitos.fi/tiedote/1AzhRj798YxiiH2Ay1m9Wm): thresholds set from "146,747 pictures from aurora borealis cameras from Kevo, Muonio, and Hankasalmi" containing "463 hours of aurora displays"; R computed every 5 min; contact Tiera Laitinen. Interpretation guide (https://www.ilmatieteenlaitos.fi/avaruussaatiedotuksen-tulkintaohje): "Alempi kynnysarvo vastaa noin 50 prosentin todennäköisyyttä vähäisille, heikoille revontulille" / "Ylempi kynnysarvo vastaa noin 50 prosentin todennäköisyyttä kirkkaille tai laajoille revontulille"; thresholds derived for the three camera stations and interpolated to other northern sites, scaled to southern sites with K-index coefficient ratios; "Revontulten näkyminen on tilastollisesti todennäköisintä keskiyöllä ja pari tuntia sen molemmin puolin."
- FMI legacy 10-min service (https://space.fmi.fi/~kakis/AN/AN_10min_en.html): "The bar plots show the maxima changes in the horizontal magnetic field components in units 0.01 nT/s with 10 min resolution"; "An hour is considered as disturbed if the value in scale of the plot exceeds 30 in Nurmijärvi, 35 in Hankasalmi, 42 in Oulujärvi, 50 in Sodankylä, 52 in Muonio or 57 in Kevo and Kilpisjärvi" (i.e. 0.30, 0.35, 0.42, 0.50, 0.52, 0.57 nT/s).
- FMI climatology (https://en.ilmatieteenlaitos.fi/auroras-in-finland and https://space.fmi.fi/aurorasnow/auroras-in-finland/): auroral nights "at Kilpisjärvi: 75 % of nights", "in Lapland (e.g. ski resorts Ylläs, Levi, Saariselkä): roughly 50 % of nights", "in the central part of Finland (e.g. Oulu, Kuusamo): roughly 25 % of nights", "on the south coast (e.g. Helsinki, Turku): once in a month on average"; "In Lapland auroras are quite common always, even during solar minimum"; "Finland is on the southern rim of the auroral oval"; "Geomagnetic activity is closely linked with auroras: when the activity level exceeds a location-specific threshold, it is probable to see auroras." Finnish page: "Sodankylän seuduilla keskimäärin joka toisena yönä nähdään revontulia".
- NOSWE / TGO (https://site.uit.no/spaceweather/aurora-borealis/): "statistically speaking there are some kind of auroras on every other night over Tromsø"; recommends the "geomagnetic time series" plots to look for "large, rapid changes"; Kp described as "higher the index value is the further south the aurora can be seen"; "a Kp level of 8 is reached 100 times per solar cycle of ~11 years, and a Kp 9 only 4 times per cycle". NOSWE's Tromsø forecast uses SvalTrack II (Kp-driven ovals) plus a dB/dt nowcast in nT/s and a "geomagnetic summary" with Quiet/Moderate/Active classes (numeric class limits not found).
- UAF Geophysical Institute (https://www.gi.alaska.edu/monitors/aurora-forecast): "Kp index is derived from 3-hour averages … to characterize global magnetic activity… However, local conditions could be quite different from global activity." "Inside the auroral oval, however, Kp is less relevant, since even when global activity is low, auroral activity can be high." Recommends local magnetometers, aurora cameras, OVATION, social media for real-time information.
- Space Weather Canada (https://spaceweather.gc.ca/forecast-prevision/short-court/desc-en.php): hourly range (max − min within an hour) classes, nT. Auroral zone: quiet 0–93, unsettled 94–168, active 169–299, stormy 300–874, major storm ≥875. Polar cap: 0–55, 56–100, 101–179, 180–524, ≥525. Sub-auroral: 0–23, 24–43, 44–77, 78–227, ≥228.
- AuroraWatch UK, Case et al. 2017, Earth and Space Science 4, 746–754, DOI 10.1002/2017EA000328 (PDF fetched: https://eprints.lancs.ac.uk/88521/1/Case_et_al_2017_Earth_and_Space_Science.pdf): Table 1 — Green A < 50 nT "No significant activity"; Yellow 50 ≤ A < 100 "Aurora may be visible by eye from Scotland and may be visible by camera from Scotland, northern England, and Northern Ireland"; Amber 100 ≤ A < 200 "Aurora is likely to be visible by eye from Scotland, northern England, and Northern Ireland; possibly visible from elsewhere in the UK"; Red A ≥ 200 "It is likely that aurora will be visible by eye and camera from anywhere in the UK." Activity index: deviation from a quiet-day curve (mean of the five quietest days of the month, Fourier-smoothed) in H and E, or the maximum hourly range, "Whichever of the disturbance level or the hourly range is greater, in either H or E, is used as the activity index"; hourly value latches at the hour's maximum; primary station Crooktree, 58.98°N geomagnetic. "The thresholds and descriptions for each activity level have been determined based on extensive past experience of where in the UK the aurora is seen at certain levels of geomagnetic activity … these levels are not based on some fixed physical parameter". Also: "We note that the rate of change of the magnetic field (i.e., dB/dt) can also prove as a useful auroral indicator (Kauristie et al., 2016)". Dataset: >150,000 h, "nearly 9,000 h of enhanced geomagnetic activity".
- IRF Kiruna (https://www2.irf.se/Observatory/?link=Magnetometers): real-time XYZ in nT, preliminary K every 3 h; no published aurora-alert nT threshold found (UNVERIFIED). The 700 nT (photographic) / 1300 nT (naked eye) Kiruna-deflection rules of thumb come from SpaceWeatherLive (https://www.spaceweatherlive.com/en/help/the-kiruna-magnetometer.html) and apply to "lower European middle latitudes", not to Lapland; quiet-time X at Kiruna "about 10685 nT" (same page).

---

## 4. Local magnetic deflection vs visible aurora (calibrations)

- FMI R-index calibration (see §3): 146,747 all-sky images / 463 h of aurora at Kevo (CGM 66.3°), Muonio (64.7°), Hankasalmi (58.7°); lower threshold ≡ 50 % probability of (at least faint) aurora, upper ≡ 50 % probability of bright/extensive aurora. This is the only auroral-zone calibration of a magnetometer index against camera-detected aurora found so far. Numeric per-station thresholds: UNVERIFIED (not published on the information page).
- Kauristie et al. 2016, Geosci. Instrum. Method. Data Syst. Discuss., doi:10.5194/gi-2015-33, "Forecasting auroras from regional and global magnetic field measurements" (PDF fetched: https://birkeland.uib.no/wp-content/uploads/2018/02/110-Kauristie-GIM_NOA-180716.pdf): RAF concept using IMAGE dB/dt; "Favourable conditions for auroral displays are associated with ground magnetic field time derivative values (dB/dt) exceeding certain latitude dependent threshold values"; conditional probabilities built from NOAA alerts + IMAGE 2002–2012. (Numbers to be added after reading — see later section.)
- Case, MacDonald & Viereck 2016, Space Weather, DOI 10.1002/2015SW001320 (NASA summary https://www.nasa.gov/solar-system/citizen-scientists-help-nasa-researchers-understand-auroras/): "After analyzing 500 citizen science aurora observations during March and April 2015" … "many people reported seeing the aurora further equatorward … than the OVATION Prime model suggests". Kosar et al. 2018 (NTRS PDF https://ntrs.nasa.gov/api/citations/20190002362/downloads/20190002362.pdf): "∼50% of the observations are reported from the latitudes that are further equatorward of the view line".
- Nevanlinna & Pulkkinen 2001, JGR, DOI 10.1029/1999JA000362 (abstract only via search): auroral occurrence index AO from Finnish all-sky cameras 1973–1997 (~100,000 h); FMI: "In Sodankylä every second night is an auroral night, in Helsinki once per month".

---

## 5. Sources not reachable (tried)
- swsc-journal.org (Sigernes 2011 HTML+PDF): 403 / DataDome captcha → used Semantic Scholar PDF mirror instead.
- Wiley (Carbary 2005; Case 2017 HTML; Tanskanen 2009 PDF): 403 / Cloudflare captcha to both WebFetch and curl.
- Aalto repository copy of Tanskanen: 403. ADS abstract page: 405.
- aurorasnow.fmi.fi English/Finnish disturbance-map pages: 403.
- Springer/EPS 2015 paper (Tromsø MLT statement): login redirect.
- gfzpublic Feng 2025 PDF: 403 via WebFetch (curl copy obtained; not yet text-checked).

(Sections 6 "Numbers to use" and 7 "Verdict" follow.)

---

## 6. Midnight oval boundaries vs Kp — computed from the VERIFIED coefficients above

Computation (my own, Python, MLT = 0 h; CGM latitude = 90° − colatitude):

### 6a. Feldstein–Starkov 1994a (coefficients from Sigernes 2011 Appendix A; Kp→AL from Starkov 1994b)
| Kp | AL (nT) | poleward bdy | equatorward bdy | width | diffuse eq. bdy |
|---|---|---|---|---|---|
| 0 | 18 | 71.5 | 69.9 | 1.6 | 65.9 |
| 1 | 31 | 70.5 | 67.5 | 3.0 | 64.9 |
| 2 | 86 | 70.8 | 65.0 | 5.8 | 63.1 |
| 3 | 172 | 71.9 | 63.8 | 8.1 | 61.1 |
| 4 | 276 | 72.7 | 62.6 | 10.2 | 59.1 |
| 5 | 387 | 73.1 | 61.4 | 11.7 | 57.1 |
| 6 | 491 | 73.2 | 60.5 | 12.7 | 55.4 |
| 7 | 579 | 73.0 | 59.9 | 13.1 | 54.1 |
| 8 | 636 | 72.8 | 59.7 | 13.1 | 53.3 |
| 9 | 653 | 72.8 | 59.7 | 13.1 | 53.1 |
- The Kp→AL cubic saturates near Kp 8–9 (AL ≈ 650 nT), so Kp 8 and 9 are indistinguishable in this model.
- Crossing Kp (Starkov, midnight): the POLEWARD boundary never comes south of 70.5° CGM, i.e. it never crosses Tromsø (67.3°/66.6°), Muonio (66.0°/64.7°), Kiruna (65.4°/64.7°) or Rovaniemi (≈63.5°) at any Kp. The EQUATORWARD boundary reaches 67.3° at Kp ≈ 1.05 (66.64°: Kp ≈ 1.2), 66.0° at Kp ≈ 1.5, 65.4° at Kp ≈ 1.8 (64.69°: Kp ≈ 2.2), 63.5° at Kp ≈ 3.2. Below those Kp the site is EQUATORWARD of the discrete oval (but inside the diffuse belt, whose equatorward edge is 65.9° already at Kp 0).

### 6b. Holzworth & Meng 1975 (Feldstein ovals, Q index; coefficients from SPEDAS auroral_zone.pro)
| Q | poleward bdy | equatorward bdy | width | (noon: pole / eq) |
|---|---|---|---|---|
| 0 | 71.8 | 70.2 | 1.6 | 77.1 / 75.5 |
| 1 | 70.6 | 67.6 | 3.0 | 76.9 / 75.0 |
| 2 | 70.5 | 65.2 | 5.4 | 76.3 / 74.3 |
| 3 | 71.2 | 63.9 | 7.3 | 75.6 / 73.8 |
| 4 | 71.8 | 63.6 | 8.2 | 75.4 / 73.2 |
| 5 | 72.4 | 62.8 | 9.6 | 75.0 / 72.6 |
| 6 | 73.0 | 61.7 | 11.3 | 74.9 / 72.2 |
- Same qualitative picture as Starkov (which was fitted to the same Feldstein ovals): the midnight poleward boundary stays at 70.5–73°; the oval widens almost entirely equatorward. Q is not Kp (Q is a 15-min index; Q ≈ Kp only roughly).

### 6c. Zhang & Paxton 2008 as coded in Sigernes 2011 (Appendix B, 0.25 erg cm⁻² s⁻¹ threshold) — INDICATIVE ONLY
Computed at midnight from the Appendix B Fourier–Epstein coefficients with the HP-weighted interpolation of Sigernes eqs. (6)–(10): peak-flux latitude 68.4° (Kp 0), 68.2° (1), 67.0° (2), 66.1° (3), 65.5° (4); 0.25-erg boundaries 64.0–76.1° (Kp 0), 63.0–76.5° (1), 61.2–77.9° (2), 59.7–79.6° (3), 59.9–80.7° (4). For Kp ≥ 5 the fixed-threshold boundaries become non-monotonic/unphysical (poleward > 84°), so they are not usable; Sigernes' own remark applies: "The Zhang-Paxton ovals have a larger latitudinal spread than the Feldstein-Starkov ovals". The peak-latitude drift of ≈0.7°/Kp is consistent with Carbary's "UV intensity peak shifts 1° in magnetic latitude for each increment in Kp".

### 6d. Other verified anchor numbers
- NOAA SWPC "Tips on viewing the aurora" (https://www.spaceweather.gov/content/tips-viewing-aurora): "At Kp = 0, the equator ward edge of the auroral oval is approximately 66 degrees. And it moves equatorward about 2 degrees for each level of Kp." "Best aurora is usually within an hour or two of midnight (between 10 PM and 2 AM local time)." "if you are in the right place under the aurora, you can see very nice auroral displays even with low geomagnetic activity (Kp = 3 or 4)."
- Carbary 2005 abstract (Wiley page text via search): "poleward, peak, and equatorward boundaries as well as the magnitude of peak intensity display a linear relation with the Kp index, at least for activity levels below Kp ≈ 6"; peak shifts 1°/Kp. Coefficients: still UNVERIFIED (no open copy reached).
- Breedveld 2020 (POES, above): poleward boundary "moves only a few degrees towards the equator" as Kp rises while the equatorward boundary expands "by almost 10° ILAT on the nightside".

Conclusion for §1: in every statistical Kp/Q-driven oval model I could verify, the midnight poleward boundary stays ≥ ~70° CGM, i.e. ≥ 3° poleward of Tromsø, at all Kp. The "whole oval south of Tromsø → observer in the polar cap" situation is therefore NOT the statistical expectation even at Kp 7–9; it can happen transiently (growth phase before onset, when the polar cap expands; post-midnight/morning sector; strong storm main phase), but no verified Kp threshold for it exists.

---

## 7. Kauristie et al. 2016 (FMI) — VERIFIED numbers for §3/§4
- Source: Kauristie, K., Myllys, M., Partamies, N., Viljanen, A., Peitso, P., Juusola, L., et al., "Forecasting auroras from regional and global magnetic field measurements", Geosci. Instrum. Method. Data Syst. Discuss., doi:10.5194/gi-2015-33, 2016 (CC-BY), PDF fetched from https://birkeland.uib.no/wp-content/uploads/2018/02/110-Kauristie-GIM_NOA-180716.pdf.
- Auroras Now! rule: "Enhanced opportunity to see auroras is empirically defined to take place when the hourly maximum of dB/dt exceeds 0.3 nT/s in Nurmijärvi and 0.5 nT/s in Sodankylä. More exactly, the hourly maxima of time derivatives of X- and Y-components (geographic north and east components with 1 minute time resolution) are calculated and the larger one is compared with the threshold."
- Validation: "comparing Sodankylä auroral and magnetometer observations during the season from November 1 2003 to March 31 2004 (Mälkki et al., 2006). The analysis shows that in 85% of the cases when the dB/dt-threshold was exceeded also auroras were observed and, on the other hand, no bright auroras were observed when dB/dt-values stayed below the threshold."
- Table 1 (dB/dt threshold for enhanced probability of aurora occurrence; MLAT = CGM): NUR 56.9° 0.30 nT/s; HAN 58.7° 0.35 nT/s; OUJ 61.0° 0.42 nT/s; SOD 63.9° 0.50 nT/s; MUO 64.7° 0.52 nT/s; KEV 66.3° 0.57 nT/s. (These are the same numbers as the 30/35/42/50/52/57 "0.01 nT/s" scale on the legacy Auroras Now page.)
- "Stations KEV and MUO are at latitudes poleward of the Arctic Circle (66.56°N) and under the average auroral oval during moderate activity levels. Stations OUJ, HAN and NUR are at sub-auroral latitudes where high dB/dt values are recorded only during space weather storms."
- Kp vs regional: "NOAA alerts on X-ray bursts or on energetic particle flux enhancements cannot be used in the forecasts… However, NOAA alerts on global geomagnetic storms (characterized with Kp values >4) enable probability estimates of >50% with lead times of 1-12 hours." "The tool by Sigernes et al., guides users to appropriate latitudes during moderate activity, while RAF gives a more realistic representation on oval dynamics during strong Kp activity." Also: "the detection threshold values may need some lowering in the future RAF upgradings" (photographers detect fainter aurora).
- AuroraWatch UK statistics (Case et al. 2017, verified text): "the alert status was yellow for 4.7%, amber for 1.0%, and red for 0.3%" of >150,000 h; elevated-status percentages "closely match the percentage of time that Kp ≥ 4".

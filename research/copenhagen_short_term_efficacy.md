# Efficacy audit: the 10–60 minute aurora forecast for Copenhagen

Written 2026-09-24. Observer: Copenhagen 55.68°N 12.57°E, AACGM magnetic latitude 52.4°, magnetic midnight about 22:50–23:05 UT (00:50–01:05 CEST). Sources: three research reports produced today with per-number provenance ([copenhagen_report_visibility.md](copenhagen_report_visibility.md), [copenhagen_report_nowcast_skill.md](copenhagen_report_nowcast_skill.md), [copenhagen_report_data_sources.md](copenhagen_report_data_sources.md)), a two-year hindcast of the dashboard's own chain (`calibration/hindcast.mjs`, GFZ Hp30 and OMNI, 2024-09-24 to 2026-09-24), regression experiments on the same data, and live measurements of the feeds made today.

## 1. Verdict

The forecast is physically well founded and its ranking skill is high, but for a naked-eye observer in Copenhagen it is mis-calibrated in three ways, all fixable:

1. **It calls "visible low in the north" far too often.** The rule "oval edge within 8° of you" fires at Kp 3.6 and would have fired on 185 dark nights a year over the last two years. The 8° comes from Case et al. 2016, but that number is a fit "through the maximums" of citizen reports (mostly cameras, dark rural skies, one Kp 8 storm); the median positive report lay only 0.6° beyond the modeled edge. Every independent mid-latitude statistic (AuroraWatch UK, whose stations bracket Copenhagen's magnetic latitude; the German Polarlicht-Archiv; Dutch and Danish guidance) puts naked-eye aurora at 50–54° magnetic latitude at Kp 5–6, and Copenhagen is a Bortle 9 sky. The tier is right only for a camera on the dark north coast.
2. **Once the oval is "in view" the number is set by the Finnish substorm phase, which is the wrong control for a mid-latitude storm night.** A G4 storm with the oval overhead (Kp 8.4) and a Kp 5.7 night both read "Possible: 55 %", and a quiet Finnish chain caps a G4 night at 25–30 %. At 52° the storm-time aurora is a continuous glow and the substorm cycle 1 hour of local time east and 3–15° north of you modulates brightness, not presence.
3. **It is over-confident at the shortest leads and under-weights the observed index at the longer ones.** The probability spread used at +10 min (σ 0.28) is half the actual error (0.59); the persistence weight decays to 0.09 by +120 min while the hindcast wants about 0.35 from +60 min on. Fixing the spread alone improves the Brier score by 5–10 %.

What is good: inside the measured solar-wind lead (typically 30–60 min) the driving is known, and the dashboard's blend of that driving with the last observed Hp30 is close to the best linear combination the data allow (RMSE 0.585 at +0, 0.696 at +30, 0.756 at +60 on the Hp30 scale). The discrimination of the decision is high: AUC 0.96 at +30 min for "Hp30 ≥ 5", 0.98 for "≥ 6", 0.99 for "≥ 7". Published solar-wind-only Kp models reach RMSE 0.55 at the same lead (Wintoft et al. 2017) and a 2025 observatory-level Hp30 nowcast 0.85 (Kervalishvili et al. 2025), so the mapping step is at the state of the art. The limiting factors are elsewhere: the threshold, the visibility model, the storm-time bias of the regression, and the absence of any local ground observation.

## 2. What the algorithm does (as audited)

1. NOAA's propagated solar wind (L1 measurements time-shifted ballistically to 32 Re; arrival stamps 30–88 min ahead, 52–61 min today) gives per-minute Newell coupling and the viscous term.
2. A 4-hour OVATION-weighted average is mapped to Hp30 with a regression fitted on two years of GFZ Hp30 (test RMSE 0.75; the published Newell 2008 Kp coefficients give 0.78; 30-minute persistence 0.62). A storm-only fit is blended in above Hp30 3.
3. Beyond the measured lead the coupling is extrapolated with an analog ensemble of the last week plus climatological log-ratio quantiles (200 members).
4. The centre is blended with NOAA's Geospace Kp (weight 0.8 inside the transit window, 0.4 after) and GFZ's ISDC Hpo forecast (0.5), then pulled toward the last observed Hp30 with weight 0.85·exp(−(h + age)/60).
5. Each member drives the Starkov 1994 statistical oval (Kp → AL → boundary, NOAA's 2°/Kp beyond Kp 6), blended 60/40 with the OVATION Prime 1 erg cm⁻² s⁻¹ edge at the observer's MLT for h ≤ 70 min. Margin = edge − 52.4°. "Overhead" at margin ≤ 0, "low in the north" at margin ≤ 8°.
6. P(visible) = P(margin ≤ 8°) × a substorm-phase factor (expansion 1.0, recovery 0.75, growth 0.45, quiet 0.25, no data 0.55; since today scaled by the chance that the onset is in the observer's local-time sector).

For Copenhagen the geometric thresholds at magnetic midnight are Kp 3.6 (low in the north) and Kp 7.65 (overhead); at 21 MLT they are 4.6 and 8.8, at 03 MLT 3.8 and 8.4.

## 3. Hindcast of the chain (two years, all hours)

### 3.1 How often each class fires in darkness at Copenhagen (sun below −12°, 2941 dark hours a year)

| Condition | Hours per year | Nights per year |
|---|---|---|
| Hp30 ≥ 3.67, the "low in the north" rule | 670 | 185 |
| ≥ 4.67 (Kp 5−) | 239 | 100 |
| ≥ 5.67 (Kp 6−) | 85 | 38 |
| ≥ 6.67 (Kp 7−) | 34 | 15.5 |
| ≥ 7.67 (Kp 8−, "overhead") | 14 | 4 |

For comparison, the German Polarlicht-Archiv (all of Germany, 48 % of entries camera-only) logged 62 aurora nights in 2024 and 94 in 2025, 6–7 in 2019–2020. Copenhagen sits 1–3° poleward of northern Germany, so "Kp 5− in darkness" (100 nights) is the scale of camera-visible nights and "Kp 6−" (38 nights) the scale of naked-eye nights. The current tier over-counts by a factor of three to five.

### 3.2 Skill by lead (RMSE on the Hp30 scale; persistence = last complete interval at issue time)

| Lead | Model, driving measured | Model, driving frozen | Persistence | Dashboard blend (weight on persistence) | Best weight → RMSE |
|---|---|---|---|---|---|
| +0 | 0.768 | 0.768 | 0.647 | 0.585 (0.66) | 0.65 → 0.585 |
| +30 | 0.767 | 0.774 | 0.841 | 0.696 (0.40) | 0.40 → 0.696 |
| +60 | 0.767 | 0.805 | 0.942 | 0.756 (0.24) | 0.35 → 0.752 |
| +90 | 0.767 | 0.863 | 1.010 | 0.825 (0.15) | 0.35 → 0.807 |
| +120 | 0.767 | 0.939 | 1.062 | 0.910 (0.09) | 0.35 → 0.870 |

"Driving measured" is what the dashboard has inside the L1 lead; "frozen" holds the driving at issue time and is what the analog ensemble median amounts to. The published skill ceiling for solar-wind-driven Kp at propagation lead is RMSE 0.55 with r = 0.92 (Wintoft et al. 2017, 3-hour Kp), and Shprits et al. 2019 found solar wind adds only a "barely noticeable improvement" over index history at short lead. On a 30-minute index the dashboard's numbers are consistent with that.

### 3.3 Probability skill for the decision

Brier scores for the event Hp30 ≥ 3.67 (climatology 0.160): dashboard blend 0.070 / 0.082 / 0.087 / 0.094 / 0.106 at +0 / +30 / +60 / +90 / +120 min; the same blend with its spread set to its actual RMSE 0.063 / 0.077 / 0.083 / 0.092 / 0.103. AUC 0.957 / 0.935 / 0.923 / 0.906 / 0.881. For Hp30 ≥ 4.67 (climatology 0.069): Brier 0.034 / 0.040 / 0.041 / 0.043 / 0.047, AUC 0.972 / 0.958 / 0.948 / 0.932 / 0.910. For ≥ 5.67: AUC 0.983 / 0.976 / 0.970 / 0.957 / 0.937. For ≥ 6.67: 0.986 / 0.987 / 0.979 / 0.968 / 0.954.

Reliability of the blend for the ≥ 3.67 event at +30 min: forecasts of 0.1–0.2 verify at 0.30, 0.3–0.4 at 0.46, 0.5–0.6 at 0.56, 0.7–0.8 at 0.68, 0.9–1.0 at 0.93. Under-forecast below 0.5, slightly over-forecast above 0.7. At +0 the 0.1–0.2 bin verifies at 0.37 because σ = 0.28 is too small.

### 3.4 Storm-time bias

On the 6569 intervals at or above the threshold the model with measured driving has RMSE 1.01 and bias −0.58; persistence has 0.77 and −0.21. The regression under-predicts exactly the intervals that matter for Copenhagen. Regression experiments on the same data (chronological 80/20 split):

| Model | Test RMSE | Bias | On Hp30 ≥ 3.67: RMSE / bias |
|---|---|---|---|
| Linear coupling + viscous (current form) | 0.795 | +0.21 | 1.26 / −0.95 |
| + previous Hp30 (autoregressive) | 0.573 | +0.06 | 0.87 / −0.50 |
| √coupling + coupling + viscous + previous | 0.569 | +0.04 | 0.85 / −0.48 |
| Persistence | 0.622 | – | 0.86 / −0.33 |

Adding SYM-H (ring current) changes nothing (< 0.002): the ring current belongs in the boundary step, not the index step. Half of the Hp30 ≥ 4.67 intervals had SYM-H ≤ −50 nT.

### 3.5 The other blend members, measured today

- NOAA Geospace Kp against GFZ Hp30 over the last week: bias −0.07, RMSE 0.86 overall, but 0.3–0.7 low on intervals with Hp30 ≥ 3 (2.89 vs 3.19; 3.31 vs 4.00). The published evaluation of the current model version could not be fetched; the v1-era study reported quiet-time over-prediction of 1–1.7 Kp.
- GFZ ISDC Hpo forecast: the L1-driven member (`aceprop`) is entirely missing (−1) today; the dashboard falls back to the ensemble median, whose first steps (1.33) sat within a third of the observed value today but 0.7–2.0 thirds below it in the other agent's snapshot. No method or verification is published for this product.
- NOAA's estimated Kp (1-min) ran 0.40 below Hp30 over the last six hours.
- GFZ publishes the Hp30 value for the running half-hour about 2 minutes before it ends, computed from partial data, and otherwise up to 17 minutes after; the "within 60 s" latency assumed in the plan is not documented anywhere.
- The ballistic L1 shift carries "±15 min" timing errors (Cash et al. 2016); the raw RTSW files are about 4 minutes fresher than the propagated product.

## 4. Does the visibility model fit Copenhagen?

- **The 8° allowance.** Case et al. 2016 (full text): the view line is "the line of best fit through the maximums" of the report-minus-edge offsets, 7.65 ± 2.06°, chosen so that 95 % of positive reports fall poleward of it; the median positive report was 0.62° equatorward of the 1-erg edge, and +3.06° among the subset already beyond it. Reports: March–April 2015, median Kp 5, 85 % positive, one Kp 8− storm, mostly North American, mostly cameras.
- **Independent thresholds at Copenhagen's magnetic latitude.** AuroraWatch UK's sites (Crooktree 54.4°, Eskdalemuir 52.4°, Lancaster 50.8° AACGM) bracket Copenhagen: 50–100 nT hourly range is "may be visible by camera", 100–200 nT "likely to be visible by eye" in Scotland and northern England, ≥ 200 nT visible anywhere in the UK; these levels occur 412 / 88 / 23 hours a year and the elevated time "closely matches the percentage of time that Kp ≥ 4". SpaceWeatherLive's city table: Gothenburg Kp 5, Hamburg Kp 6 under perfect conditions. Dutch VWK: Kp 7 or higher, 5–10 days a year in active years. DMI: aurora from a city is "normally impossible because of light pollution" and Danish aurora is "often strongly reddish".
- **Geometry.** With the edge 8° (890 km) north, the green lower border at 100 km sits at 3° elevation and only the red 630 nm tops above 200 km reach 12°: a dim red glow, invisible against Copenhagen's Bortle 9 sky (limiting magnitude ≤ 4) and marginal at Gribskov (Bortle 4). At Kp 5 the edge is about 5° north (green at 9–14° elevation): naked-eye low in the north from the Kattegat coast. At Kp 6 (edge 3°) the arc stands 15–35° up.
- **Storm-time geometry.** Yokoyama et al. 1998 (DMSP): the midnight boundary lies at 55–65° for Dst > −50 nT, below 50° for Dst < −100 nT, moving 6–7° per 100 nT beyond that, lowest 0–2 h before the Dst minimum. Starkov's discrete-oval edge saturates near 59.7° and the diffuse edge near 53° for Kp ≥ 7, so the code's 2°/Kp patch above Kp 6 is necessary; Dst ≤ −100 nT is a better physical trigger for "overhead". OVATION Prime-2013 is only shown "at least to 55° MLAT" (Newell et al. 2014), 2.6° short of the observer, and its edge differs from the Kp-driven Zhang-Paxton edge by 1.5° on average (Kosar et al. 2018), more than the 0.25° an Hp30 third moves the Starkov edge.
- **Which index should drive the edge.** Troyer et al. 2025, fitting just under a million DMSP boundaries from 28 years by Kp and Hp bins per MLT, find "Hp30 is the best representation of the data" and give 50th and 95th percentile boundaries. That is the model this dashboard should adopt for the edge; no Hp30-driven boundary is in the code today.
- **Sub-auroral features.** STEVE appears just below 60° magnetic latitude, about 4° equatorward of the oval, roughly an hour after a substorm onset; SAR arcs at 400 km altitude occur about 12 times a year at 50° magnetic latitude. Both are seen from Denmark during storms and neither is in the model.

## 5. Where the 10–60 minute skill is really lost

Ranked by expected gain for a Copenhagen observer:

1. **Threshold and tiers (largest effect on the daily verdict).** Replace the single 8° class with tiers, all gated on darkness, moon and the 21–02 local-time window: camera from the dark north coast (edge within 8°, Hp30 ≥ 3.5); naked-eye low in the north from a dark site, camera from the city (edge within about 5°, Hp30 ≥ 5); naked-eye from Copenhagen's northern sky (edge within about 3°, Hp30 ≥ 6); overhead (edge ≤ 52.4°, Hp30 ≥ 7.5–8, or Dst ≤ −100 nT). Drive the edge with Troyer et al. 2025's Hp30 boundaries, with the 95th percentile as the "possible" line.
2. **Visibility factor for storm nights.** For mid-latitude observers the phase factor must not gate presence. Proposal: pVisible = P(edge within the tier) × f, with f = 1 when the modeled margin is ≤ 3° or Hp30 ≥ 6 (continuous storm-time glow), otherwise the phase factor with a floor of 0.5, and the substorm term used as a brightness modifier and a "the surge is coming" signal (a pre-midnight onset in Lapland reaches Denmark's meridian in about 6–14 minutes at the surge's 1–2 km/s).
3. **Regression form and storm bias.** Fit Hp30 = a + b·√coupling + c·coupling + d·viscous + e·Hp30(previous) on the archive (test RMSE 0.57 vs 0.80 now; storm bias −0.48 vs −0.95), and set the persistence weight per lead from the archive (about 0.65, 0.40, 0.35, 0.35, 0.35 at 0, 30, 60, 90, 120 min). Keep the storm-only blend.
4. **Spread calibration.** Use the hindcast RMSE per lead as the probability spread (0.59, 0.70, 0.76, 0.83, 0.91) instead of the current 0.28–0.72; recompute the reliability table monthly from the cron trail.
5. **Local ground truth for the nowcast.** Tormestorp (IRF, 56.0°N 13.9°E, magnetic latitude about 53°, 130 km from Copenhagen): 1-second variometer CSV with 17-second latency, a real-time K value every 2 minutes, a daily K history since 2018 and a quiet-day curve in the same units, no CORS (proxy needed), licence not stated. A negative X bay there of 100–200 nT, or K ≥ 5, is the direct analogue of AuroraWatch UK's amber and of naked-eye aurora from a dark Danish site. Hel (Poland, magnetic latitude about 51°, 1 h of MLT east) arrives within 5 minutes through INTERMAGNET (CC BY-NC), Niemegk within 12 and Wingst within 22; Brorfelde is only a 3-hourly K posted 15–20 minutes after each block, and the UK observatories are embargoed. AuroraWatch UK's API (levels every 3 minutes, browser-callable) is an independent 0–1 h indicator at the same magnetic latitude.
6. **Timing.** Treat the propagated series as uncertain by ±15 min (smear before the 4-hour weighting), cap the Geospace member at its last stamp, and read the raw RTSW files for the freshest L1 data.
7. **Blend hygiene.** Drop the ISDC members from the 0–60 min blend (keep them for the outlook), bias-correct the Geospace Kp on the active side from the running comparison with Hp30.
8. **Verification loop.** Log the 10/30/60-minute probabilities and inputs; score them monthly against Hp30 exceedances, AuroraWatch UK levels, Tormestorp K and the Polarlicht-Archiv nights; publish the reliability diagram and Brier skill on the model-check page. Nothing about this forecast has been verified against a sighting yet.

## 6. What this means in practice for a Copenhagen observer

- Expect the current "worth a look" verdict to be wrong most of the time for the naked eye; treat it as a camera-from-the-coast signal. A useful night from Copenhagen's northern sky needs Hp30 in the 6s or a Dst below about −100 nT, and from Gribskov, Hornbæk or Gilleleje (Bortle 4, dark sea horizon to the north) Hp30 in the 5s.
- The window is 21–02 local time around magnetic midnight; astronomical darkness is absent from about 5 May to 10 August.
- The most reliable 10–60 minute signal is the observed one: Hp30 already in the 5s with southward Bz still arriving (measured lead), Tormestorp or Hel showing a growing negative bay, and AuroraWatch amber or red. The solar wind then tells you it will stay that way for the next 30–60 minutes; it cannot tell you the minute a substorm will brighten the northern sky.
- Storm-time aurora at 52° is red-dominated and low; look north-northwest early in the evening, north around midnight, and expect STEVE-like arcs to the south of the main glow an hour after big onsets.

## 7. Numbers used in this audit

| Quantity | Value | Source | Flag |
|---|---|---|---|
| Copenhagen AACGM latitude | 52.4° (Hornbæk/Gilleleje 52.9°, Skagen 54.7°) | aacgmv2 | computed |
| "Low in the north" threshold, Starkov hybrid | Kp 3.58 at 23 MLT (3.35 at 00, 4.6 at 21) | `web/src/model/oval.mjs` | computed |
| Dark hours per year with Hp30 ≥ 3.67 / 4.67 / 5.67 / 6.67 / 7.67 | 670 / 239 / 85 / 34 / 14 (185 / 100 / 38 / 15.5 / 4 nights) | hindcast | computed |
| German aurora nights | 2024: 62, 2025: 94, 2019–20: 6–7; 48 % of 6455 sightings camera-only | polarlicht-archiv.de API | verified (night interpretation inferred) |
| Case 2016 offsets | fit through maximums 7.65 ± 2.06°; median positive report 0.62°; 95 % poleward of edge − 8° | Case et al. 2016 full text | verified |
| AuroraWatch UK levels / frequency | 50 / 100 / 200 nT; 412 / 88 / 23 h per year | Case et al. 2017 | verified |
| Blend RMSE by lead | 0.585 / 0.696 / 0.756 / 0.825 / 0.910 | hindcast | computed |
| Best persistence weights | 0.65 / 0.40 / 0.35 / 0.35 / 0.35 | hindcast | computed |
| AUC for Hp30 ≥ 4.67 at +30 | 0.958 | hindcast | computed |
| Autoregressive fit | RMSE 0.569, storm bias −0.48 | regression on archive | computed |
| Solar-wind Kp skill ceiling | RMSE 0.55, r 0.92 at propagation lead; 3-h persistence 0.89 | Wintoft et al. 2017 | verified |
| Hp30 nowcast from simultaneous OMNI | RMSE 0.85 | Kervalishvili et al. 2025 | verified |
| L1 shift timing error | ±15 min common | Cash et al. 2016 | verified |
| Geospace Kp vs Hp30, last week | bias −0.07, RMSE 0.86; 0.3–0.7 low when Hp30 ≥ 3 | live comparison | computed |
| DMSP boundary vs Dst | 55–65° for Dst > −50; < 50° for Dst < −100; 6–7° per 100 nT | Yokoyama et al. 1998 | verified |
| Best boundary driver | Hp30 (28 years of DMSP boundaries) | Troyer et al. 2025 | verified (abstract) |
| OVATION edge vs Zhang-Paxton edge | 1.5° mean difference | Kosar et al. 2018 | verified |
| Onset in next hour | precision 0.72, recall 0.77; Brier 0.100 vs 0.136 | Maimaiti et al. 2019; Nakano et al. 2023 | verified |
| Surge Lapland → Denmark | 6–14 min at 1–2.2 km/s over 830 km | Craven et al. 1989 + geometry | inferred |
| Tormestorp latency / Hel lag / Niemegk / Wingst | 17 s / 4.5 min / 12 min / 22 min | live measurements | verified today |
| Copenhagen sky | Bortle 9; Gribskov Bortle 4 | klarhimmel.dk | verified listing |
| No astronomical darkness | about 5 May to 10 August | sunrise-sunset.org | verified |

## 8. Implemented on 2026-09-24 after this audit

- Tiers (camera 8°, naked eye dark site 5°, naked eye city 3°, overhead) replace the single 8° class; the headline outside the auroral zone is the dark-site naked-eye tier, with city and camera numbers alongside; the "needs" line lists the Kp for each tier.
- Ring-current edge from Dst (Kyoto observed when under three hours old, else NOAA's Geospace Dst) blended into the boundary from −50 nT with weight up to 0.5 at −100 nT.
- Storm-time visibility rule for observers below 63°: city and overhead tiers, and all tiers at Kp ≥ 6, no longer gated by the Finnish substorm phase; the fainter tiers keep the phase factor with a floor of 0.5.
- Regression refit with a square-root term; blend weights (0.65 / 0.45 / 0.40 / 0.40 / 0.40) and spreads (0.60 / 0.71 / 0.78 / 0.83 / 0.90) fitted per lead by `npm run calibrate` and used by the model.
- Local signals: Tormestorp 1-second tail through the proxy (Range request) with IRF's quiet-day curve and K, Hel minute data from INTERMAGNET, AuroraWatch UK's level; mapped to tiers with the 50 / 100 / 200 nT calibration and used as a floor for the next half hour; shown as chips with the sky line and Dst.
- Sky: solar elevation, darkness class, tonight's dark window, moon illumination.
- `calibration/hindcast.mjs` for the numbers in section 3; 11 new tests (130 in total).

Added on 2026-09-25: the verification loop (cron log of tier forecasts with truth signals, sighting buttons and token-guarded endpoints, scoring on the model-check page with Brier, BSS, AUC and reliability against Hp30, AuroraWatch UK and sightings), the Geospace correction (linear MOS refitted every 15 minutes on the last week against Hp30, slope limited to 0.7–1.5), and the timing smear (each ensemble member reads the propagated series with its own arrival-time offset, normal with a 10-minute spread, clipped at ±20 min).

Not implemented: Troyer et al. 2025 Hp30-driven boundaries (coefficients not public).

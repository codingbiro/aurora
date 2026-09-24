# Substorms for auroral-zone observers (Tromsø, Lapland): evidence, algorithm, constants

Written 2026-09-24. Consolidates four research reports produced the same day, each with a citation block per source and a verified / inferred / unverified flag per number:

- [substorm_report_morphology.md](substorm_report_morphology.md): where and when onsets happen, bulge geometry and speeds, phase durations, intensity vs driving, what is seen by phase and local time.
- [substorm_report_onset_prediction.md](substorm_report_onset_prediction.md): the Newell & Gjerloev onset criterion, the minimal substorm model, triggering statistics, machine-learning skill, operational products, a recommended hazard model and its calibration path.
- [substorm_report_tromso_lapland.md](substorm_report_tromso_lapland.md): Starkov/Sigernes oval coefficients and midnight boundary tables, IMAGE station coordinates, IL/IU definitions, TGO K-index scale, magnetic midnight, what FMI, IRF, NOSWE, UAF and Space Weather Canada actually use (the agent stalled twice; the report has no summary table but its sections are complete).
- [substorm_report_ovation_alerts.md](substorm_report_ovation_alerts.md): OVATION Prime's limits for substorms and the poleward edge, hemispheric power vs indices, storm-time oval position, alert-service thresholds, viewing geometry.

## 1. Is it true that substorms matter more than "does the oval reach me" up north?

Yes, with two qualifications. The evidence:

- **The oval is over Tromsø and Lapland on almost every night.** Starkov's statistical oval (Sigernes et al. 2011) puts the midnight equatorward edge of the diffuse aurora at 66.6° at Kp 0 and 63.7° at Kp 2; Tromsø is at 67.3° magnetic latitude, Kiruna and Levi at 65.4 and 65.2°, Rovaniemi at 63.8°. FMI counts aurora on 75 % of nights at Kilpisjärvi and about half the nights at the Lapland resorts; NOSWE says "some kind of aurora every other night over Tromsø". The Aurora Hunter study (arXiv 2605.24038, all-sky cameras at Tromsø and Kiruna) finds the clear-sky occurrence saturating at about 0.755 above Kp 2: more Kp does not raise the chance of seeing *something*.
- **What varies from night to night is the substorm cycle.** Onsets happen at a median 23.0 MLT and 66.4° magnetic latitude (2437 IMAGE FUV onsets, Frey et al. 2004; 65.9° ± 2.2° over 2003 Polar UVI onsets, Liou 2010): the statistical onset arc runs almost exactly over Tromsø and northern Lapland. During the growth phase there is a quiet arc; at onset the arc brightens fivefold within minutes (Mende et al. 2003), the bulge expands 3.5° poleward in 5 min and 5.5° within the hour and spreads east and west into a current wedge about 6 h of local time wide; the recovery brings pulsating and patchy aurora for a median 1.4 h, mostly after magnetic midnight (Partamies et al. 2017). The global index Kp, a 3-hourly planetary average, does not resolve any of this, and NOAA's OVATION Prime is a solar-wind-driven statistical fit that "does not accurately capture the expansion and contraction of the polar cap" and has no representation of an expansion phase (Mooney et al. 2021, 2024; Newell et al. 2014). UAF's own guidance: "Inside the auroral oval Kp is less relevant, since even when global activity is low, auroral activity can be high."
- **Qualification 1: strong driving moves the show south.** Onset latitude follows the merging electric field, MLAT = 73° − 5.2·√Em (Wang et al. 2005, darkness): 67.8° at 1 mV/m, 65.6° at 2, 62.6° at 4, 60.3° at 6 mV/m. Storm-time substorms are bigger (−670 nT vs −350 nT for isolated ones, Tanskanen et al. 2002) but their breakup arc sits 5–7° south of Tromsø, and the poleward edge of the oval only comes equatorward of 67° in severe storms (Sym-H around −200 nT, Milan et al. 2009). So the best Tromsø nights are moderate driving with repeated substorms; a G3 storm is better watched from Rovaniemi or further south.
- **Qualification 2: the dashboard's geometric question still applies south of about 63°.** For Copenhagen (52.4°) nothing happens until a storm has pushed the oval down to about 60°; the substorm section is then context.

What the dashboard computed before this change was the equatorward edge of the oval versus the observer, with the substorm phase folded in as a multiplier. That is the right quantity for Denmark and the wrong emphasis for Tromsø, where it reads "overhead" almost always and says nothing about whether tonight has a substorm in it.

## 2. What the substorm section computes

Implemented in `web/src/model/electrojet.mjs` (chain processing) and `web/src/model/substorm.mjs` (state, hazard, climatology, outlook); rendered by `renderSubstormPanel` and three new charts.

### 2.1 Chain electrojet indicators IL, IU, IE

The twelve Finnish IMAGE stations (KEV, MAS, KIL, IVA, MUO, PEL, RAN, OUJ, MEK, HAN, NUR, TAR; 55–67° magnetic latitude, 10-second X, Y, Z, 35–60 s latency, CC BY 4.0) are averaged to 1 minute. Quiet baselines follow FMI's own recipe for its electrojet indicators: every 3-hour window starting on a whole hour is scored by the X range at each station averaged over stations; the window with the smallest mean range is the quiet period; each station's baseline is its mean X (and Z) in it. IL(t) = min over stations of ΔX, IU(t) = max, IE = IU − IL (Kauristie et al. 1996; FMI IL-index page). Checked on 2026-08-18 against FMI's IE file for that day: the same 09–12 UT baseline window was selected automatically, and the hourly minima agree to the nT whenever the IL station is Finnish (FMI's product also uses Norwegian, Swedish and Icelandic stations, so its minimum that evening, −590 nT at Rørvik, is deeper than the chain's −456 nT).

### 2.2 Onsets

On IL, the Newell & Gjerloev (2011) SuperMAG criterion, verified verbatim: IL(t0+1) − IL(t0) ≤ −15 nT, IL(t0+2) − IL(t0) ≤ −30, IL(t0+3) − IL(t0) ≤ −45, and the mean of IL over minutes 4 to 30 at least 100 nT below IL(t0); a 20-minute lockout after each onset. An onset is reported as *provisional* three minutes after t0 and *confirmed* once the half-hour window is complete (SML onsets lag optical breakup by a median 4 min). On 2026-08-18 this finds 20:03 (confirmed, bay to −456 nT), 20:29 and 21:05 (intensifications). With fewer than three stations the previous per-station bay detector (30 nT in 3 min deepening to 50 nT) is used.

### 2.3 Where the current is

The westward electrojet gives a negative X bay beneath it, a positive (downward) Z on its poleward side and a negative Z on its equatorward side. The centre is the parabolic minimum of ΔX across the chain, averaged with the latitude where ΔZ changes sign from negative to positive between adjacent stations when the two agree within 2.5°. When the deepest bay is at the end of the chain and Z has one sign everywhere, only "north of the chain" or "south of the chain" is reported, and only for bays of at least 100 nT. On 2026-08-18 the centre sat at 62.0° at 20:30 (5° south of Tromsø, over Rovaniemi) and at 66.5° at 21:30 after the poleward expansion: the classic sequence. The X deviation is also interpolated to the observer's latitude.

### 2.4 Phase

From IL: expansion for the first 12 minutes after onset, and up to 60 minutes while the index keeps deepening or stays within 10 % of its deepest value; recovery while the bay is still at least 40 % of its depth and at least 100 nT, or for 45 minutes; then growth (merging field ≥ 0.6 mV/m and Bz south for ≥ 10 min, Li et al. 2013) or quiet. Median durations for reference: growth 31, expansion 12, recovery 31, quiet 75 min (Partamies et al. 2013, 54 519 expansions); image-defined expansions last 10–40 min (Gjerloev et al. 2007).

### 2.5 Onset hazard

Unchanged minimal substorm model (Freeman & Morley 2004): energy loads at the Akasofu rate since the last onset and releases when it reaches D times the recent mean power, D = 2.69 h (best fit), with a lognormal spread; the hazard is quartered below 0.6 mV/m. The report on onset prediction lists the calibration path (Poisson maximum likelihood against the public SuperMAG onset list, Brier score against the 0.136 climatology / 0.100 model benchmark of Nakano et al. 2023) that this model has *not* had; treat P(onset) as an expert estimate. Deep-learning forecasts reach precision 0.72 / recall 0.77 for a 60-minute window (Maimaiti et al. 2019), which is the ceiling to expect from L1 data.

### 2.6 Will it be in *your* sky: the reach factor

P(onset in your sky within h) = P(onset within h) × R, where R integrates the onset climatology against a reach kernel:

- onset local time ~ N(23.0 h, 1.3 h) (Frey et al. 2004; Frey & Mende 2006 σ 1.35–1.45 h; Liou 2010 σ 1.1 h);
- onset latitude ~ N(73 − 5.2·√Em, 2.0°) with Em the mean Kan-Lee field of the last hour (Wang et al. 2005; total scatter 2.2–2.9° before the regression), falling back to Starkov's discrete-oval edge for the Kp level plus 1° when no solar wind is available;
- reach kernel: 1 within 1.5 h of local time either side of the onset meridian, tapering to 0 at 3.2 h west / 3.0 h east (bulge expands about equally west and east, Gjerloev et al. 2007; wedge width about 6 h MLT, Kepko et al. 2015); 1 from 1.5° equatorward to 5.0° poleward of the onset arc, tapering to 0 at 4.0° equatorward and 8.5° poleward (Mende et al. 2003; Akasofu 2021). "Full" means the active display is in the sky (an arc 2–3° away sits at 15–25° elevation; 5° elevation corresponds to 6.2–6.7° of latitude at 100–110 km).

For Tromsø at 23 MLT under 1.5 mV/m driving R ≈ 0.86; at 18 MLT ≈ 0.01; for Rovaniemi at 23 MLT ≈ 0.47 (3° equatorward of the onset arc); for Copenhagen 0. The same kernel, longitude part only, now scales the onset term inside the two-hour visibility probability, and an ongoing substorm at the chain only counts for observers in the chain's local-time sector (the chain is 0.2 h east of Tromsø and 1.0 h east of Copenhagen).

### 2.7 Other outputs

- Prime window: the interval when the observer's MLT is within 1.5 h of 23 MLT, from the AACGM-v2 magnetic longitude (Tromsø: about 19:30–22:30 UT; Kauristie et al. 1996 give MLT ≈ UT + 2.5 h for this meridian).
- Expected size of the next substorm from the mean coupling of the last hour: IL ≈ −(185 + 0.0373·dΦ/dt), anchored to −350 nT for average driving and −670 nT for storm-time driving (Tanskanen et al. 2002; intensity linear in the reconnection field, Li et al. 2013).
- Strength classes on IL: quiet > −50 nT (Juusola/Partamies weak-bay limit), weak to −170, moderate to −300, strong to −875, intense beyond (Space Weather Canada's auroral-zone hourly-range bands).
- FMI's own aurora indicator (Kauristie et al. 2016, "Auroras Now"): the hourly maximum of the 1-minute time derivative of the geographic X and Y components, against the station thresholds FMI published (0.57 nT/s at Kevo, 0.52 Muonio, 0.50 Sodankylä, 0.42 Oulujärvi, 0.35 Hankasalmi, 0.30 Nurmijärvi; Kilpisjärvi shares Kevo's, the others are interpolated in latitude). At Sodankylä, 85 % of threshold exceedances came with aurora and no bright aurora was seen below the threshold. FMI's current R-index is calibrated so that its lower threshold means a 50 % chance of at least faint aurora on the all-sky cameras, but its per-station values are unpublished.
- Local K-index from the nearest Tromsø Geophysical Observatory site with an open file (Tromsø, Andenes, Bjørnøya, Ny-Ålesund, Dombås, Brorfelde, Leirvogur). Tromsø, Andenes and Bjørnøya use a K9 lower limit of 2000 nT (Frøystein & Johnsen 2025), Dombås 750 nT.
- Oval band from OVATION at the observer's MLT: equatorward and poleward 1 erg cm⁻² s⁻¹ edges and the flux peak, so the observer is placed inside, equatorward or poleward of the modeled oval. OVATION's poleward edge is unreliable above Kp 3 (Mooney et al. 2024), so it is shown as context only.

## 3. Constants used

| Constant | Value | Source | Flag |
|---|---|---|---|
| Onset MLT mean / sd | 23.0 h / 1.3 h | Frey et al. 2004; Frey & Mende 2006; Liou 2010 | verified (sd chosen between 1.1 and 1.45) |
| Onset MLAT vs merging field | 73 − 5.2·√Em, Em ≤ 6 mV/m | Wang et al. 2005 (darkness); Wang et al. 2007 | verified |
| Onset MLAT residual sd | 2.0° | derived from 2.2–2.9° total spread and R = 0.57 | inferred |
| Reach in MLT | full ±1.5 h, zero at −3.2 / +3.0 h | Gjerloev 2007; Kepko 2015 (snippet); Kullen 2009 | inferred from verified extents |
| Reach in latitude | full −1.5…+5.0°, zero at −4.0 / +8.5° | Mende 2003 (5.5° in 1 h); Akasofu 2021; viewing geometry | inferred |
| N&G onset criterion | −15/−30/−45 nT, 100 nT sustained over min 4–30, 20-min lockout | Newell & Gjerloev 2011 | verified |
| MSM recurrence D | 2.69 h | Freeman & Morley 2004 | verified |
| Growth-phase floor | Em ≥ 0.6 mV/m | Li et al. 2013 | verified |
| Phase medians | 31 / 12 / 31 / 75 min | Partamies et al. 2013 | verified |
| Isolated vs storm-time IL | −350 / −670 nT | Tanskanen et al. 2002 | verified |
| IL classes | −50 / −170 / −300 / −875 nT | Partamies 2013; Space Weather Canada | verified bands, mapping to IL inferred |
| FMI dB/dt thresholds | 0.30…0.57 nT/s per station, hourly max of the 1-min derivative | Kauristie et al. 2016 Table 1; FMI legacy page | verified |
| TGO K9 limits | 2000 nT (TRO, AND, BJN), 1800 (LYR, NAL), 750 (DOB) | Frøystein & Johnsen 2025 | verified |
| Tromsø occurrence vs Kp | 0.755, flat above Kp 2 | Aurora Hunter, arXiv 2605.24038 | verified |
| Poleward edge < 67° | only at Sym-H ≈ −200 nT | Milan et al. 2009 | inferred |

## 4. Validation done and not done

Done: the 2026-08-18 chain day reproduces FMI's baseline window and IL minima, detects the 20:03 onset provisionally after 4 minutes and confirms it at 20:33, and tracks the electrojet centre from 62.0° to 66.5°; 23 offline tests cover the chain, climatology and outlook (`test/electrojet.test.mjs`).

Not done: no hindcast of P(onset) against an onset list, so the hazard and the reach factor are uncalibrated expert estimates; the chain sees roughly a third of global onsets (517 ± 75 per year at IMAGE vs about 1600 globally), so "no onset" is weak evidence; Kiruna (IRF) and the Norwegian TGO magnetometers are not in the chain (IRF has short files and cross-origin limits, TGO's digital data is password-protected).

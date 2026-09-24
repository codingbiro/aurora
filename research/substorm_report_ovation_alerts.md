<!-- Research report produced by a background research agent on 2026-09-24; every item marked verified was fetched that day. Consolidated in substorms_auroral_zone.md. -->
# OVATION Prime, hemispheric power, storm-time oval position, magnetometer alert services, and viewing geometry for auroral-zone observers (Tromsø 67.3° MLAT, Lapland 63.5-66.5°)

Research date: 2026-09-24. Every number below carries the URL that was actually fetched. Where the
primary Wiley/AGU article pages could not be fetched (HTTP 403 for every `agupubs.onlinelibrary.wiley.com`
URL, also with a browser user-agent, and ADS abstract pages answered "Human Verification"), the abstract was
taken from the Crossref API record of the same DOI (`https://api.crossref.org/works/<DOI>`, which carries
the publisher-deposited abstract) or from an open repository PDF (NORA, Lancaster EPrints, OSTI, NGDC,
Birkeland Centre, Copernicus, arXiv). Items marked **UNVERIFIED** could not be confirmed from a fetched
primary source; what was tried is stated.

---

## 1. OVATION Prime in the auroral zone and its substorm limitations

### 1(a) Does OVATION Prime represent substorm expansion? No - it is a solar-wind-driven statistical fit.

* Newell et al. 2009 (JGR, abstract via Crossref): the model "is parameterized by solar wind driving instead
  of Kp and is based on functional fits to the solar wind coupling function which best predicts auroral
  power. Each of the four auroral types in each MLAT and MLT bin is separately fitted". Nothing in the model
  is keyed to substorm phase.
* Sotirelis, Newell & Wing 2010 (SWPC Space Weather Workshop slides, PDF fetched):
  "Auroral power(mlat_bin, mlt_bin, aurora_type) = a + b*dFMP/dt"; "4 auroral types x 96 MLT bins x 120
  MLAT bins = 46,080 regression equations"; "This can be evaluated for any solar wind history (the IMF for
  the last 3 hours is used here)"; "Wave aurora has the least energy flux, but rises fastest with driving.
  Wave aurora energy flux most resembles substorms."
* Newell et al. 2014 (Space Weather, OP-2013, abstract via Crossref): "To quantitatively demonstrate the
  improvement at high disturbance levels would require multiple very large substorms, which are rare, and
  insufficiently present in the limited data set of Polar UVI hemispheric power values."
* Newell & Gjerloev 2014 (JGR, open PDF, Birkeland Centre): "the auroral response to the solar wind is
  filtered by longer-acting internal magnetospheric dynamics. For example, OVATION Prime [Newell et al.,
  2009, 2010, 2014] would be less predictive if only the current 1 min value of the solar wind was used."
* Mitchell et al. 2013 (JGR, OVATION-SM, abstract via Crossref) - the authors' own substorm-aware successor:
  "OVATION-SM is a linear combination of the SME index ..., time since the last substorm onset, and time
  until the next substorm onset ... OVATION-SM captures the gross auroral morphology, including onsets and
  other brightening and dimming events ... explains more than 70% of the variance in Polar UV Imager
  nightside auroral power, which makes it a better predictor of nightside auroral power than any other
  model currently available." (A search snippet attributes "OP-2010 described 47% of the variance" to the
  same paper; the 47% figure was not seen in fetched text - UNVERIFIED.)
* McGranaghan et al. 2021 (JGR Space Physics; arXiv 2011.10117 fetched): "such shortcomings have resulted
  in models that are limited in their ability to reproduce observed features in highly dynamic (in both
  space and time) conditions ... the quality of any model is limited if the modeled variations in time and
  space are smooth"; PrecipNet "achieves a >50% reduction in errors from a current state-of-the-art model
  (OVATION Prime)".
* Mooney et al. 2024 (JGR, NORA PDF): the model "does not accurately capture the expansion and contraction
  of the polar cap as the open flux content of the magnetosphere changes."
* Mooney et al. 2021 (Space Weather, NORA PDF) quantify the substorm effect on boundaries: "during
  substorms, the poleward boundary of the auroral oval moves by up to 3° in the substorm onset MLT
  sectors ... the 3° change in the poleward boundary represents a small change of 17%-30% of the total oval
  width."

Bottom line for the dashboard: OVATION output is a 4-hour-smoothed climatology of energy flux for the
given solar-wind history; it cannot show a substorm onset or expansion. Use it for "is the oval over me
and how much power is there", and use ground magnetometers / cameras / SML-type indices for substorms.

### 1(b) Poleward boundary skill

* Mooney et al. 2021 (OP-2013 as run by the UK Met Office vs IMAGE FUV boundaries 2000-2002; abstract
  via Crossref, PDF fetched): overall ROC score 0.82; dayside 0.59; "ROC score of 0.55 for Kp = 8"; "As a
  probabilistic forecast, OVATION-Prime 2013 tends to underpredict the occurrence of aurora by a factor
  of 1.1-6, while probabilities of over 90% are overpredicted." Best discriminating probability threshold:
  "a probability of between 5% and 15%". "Each forecast requires 4 h of input solar wind data".
* Mooney et al. 2024 (abstract, PDF fetched): "the model performs well at predicting the equatorward extent
  of the auroral oval ... The model performance is reduced in the high latitude region near the poleward
  auroral boundary, particularly in the nightside sectors ... For increasing levels of geomagnetic activity
  (Kp >= 3), the performance of the model decreases, with the poleward edge of the auroral oval typically
  observed at lower latitudes than forecast. As such, the forecast poleward edge of the auroral oval is
  less reliable during more active and hazardous intervals." Event counts: Kp1 496, Kp2 502, Kp3 342,
  Kp4 158, Kp5 53, Kp6 32, Kp7 14, Kp8 3 pairs; "the model is only valid up to Kp = 8".
  For Kp = 5-8: "The observed poleward auroral boundary is expanded equatorward to latitudes between 70°
  and 75° in the nightside sectors between 18 and 06 MLT. At high latitudes above ~70° panel c shows a
  high proportion of false alarm forecasts where the aurora is being predicted but not observed".
* Machol et al. 2012 (Space Weather; abstract via Crossref + NGDC AGU-2011 poster): validation against
  Polar UVI, 1997-1998, Kp >= 3, 2194 10-min files, 2° MLAT x 1-h MLT grid, thresholds 1 erg cm-2 s-1
  (model) and 2.5 kR (UVI): "The overall forecasts for a visible aurora to occur or to not occur were
  correct 77% of the time ... forecasts [that visible aurora will occur] were correct 86% of the time."
  Poster: hit rate 86%, false alarm rate 14%, detection rate 58%, false negatives 26%. Poster also
  notes "Since DMSP did not sample post-midnight near 50 MLAT, the forecasts in this region are too low
  during high activity" (grid stated as 15 min MLT x 0.25° MLAT over 50-90° MLAT in the 2010 model).
* Sotirelis & Newell 2000 (boundary-oriented model, JGR 105, 18655, doi:10.1029/1999JA000269) - only the
  search snippet was seen (12 years, eight DMSP spacecraft, five activity levels); Wiley page not
  fetchable, JHU/APL PDF host refused connection. UNVERIFIED beyond bibliographic data.

### 1(c) Hemispheric-power correlations and the 4-hour weighting

* Sotirelis et al. 2010 slides: "Comparison with Individual UVI Images: > 2200 images 1996-1997 R = 0.73
  (OVATION Prime solar wind based prediction) R = 0.69 (NOAA Hemispheric Power nowcast) R = 0.71 (Hardy
  Kp driven nowcast)"; "Comparison with 1-Hour Average UVI Images R = 0.75, 0.76, 0.73"; "Auroral Power
  from Polar UVI images Correlates Well With dFMP/dt: Vs. Bs: R = 0.63, Vs. EKL: R = 0.69, Vs. dFMP/dt:
  R = 0.74"; example "Power predicted by Ovation Prime: 12.1 GW, Power observed by Polar UVI: 11.3 GW";
  "Polar UVI is not sensitive to electrons below a few hundred eV, or to fluxes below about
  0.25 ergs/cm2 s."
* Newell & Gjerloev 2011 (JGR; abstract via Mendeley catalogue page): "The best correlation is between
  SME and total nightside auroral power, namely, r = 0.86"; AE(12) "r = 0.81".
* Weights: NOT stated in any fetched paper text. Two independent open re-implementations of the APL IDL
  code use a 4-hour window with geometric weights 0.65^n:
  - OvationPyme `ovation_utilities.py` (fetched): `prev_hour_weight=0.65`, weights
    `[prev_hour_weight**n for n in range(4)][::-1]` = [0.27, 0.42, 0.65, 1.0]; coupling function
    `Ec = (V**1.33333)*(sintc**2.66667)*(BT**0.66667)`; "No explicit cap".
  - auroramaps `util.py` (fetched): `ave_hours=4`, `prev_hour_weight = 0.65 # reduce weighting by
    factor with each hour back`, comment "make array with weights according to Newell et al. 2010, par
    25", plus a fractional weight for the current partial hour ("corresponds roughly to ap_inter_sol.pro
    in IDL ovation").
  So the weights 1, 0.65, 0.42, 0.27 are VERIFIED in code and attributed by the code authors to Newell
  et al. 2010 (JGR 115, A03216, doi:10.1029/2009JA014805) paragraph 25; the paper paragraph itself was
  not readable (Wiley 403) - treat the paper attribution as INFERRED. Mooney 2021 independently confirms
  "Each forecast requires 4 h of input solar wind data". Note the 2010 slides say "the IMF for the last
  3 hours is used here", so the window changed between the 2010 talk and the released code.

### 1(d) Validity range and saturation (Newell et al. 2014, abstract via Crossref)

"The most notable advantage of OP-2013 is that it uses UV images from the GUVI instrument on the
satellite TIMED for high disturbance levels (dΦMP/dt > 1.2 MWb/s which roughly corresponds to Kp = 5+ or
6-). The range of validity is approximately 0 < dΦMP/dt <= 3.0 MWb/s (Kp about 8+) ... although OP-2010
breaks down in a variety of ways above Kp = 5+ or 6-, OP-2013 continues to show the auroral oval
advancing equatorward, at least to 55° MLAT or a bit less, and OP-2013 does not develop spurious large
noise patches." Also: "the coupling function ... predicts auroral power significantly better than Kp or
other traditional parameters". No explicit numeric cap on dΦ/dt in the abstract; the open code has none.

### 1(e) NOAA's product page and the probability mapping

* https://www.spaceweather.gov/products/aurora-30-minute-forecast (redirect target of the swpc.noaa.gov
  URL): "30 to 90 minute forecast of the location and intensity of the aurora"; lead time is "the time
  it takes for the solar wind to travel from the L1 observation point to Earth"; "An estimate of aurora
  viewing probability can be derived by assuming a linear relationship to the intensity of the aurora.
  This relationship was validated by comparison with data from the Ultraviolet imager (UVI) instrument on
  the NASA Polar satellite" (second sentence from the search index of the same page); "Hemispheric Power
  Index" = "an estimate of the total auroral energy input at each pole"; "The aurora does not need to be
  directly overhead but can be observed from as much as a 1000 km away when the aurora is bright and if
  conditions are right"; Kp fallback: "an alternative estimate of the solar wind forcing, based on the
  current Kp geomagnetic index is used to drive the OVATION model. When this occurs, there is no forecast
  lead time."
* https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt header: "Product: Ovation Aurora
  Short Term Forecast", "Cadence: 5 minutes", columns "Observation, Forecast, North-Hemispheric-Power-
  Index GigaWatts, South ... GigaWatts"; sample 2026-09-24 00:00 obs -> 01:22 forecast, 21 GW / 21 GW.
* Probability formula "P = 10 + 8·flux": **UNVERIFIED**. Not on any NOAA page fetched. Mooney et al. 2021
  (Met Office copy of the SWPC code) only say "The linear conversion of auroral flux to probability
  implemented in the version of OP-2013 at the Met Office are as originally developed by SWPC" and
  "probabilities were tuned by SWPC in response to citizen science observations ... (Rodney Viereck,
  private communications)". The open re-implementation auroramaps (`util.py`, `flux_to_probability`)
  instead applies, citing the APL IDL display code ("read_data_local.pro line 73", "geoconvert.pro line
  73"): `aurora = 10*flux; aurora[aurora<1]=0; aurora = 5*sqrt(aurora); aurora[aurora<4]=0;
  aurora[aurora>100]=100` (i.e. P = 5·sqrt(10·flux) % capped at 100, flux in erg cm-2 s-1). Whether the
  operational SWPC grid uses this or a "10 + 8·flux" form could not be established.
* https://www.spaceweather.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental: "The
  SWPC 3-Day Geomagnetic Forecast (Kp index) is used to drive the OVATION model", using the "maximum
  forecast geomagnetic activity (Kp) between 6pm and 6am US Central Time"; "In May 2026, the viewline was
  removed from this [still experimental] product."

---

## 2. Hemispheric power vs electrojet indices and vs visible aurora

* Ahn, Akasofu & Kamide 1983 (JGR, abstract via Crossref): "the three global quantities (watt) are related
  almost linearly to the AE(nT) and AL(nT) indices ... U_J = 2.3 x 10^8 · AE, U_A = 0.6 x 10^8 · AE and
  U_I = 2.9 x 10^8 · AE; U_J = 3.0 x 10^8 · AL, U_A = 0.8 x 10^8 · AL, and U_I = 3.8 x 10^8 · AL." (Data:
  71 IMS stations, 17-19 March 1978.) So particle energy injection ~0.06 GW per nT of AE (AE 500 nT ~
  30 GW); Joule heating ~0.23 GW per nT.
* Newell & Gjerloev 2011: r = 0.86 SME vs total nightside auroral power (above). A GW-per-nT regression
  was not obtainable (full text blocked).
* Newell & Gjerloev 2014 (open PDF) give per-MLT-sector regressions, Table 1, "AP(MLT) = b0(MLT) +
  b1(MLT)(best local index) + b2*(SME or <SME>). AP is in GW", e.g. 22 MLT: AP = -0.00127 + 0.0107·BE +
  0.00578·SME (66.2% of 1-min variance); 19 MLT: -0.287 + 0.00845·BE + 0.00431·SME (74.6%); 23 MLT:
  0.104 + 0.00762·BE + 0.00640·SME (61.7%). Single-index: "the global indices predict variances of
  r2(SMU) = 0.55, r2(SML) = 0.58, and r2(SME) = 0.66" (19 MLT); "r = 0.70 at 19:00 MLT and 0.66 at
  20:00 MLT" for SME alone; "The aurora is fairly predictable from 17:00 MLT to 04:00 MLT, roughly the
  region in which substorms occur". Note AP here is the power in a 1-h MLT sector from Polar UVI (1997),
  not hemispheric power.
* OVATION Prime's own hemispheric-power ranges (Sotirelis 2010 slides; consistent with the Newell 2009
  abstract percentages): quiet ("Low" = 0.25 <dΦ/dt>) diffuse e- 6.8, ion 2.3, mono 1.1, broadband 0.6 GW
  (sum ~10.8 GW); active ("High" = 1.5 <dΦ/dt>) 20.2, 4.9, 5.8, 4.8 GW (sum ~35.7 GW); all conditions
  12.6, 3.4, 3.3, 1.5 GW (~20.8 GW). Newell 2009 abstract: diffuse aurora "84% of the energy flux ...
  during conditions of low solar wind driving", "71%" when active; broadband "increasing by a factor of
  8.0 from low to high driving".
* NOAA "faint / bright / spectacular" GW scale: **UNVERIFIED / not found**. The 30-minute-forecast page,
  the viewline page, the experimental Aurora Dashboard and the tips page contain no GW thresholds (the
  dashboard and tips pages are Kp-based only). The only NOAA GW statements are the definition above and
  the tabular file. Third-party sites quote ~10 GW quiet / 15-25 GW for 60-62° etc., but these are not
  NOAA and were not used.
* POES 1-10 activity level: definition VERIFIED, GW table NOT. https://dmsp.bc.edu/html2/dmspssj4_hp.html
  (Boston College DMSP page, fetched): "The maps were based on 10 levels of geomagnetic activity which
  roughly correspond to the planetary magnetic index going from 0+ to 5+ ... The HPI is simply the number
  of the map selected"; "the original hemisphere power patterns only were validated up to 100 GW"; DMSP
  vs NOAA-12 simultaneous HP correlation 0.817 (falls to <= 0.5 for +/-20 min or other orbit planes).
  Emery et al. 2008 (abstract via Crossref): "The hemispheric power (Hp) estimates are very crude, coming
  from single satellite passes referenced to 10 global activity levels". Fuller-Rowell & Evans 1987
  (abstract via Crossref) confirms the index "is an estimate of the energy deposited into a single
  hemisphere by incident particles". The GW range per level (the familiar ~2.5/4/6/10/16/24/39/61/96 GW
  bin edges) was NOT found on any fetched page (NCEI POES SEM page, SWPC pmap page, Wayback copies of the
  2010/2012 SWPC POES pages - the archived pages describe the "activity level" and a normalization factor
  n but give no GW table). Treat any such table as UNVERIFIED.
* Storm-category HP averages "20 GW quiet, 79 GW moderate storms, 129 GW intense storms" (attributed to
  Zhang et al. 2006, JGR 10.1029/2005JA011065) appeared only in a search snippet; the fetched Crossref
  abstract confirms the paper analysed "NOAA/POES hemispheric power" by storm category (moderate
  -100 < Dst* <= -50 nT; intense Dst* <= -100 nT) but does not contain the three numbers. UNVERIFIED.

---

## 3. Storm-time oval at 65-70° MLAT: does the poleward edge move equatorward of Tromsø?

Verified pieces:

* Equatorward boundary vs Kp (statistical): SWPC tips page: "At Kp = 0, the equator ward edge of the
  auroral oval is approximately 66 degrees. And it moves equatorward about 2 degrees for each level of
  Kp." Gussenhoven et al. 1987 (JGR, NGDC PDF) Table 2, electrons, DMSP F6 Jan 1983: 0400-0500 MLT
  Λ = 65.9 - 1.68 Kp (cc -0.60); 1900-2000 MLT 71.4 - 2.01 Kp (cc -0.72); 2000-2100 68.8 - 1.17 Kp
  (authors call these "preliminary"; "in the earlier studies [1981, 1983] the evening electron boundaries
  had negative slopes that increased with MLT toward midnight"). Gussenhoven et al. 1983 (abstract via
  Crossref): "The boundaries are well-ordered by Kp in the night sector ... The equatorward diffuse
  auroral boundary is well fit by a circle at each activity level. The center of the circle is offset from
  the geomagnetic pole, and the radius of the circle increases with increasing magnetic activity ... each
  evening sector boundary was projected to a midnight boundary. The projected midnight boundary serves
  as an index of auroral activity". The 1983 midnight coefficients themselves: UNVERIFIED (full text
  blocked; DMSP MBI page lists the reference but no equation).
* Carbary 2005 (Space Weather, abstract via Crossref), Polar UVI binned by Kp, boundaries at 4 photons
  cm-2 s-1: "The boundary and peak locations vary linearly with Kp index ... As a general rule of thumb,
  the UV intensity peak shifts 1° in magnetic latitude for each increment in Kp. The fits are
  surprisingly good for Kp < 6 but begin to deteriorate at high Kp".
* Feldstein-oval numbers used by Aurora Hunter (arXiv 2605.24038, fetched): "the nightside peak
  continues equatorward from 67° to 63° to 61° MLAT" for Kp 1.0, 3.7, 5.0 (Feldstein & Starkov 1967;
  Holzworth & Meng 1975 parameterisation, stations converted to AACGM at 110 km).
* Yokoyama, Kamide & Miyaoka 1998 (Ann. Geophys. 16, 566, PDF fetched; DMSP auroral boundary index =
  equatorward boundary at midnight, 423 storms 1983-1991): "the equatorward boundary of the belt at
  midnight expands equatorward, reaching its lowest latitude about one hour before Dst peaks"; March 1989:
  "when the Dst value is larger than -50 nT, the boundary index is in general between 65° and 55° in
  corrected geomagnetic latitude. Once the Dst index decreases beyond -100 nT, however, the auroral belt
  moved equatorward dramatically, to below 50°"; "the auroral boundary must be located on average, at
  65° during non-storm times"; quoting Schulz (1997): "the polar cap boundary, i.e., the boundary between
  closed and open field lines, moves approximately 2.3° equatorward for each 100 nT decrease in Dst".
* Milan et al. 2009a (Ann. Geophys. 27, 2913, "Influences on the radius of the auroral oval", PDF
  fetched; IMAGE SI12, June 2000-May 2002, >308,000 images): distribution of best-fit oval radius λ
  "peaks at an oval radius of 19°"; "oval radii of 15°, 20°, 25° and 30° correspond approximately to open
  flux values of 0.25, 0.5, 1.0, and 1.4 GWb" with "the OCB ... 5° of latitude poleward of the best-fit
  circle"; "there is a strong dependence of oval radius on Sym-H, the oval growing in radius as Sym-H
  becomes increasingly negative, varying from a mean value of approximately 18° at Sym-H of 0 nT to
  close to 30° as Sym-H dips to -200 nT". Populations: "relatively undisturbed conditions, Sym-H >
  -75 nT, moderate storm conditions, -125 nT > Sym-H > -75 nT, and intense storm conditions,
  Sym-H < -125 nT".
* Milan et al. 2009b (Ann. Geophys. 27, 659, PDF fetched; 1993 IMAGE substorms): "Onsets were observed
  at magnetic latitudes between 55° and 74°"; categories "(I) Λonset > 68°, (II) 66° < Λonset < 68°,
  (III) 64° < Λonset < 66°, (IV) 62° < Λonset < 64°, (V) Λonset < 62°"; "dayside reconnection is expected
  to occur at a faster rate prior to low latitude onsets, but also that the ring current is enhanced for
  these events".
* Mooney et al. 2024 (IMAGE FUV boundaries, Kp 5-8 composite, above): observed nightside poleward
  boundary "between 70° and 75°" on average for Kp 5-8.

Derived answer (INFERRED from the verified numbers above): at Kp 5-6 the mean nightside poleward
boundary is still at 70-75° (Mooney 2024), i.e. Tromsø (67.3°) and Lapland are inside the oval with the
brightest ring near 61° (Feldstein) to ~55-60° (SWPC 2°/Kp rule: equatorward edge ~54-56°). Only in the
intense-storm regime does the poleward edge reach the auroral zone: with Milan 2009a, Sym-H ~ -200 nT
gives λ ~ 30°, i.e. the brightest ring near 60° MLAT and the open/closed boundary ~5° poleward, near
65° - equatorward of Tromsø and at/near the northern edge of Lapland; with Yokoyama 1998 the midnight
equatorward edge is below 50-55° for Dst < -100 nT. So "aurora on the southern horizon or nothing
overhead" is expected for Tromsø roughly when Dst/Sym-H < -150 to -200 nT (Kp 8-9 class), not merely at
Kp 6-7. No fetched Tromsø/Svalbard observer statement documents this (Norwegian-language searches only
returned commercial/tourism pages) - UNVERIFIED as testimony.

---

## 4. Magnetometer/camera aurora alert services: thresholds and skill

* AuroraWatch UK - Case et al. 2017 (Earth Space Sci. 4, 746, doi:10.1002/2017EA000328; Lancaster EPrints
  PDF fetched). Index: "The AWUK activity index is therefore determined using both the H and E
  components"; quiet-day curve from the five quietest days of the month; "we also compute the maximum
  hourly range (in both the H and E components) in the disturbance values. Whichever of the disturbance
  level or the hourly range is greater, in either H or E, is used as the activity index"; "determined
  every 3 min". Primary magnetometer Crooktree (SAMNET, near Aberdeen), Lancaster and AWUK's own
  network as fallbacks; sensor resolution 0.05 nT. Table 1: Green A < 50 nT; Yellow 50 <= A < 100 nT
  ("Aurora may be visible by eye from Scotland"); Amber 100 <= A < 200 nT ("likely ... from Scotland,
  northern England, and Northern Ireland"); Red A >= 200 nT ("likely ... from anywhere in the UK").
  Frequency: "the alert status was yellow for 4.7%, amber for 1.0%, and red for 0.3% of the time which
  corresponds to approximately 412 h of yellow, 88 h of amber, and 23 h of red alert level per year";
  17-year set, "over 150,000 h (99.94% data availability)". Skill vs sightings: none published in the
  paper; only "the elevated status percentages closely match the percentage of time that Kp >= 4" (MIST
  nugget: "the alerts match well with the wider Kp index and the solar cycle"). Hit/false-alarm rates:
  UNVERIFIED (not in the paper).
* FMI "Auroras Now!" (Finland). https://space.fmi.fi/~kakis/AN/AN_10min_en.html: quantity = maxima
  changes of the horizontal components "in units of 0.01 nT/s with 10-minute resolution"; an hour is
  "disturbed" above 30 (Nurmijärvi), 35 (Hankasalmi), 42 (Oulujärvi), 50 (Sodankylä), 52 (Muonio), 57
  (Kevo and Kilpisjärvi), i.e. 0.30 nT/s in the south to 0.50-0.57 nT/s in Lapland (0.5 nT/s = 5 nT per
  10 s). Current public service (https://en.ilmatieteenlaitos.fi/auroras-and-space-weather): "The value
  shown is the R-index, which measures the rate of change of the magnetic field within a 10-minute
  interval. For each measuring station, there are two threshold values ... When the lower but not the
  upper threshold is crossed, auroras are possible, but they are usually dim. When the upper threshold is
  exceeded, it is very likely that one can see auroras." (numeric R-index thresholds not published on the
  page). Climatology (https://en.ilmatieteenlaitos.fi/auroras-in-finland): on clear dark nights auroras
  are seen "75 % of nights" in northern Lapland (Kilpisjärvi), "roughly 25 % of nights" in central
  Finland, "once in a month on average" on the south coast.
* Sodankylä "Aurora Alert": no such service found - SGO offers real-time magnetograms/all-sky images
  only (search of sgo.fi). UNVERIFIED/absent.
* Space Weather Canada (https://spaceweather.gc.ca/forecast-prevision/short-court/desc-en.php): hourly
  range (max-min per hour) thresholds, auroral zone: quiet 0-93, unsettled 94-168, active 169-299,
  stormy 300-874, major storm >= 875 nT; sub-auroral 0-23 / 24-43 / 44-77 / 78-227 / >= 228 nT; polar
  cap 0-55 / 56-100 / 101-179 / 180-524 / >= 525 nT; Kp equivalents quiet 0-3, unsettled 3-4, active 4-5,
  stormy 5-7, major storm 7-9. (A search snippet gives the auroral zone as 63-77° magnetic latitude and
  Kp >= 4 as the alert threshold; not in fetched text.) No aurora-visibility skill published.
* AuroraMAX (CSA page https://www.asc-csa.gc.ca/eng/astronomy/northern-lights/auroramax-observatory.asp,
  modified 2022-09-27): a ground camera in Yellowknife, turns on "as soon as the Sun sets ... between
  August and May"; no alert criteria stated; auroramax.com returned only a title. Start year 2009 and
  the X-based alerts appear only in search snippets - UNVERIFIED.
* Alaska GI (https://www.gi.alaska.edu/monitors/aurora-forecast): Kp-based ("computed by averaging the
  magnetic activity from around eight stations ... every three hours"; data "from NOAA's Geomagnetic
  Forecast and 27-Day Space Weather Outlook"); "Inside the auroral oval, however, Kp is less relevant,
  since even when global activity is low, auroral activity can be high"; recommends local magnetometers
  and all-sky cameras. Not magnetometer-triggered.
* IRF Kiruna "IRF Aurora Alert" (https://www.irf.se/en/om-irf/kunskapsbank/irf-aurora-alert/, launch news
  2024-01-23): camera-based, not magnetometer: "covers the aurora visible within a circle of approx.
  300 km radius around Kiruna"; one image per minute; algorithm "provided by Dr. Masatoshi Yamauchi".
  Yamauchi & Brändström 2023 (GI 12, 71, https://gi.copernicus.org/articles/12/71/2023/): two-step
  detection of "local-arc breaking"; "Level 6 indicating clear local-arc breaking and Level 4 indicating
  a precursor"; "The alert system started on 5 November 2021"; "a nearly one-to-one correspondence
  between Level 6 and eye-identified local-arc breaking ... with an uncertainty of under 10 min" (about
  90% detection over ~50 observable nights; misses due to Moon, twilight, aurora far north).
* Tromsø / NOSWE (https://site.uit.no/spaceweather/data-and-products/aurora/ and /data-and-products/):
  aurora nowcast, 1-h and 4-h forecasts "using the SvalTrackII software developed by Prof. Fred
  Sigernes" (Kp-driven oval model), listed products include "Ground Geomagnetic Activity (deltaH)",
  "Rate of Change (dB/dt) Time Series", "Near Real-time Auroral Electrojet Tracker", TGO all-sky camera
  at Skibotn ("update every 2 minutes during night, turned OFF in interval UT 05-16"). No magnetometer
  alert thresholds published; a "Hansen/Oksavik magnetometer alert for Tromsø" was not found -
  UNVERIFIED/absent. UNIS (https://aurora.unis.no/AuroraForecast.html): "The methods by Starkov (1994) and
  Zhang and Paxton (2008) are used to mathematically calculate the size and location of the auroral
  ovals"; "If you have a clear view of the oval above your head ... then you have up to 75% chance to see
  the aurora"; Sun must be "~10 degrees below the horizon".
* Kp-based forecast skill at auroral-zone latitude: Aurora Hunter (arXiv 2605.24038, 2026, fetched; all-sky
  cameras Tromsø MLAT 66.96° 2015-2020, Kiruna 65.24° 2020-2024, Skibotn 66.87° 2022-2025): occurrence
  (Stage 1) ROC-AUC 0.849 (Tromsø held-out years), 0.753 (Kiruna), 0.678 (Skibotn, fully withheld);
  with cloud/moon stage 0.958 / 0.933; "Above Kp = 2 the clear-sky rate agrees between the two sites,
  0.755 at Tromsø and 0.749 at Kiruna" and "both series saturate above Kp ~ 2" (asymptote 0.795 for
  clear-sky hours); "fewer than 20 per bin above Kp = 4.75 for the clear subset". No Kp-only baseline
  number given. Nanjo et al. 2022 (Sci. Rep. 12, 8038, nature.com fetched; Tromsø digital all-sky
  cameras, 10 seasons): occurrence "exceeded 70%" in the early declining phase; "highest one in October
  was 65%"; occurrence correlates with "the percentage of times when the K-index was 4 or higher during
  clear nights in Tromsø"; discrete/arc aurora peak before 00 MLT, diffuse peak ~04 MLT (01 UT).
* OVATION view line vs citizen reports - Case, MacDonald & Viereck 2016 (Space Weather 14, 198, abstract
  via Crossref): "nearly 500 citizen science auroral reports" (March-April 2015, Aurorasaurus) vs the
  OP-2013-based SWPC view line: "this updated SWPC view line is conservative in its estimate and that the
  aurora is often viewable further equatorward than is indicated by the forecast ... An OVATION Prime
  (2013) energy flux-based equatorial boundary view line is also developed and is found to provide the
  best overall agreement with the citizen science reports, with an accuracy of 91%." Kosar et al. 2018
  (Earth Space Sci., OSTI manuscript fetched): 2015 SWPC view line "accuracy (ACC) of approximately
  50.3%"; "~50% of the observations are reported from the latitudes that are further equatorward of the
  view line estimated by NOAA"; reports "peak around ~58° latitude and span a wide range between 40° and
  75°". A split of results by latitude (auroral zone vs mid-latitude): NOT available in the fetched
  material - UNVERIFIED.

---

## 5. Viewing geometry for auroral-zone observers

Altitude of the lower border (verified):
* Nature 133, 687 (1934), "Height of the Aurora in Canada" (fetched): "the height at which the lower limits
  of the auroral arcs and bands were most frequently seen was 105 km., a value in close agreement with
  that found by Størmer and others in Norway" (220 points, 5-km groups, Saskatoon 1932-33).
* HGSS 15, 17 (2024) (fetched): "After analysing thousands of simultaneous photographs, Störmer was able
  to make the conclusion that the lower border of auroral forms is located about 100 km above the
  Earth's surface"; storm of 27 Feb 1929: lowest border "at an altitude of 82 km".
* Størmer's 12,330-aurora height catalogue (The Polar Aurora, 1955) - only bibliographic confirmation
  fetched (Nature 178, 713, 1956 review; Oxford, 403 pp.); the "12,330" count and the 100-110 km modal
  bin were seen only in search snippets - UNVERIFIED as quotation.
* Modern peak-emission statistics, Ann. Geophys. 41, 1 (2023) (fetched; MIRACLE 2000-2007, 57,907
  simultaneous green/blue height pairs): green 557.7 nm peak mean 114.84 +/- 0.06 km, median 114.0 km;
  blue 427.8 nm mean 116.55 +/- 0.07 km, median 115.0 km. (Peak emission, not lower border, which "is
  dependent on the instrument sensitivity".)

Derivation (spherical Earth, R = 6371 km, computed here; refraction with k = 0.13 only for the horizon):
elevation e of a point at height h and great-circle distance d: tan e = [(R+h)cos(d/R) - R] /
[(R+h) sin(d/R)]. Results (1° latitude = 111.2 km):

| h (km) | e = 0° geometric / refracted | 2° | 5° | 10° | 20° | 30° | 45° | 60° |
|---|---|---|---|---|---|---|---|---|
| 100 | 1121 / 1203 km | 921 km (8.3° lat) | 694 km (6.2°) | 463 km (4.2°) | 256 km (2.3°) | 167 km (1.5°) | 98 km (0.9°) | 57 km (0.5°) |
| 110 | 1175 / 1261 km | 974 km (8.8°) | 743 km (6.7°) | 502 km (4.5°) | 280 km (2.5°) | 183 km (1.6°) | 107 km (1.0°) | 62 km (0.6°) |
| 150 | 1369 / 1470 km | 1164 km | 920 km (8.3°) | 646 km (5.8°) | 373 km (3.4°) | 246 km (2.2°) | 145 km (1.3°) | 84 km (0.8°) |
| 250 (ray tops) | 1756 / 1887 km | 1548 km | 1284 km (11.5°) | 959 km (8.6°) | 587 km (5.3°) | 396 km (3.6°) | 236 km (2.1°) | 138 km (1.2°) |

Consequences: a 100-110 km lower border is 5° above the horizon at ~700-740 km (6-7° of latitude), which
matches NOAA's "observed from as much as a 1000 km away" for the geometric horizon (~1100-1200 km,
sqrt(2Rh) = 1129 km for 100 km). "Near zenith" (lower border above ~45°) requires the arc within ~1° of
latitude (~100 km); an arc 2-3° of latitude away has its lower border at only 15-25° elevation, though
rays reaching 250 km would then top out at 35-45°. So the claim "within 2-3° of latitude to be near
zenith" holds only for the ray tops, not for the lower border (INFERRED from the verified altitudes).

---

## Citation blocks (one per source; URL = what was fetched)

1. Newell, Liou, Zhang, Sotirelis, Paxton, Mitchell (JHU/APL), 2014, Space Weather 12, 368,
   doi:10.1002/2014SW001056. Fetched: https://api.crossref.org/works/10.1002/2014SW001056 (publisher
   abstract; Wiley page 403). Verified: validity 0 < dΦ/dt <= 3.0 MWb/s (Kp ~8+); GUVI used above
   1.2 MWb/s (Kp 5+/6-); OP-2010 breaks down above Kp 5+/6-; oval to 55° MLAT; substorm caveat; tested
   against Polar UVI hemispheric power.
2. Machol, Green, Redmon, Viereck, Newell (NOAA NGDC/SWPC), 2012, Space Weather 10, S03005,
   doi:10.1029/2011SW000746. Fetched: https://api.crossref.org/works/10.1029/2011SW000746 and
   https://www.ngdc.noaa.gov/stp/space-weather/online-publications/stp_division/stp_presentations/2011/agu_2011/machol-et-al_agu2011_poster.pdf.
   Verified: Polar UVI 1997-98, Kp >= 3, 77% overall, 86% hit rate, 14% FAR, 58% detection, thresholds
   1 erg cm-2 s-1 / 2.5 kR, 2° x 1 h validation grid, post-midnight low-latitude gap.
3. Newell, Sotirelis, Wing (JHU/APL), 2009, JGR 114, A09207, doi:10.1029/2009JA014326. Fetched:
   https://api.crossref.org/works/10.1029/2009JA014326. Verified: model construction, 84%/71% diffuse
   share, broadband x8.0.
4. Newell, Sotirelis, Wing, 2010, JGR 115, A03216, doi:10.1029/2009JA014805. Fetched:
   https://api.crossref.org/works/10.1029/2009JA014805 (abstract only). Verified: seasonal ratios
   (mono 1.70, diffuse 1.30, broadband 1.26 winter/summer). Weights paragraph (par. 25) NOT readable.
5. Sotirelis, Newell, Wing (JHU/APL), 2010, Space Weather Workshop talk. Fetched:
   https://www.spaceweather.gov/sites/default/files/images/u33/SOTIRELIS%20SWW%202010.pdf. Verified:
   R = 0.73/0.69/0.71 and 0.75/0.76/0.73 vs UVI; R = 0.74 UVI power vs dΦ/dt; 46,080 regressions; 3-h
   IMF history in 2010; GW budget table; UVI sensitivity 0.25 erg cm-2 s-1.
6. NOAA SWPC, Aurora 30-Minute Forecast product page. Fetched:
   https://www.spaceweather.gov/products/aurora-30-minute-forecast. Verified: 30-90 min lead, linear
   probability, hemispheric power definition, 1000 km, Kp fallback.
7. NOAA SWPC hemispheric power file. Fetched: https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt.
   Verified: 5-min cadence, GW columns, ~82-min obs-to-forecast offset on 2026-09-24.
8. NOAA SWPC "Tips on viewing the aurora". Fetched: https://www.spaceweather.gov/content/tips-viewing-aurora.
   Verified: Kp 0-2 / 3-5 / 6-7 / 8-9 descriptions; "Kp = 0 ... 66 degrees ... about 2 degrees for each
   level of Kp"; ~1000 km viewing; 22-02 local time peak.
9. NOAA SWPC viewline (experimental) page. Fetched:
   https://www.spaceweather.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental.
   Verified: Kp-forecast-driven OVATION; viewline removed May 2026.
10. NOAA SWPC Aurora Dashboard (experimental) and POES pmap notice. Fetched:
    https://www.spaceweather.gov/communities/aurora-dashboard-experimental and
    https://www.spaceweather.gov/pmap. Verified: no GW scale; POES maps replaced by the 30-min forecast.
11. NOAA SWPC POES pages (archived 2010/2012). Fetched via curl:
    https://web.archive.org/web/20120601000000id_/http://www.swpc.noaa.gov/pmap/ and
    https://web.archive.org/web/20100601000000id_/http://www.swpc.noaa.gov/pmap/pmapN.html. Verified:
    activity level from the most recent pass, normalization factor n (< 2.0 confident), color scale
    0-10 erg cm-2 s-1; no GW table.
12. NASA CCMC Ovation-Prime 1.0 page. Fetched: https://ccmc.gsfc.nasa.gov/models/Ovation-Prime~1.0/.
    Verified: "statistical distribution of auroral precipitation" from "11 years of DMSP" data.
13. Kilcommons, OvationPyme (OP-2010 in Python). Fetched:
    https://raw.githubusercontent.com/lkilcommons/OvationPyme/master/ovationpyme/ovation_utilities.py.
    Verified: 4-h window, prev_hour_weight 0.65 -> [0.27, 0.42, 0.65, 1.0], coupling formula, no cap.
14. Möstl et al. (helioforecast), auroramaps. Fetched:
    https://raw.githubusercontent.com/helioforecast/auroramaps/master/auroramaps/util.py. Verified: same
    weights "according to Newell et al. 2010, par 25"; flux-to-probability 5*sqrt(10*flux) capped 100
    from APL IDL display code.
15. Mooney et al. (Met Office/UCL/Leicester), 2021, Space Weather 19, e2020SW002688. Fetched:
    https://nora.nerc.ac.uk/id/eprint/530936/1/2020SW002688.pdf and
    https://api.crossref.org/works/10.1029/2020SW002688. Verified: ROC 0.82 / 0.59 dayside / 0.55 Kp 8;
    underprediction factor 1.1-6; SWPC-tuned linear probability; 4 h of solar wind input; substorm
    poleward-boundary shift up to 3°.
16. Mooney et al., 2024, JGR Space Physics, doi:10.1029/2023JA031478. Fetched:
    https://nora.nerc.ac.uk/id/eprint/537882/1/JGR%20Space%20Physics%20-%202024%20-%20Mooney%20-%20Evaluating%20Auroral%20Forecasts%20Against%20Satellite%20Observations%20Under%20Different%20Levels%20of.pdf.
    Verified: poleward-edge unreliability for Kp >= 3; observed Kp 5-8 nightside poleward boundary
    70-75°; event counts per Kp; valid to Kp 8.
17. Mitchell, Newell, Gjerloev, Liou, 2013, JGR 118, doi:10.1002/jgra.50343 (OVATION-SM). Fetched:
    https://api.crossref.org/works/10.1002/jgra.50343. Verified: SME + substorm-onset model, >70% of UVI
    nightside variance.
18. Newell & Gjerloev, 2011, JGR 116, A12211, doi:10.1029/2011JA016779. Fetched:
    https://www.mendeley.com/catalogue/af8a94a9-3d8f-330d-97de-1826ae63d0f7/ (abstract; Wiley/ADS blocked).
    Verified: r = 0.86 SME vs nightside power; AE(12) r = 0.81; SML onset detection 50% more likely, 4 vs
    8 min median delay; 10,719 SML onsets 1997-2002; 1,081 UVI substorms.
19. Newell & Gjerloev, 2014, JGR 119, 9790, doi:10.1002/2014JA020524. Fetched:
    https://birkeland.uib.no/wp-content/uploads/2018/02/49_Newell_JGR_NOA.pdf. Verified: Table 1
    per-MLT AP regressions (GW), r2 values, OVATION-history remark.
20. Ahn, Akasofu, Kamide, 1983, JGR 88, 6275, doi:10.1029/JA088iA08p06275. Fetched:
    https://api.crossref.org/works/10.1029/JA088iA08p06275. Verified: U_A = 0.6e8·AE W, U_J = 2.3e8·AE,
    U_I = 2.9e8·AE; AL versions 0.8e8 / 3.0e8 / 3.8e8.
21. Boston College DMSP group, "DMSP SSJ4 - Hemispheric Power" and "Midnight Boundary Index". Fetched:
    https://dmsp.bc.edu/html2/dmspssj4_hp.html and https://dmsp.bc.edu/html2/dmspssj4_midnit.html.
    Verified: HP/HPI definition (Evans), 10 levels ~ Kp 0+ to 5+, validated to 100 GW, NOAA-12 vs DMSP
    r = 0.817; MBI concept and Gussenhoven references.
22. Fuller-Rowell & Evans, 1987, JGR 92, 7606. Fetched: https://api.crossref.org/works/10.1029/JA092iA07p07606.
    Verified: activity index = hemispheric energy deposition, 1° x 2° MLT grid. GW bins NOT in abstract.
23. Emery et al., 2008, JGR 113, A06311. Fetched: https://api.crossref.org/works/10.1029/2007JA012866.
    Verified: Hp "very crude ... referenced to 10 global activity levels".
24. McGranaghan et al., 2021 (JGR Space Physics; arXiv:2011.10117). Fetched: https://arxiv.org/pdf/2011.10117.
    Verified: smoothness limitation statement; >50% error reduction vs OVATION Prime.
25. Gussenhoven, Hardy, Heinemann, 1983, JGR 88, 5692. Fetched: https://api.crossref.org/works/10.1029/JA088iA07p05692.
    Verified: DMSP F2/F4, Kp ordering at night, circle fits, midnight-projected boundary index.
26. Gussenhoven, Hardy, Heinemann, Burke, 1987, JGR 92, 3273 (ion boundary). Fetched:
    https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/dmsp/doc/Gussenhoven%20-%201987%20-%20Equatorward%20Boundary%20Ions%20-%20JGR.pdf.
    Verified: Table 2 electron regressions (e.g. 0400-0500 MLT 65.9 - 1.68 Kp; 1900-2000 71.4 - 2.01 Kp).
27. Gussenhoven, Hardy, Burke, 1981, JGR 86, 768. Fetched: https://api.crossref.org/works/10.1029/JA086iA02p00768.
    Verified: >6000 crossings, ΛCGM linear in Kp per MLT bin.
28. Yokoyama, Kamide, Miyaoka, 1998, Ann. Geophys. 16, 566. Fetched:
    https://angeo.copernicus.org/articles/16/566/1998/angeo-16-566-1998.pdf. Verified: 423 storms
    1983-1991; 1-h lead of boundary minimum before Dst minimum; 55-65° for Dst > -50; < 50° for
    Dst < -100 (March 1989); 65° non-storm average; Schulz 2.3°/100 nT.
29. Milan, Hutchinson, Boakes, Hubert, 2009, Ann. Geophys. 27, 2913. Fetched:
    https://angeo.copernicus.org/articles/27/2913/2009/angeo-27-2913-2009.pdf (and abstract page).
    Verified: radius 19° mode; 18° at Sym-H 0 to ~30° at -200 nT; OCB 5° poleward; storm classes.
30. Milan, Grocott, Forsyth, Imber, Boakes, Hubert, 2009, Ann. Geophys. 27, 659. Fetched:
    https://angeo.copernicus.org/articles/27/659/2009/angeo-27-659-2009.pdf. Verified: onsets 55-74°;
    five onset-latitude categories; ~2000 substorms.
31. Carbary, 2005, Space Weather 3, S10001, doi:10.1029/2005SW000162. Fetched:
    https://api.crossref.org/works/10.1029/2005SW000162. Verified: 1°/Kp peak shift; fits good Kp < 6.
32. Hardy, Gussenhoven, Holeman, 1985, JGR 90, 4229. Fetched: https://api.crossref.org/works/10.1029/JA090iA05p04229.
    Verified: Kp 0-5 and >= 6- levels of the Hardy model.
33. Case, Marple, Honary, Wild, Billett, Halford, 2017, Earth and Space Science 4, 746,
    doi:10.1002/2017EA000328. Fetched: https://eprints.lancs.ac.uk/id/eprint/88521/1/Case_et_al_2017_Earth_and_Space_Science.pdf,
    https://api.crossref.org/works/10.1002/2017EA000328, https://aurorawatch.lancs.ac.uk/alerts/,
    https://aurorawatch.lancs.ac.uk/explanation/,
    https://www.mist.ac.uk/science/nuggets/75-aurorawatch-uk-an-automated-aurora-alert-system.
    Verified: thresholds 50/100/200 nT; H and E components; hourly range vs QDC deviation; 3-min
    update; 412/88/23 h per year; no sighting-based skill.
34. Case, MacDonald, Viereck, 2016, Space Weather 14, 198, doi:10.1002/2015SW001320. Fetched:
    https://api.crossref.org/works/10.1002/2015SW001320. Verified: ~500 reports, conservative view line,
    91% accuracy of flux-based boundary.
35. Kosar, MacDonald, Case, Heavner, 2018, Earth and Space Science 5, 970 (OSTI accepted manuscript).
    Fetched: https://www.osti.gov/pages/servlets/purl/1484671. Verified: 2015 view-line accuracy 50.3%;
    ~50% of reports equatorward; report latitude peak ~58°, range 40-75°.
36. Finnish Meteorological Institute. Fetched: https://space.fmi.fi/~kakis/AN/AN_10min_en.html,
    https://en.ilmatieteenlaitos.fi/auroras-and-space-weather, https://en.ilmatieteenlaitos.fi/auroras-in-finland,
    https://en.ilmatieteenlaitos.fi/northern-lights (aurorasnow.fmi.fi returned 403). Verified: station
    thresholds in 0.01 nT/s, R-index two-threshold scheme, 75%/25%/monthly climatology.
37. Natural Resources Canada, Space Weather Canada. Fetched:
    https://spaceweather.gc.ca/forecast-prevision/short-court/desc-en.php and
    https://www.spaceweather.gc.ca/forecast-prevision/short-court/zone-en.php. Verified: hourly-range
    thresholds per zone and Kp equivalences.
38. University of Alaska Fairbanks Geophysical Institute. Fetched: https://www.gi.alaska.edu/monitors/aurora-forecast.
    Verified: Kp-based; "Inside the auroral oval ... Kp is less relevant".
39. Swedish Institute of Space Physics (IRF). Fetched: https://www.irf.se/en/om-irf/kunskapsbank/irf-aurora-alert/,
    https://www.irf.se/en/om-irf/ar-det-norrsken-i-kiruna/,
    https://www.irf.se/en/aktuellt/2024/01-23-swedish-institute-of-space-physics-launches-aurora-app-for-kiruna/.
    Verified: camera-based app (23 Jan 2024), ~300 km radius, 1-min cadence.
40. Yamauchi & Brändström (IRF), 2023, Geosci. Instrum. Method. Data Syst. 12, 71. Fetched:
    https://gi.copernicus.org/articles/12/71/2023/. Verified: Level 4/6, start 5 Nov 2021, <10 min,
    ~90% detection.
41. Norwegian Centre for Space Weather (UiT/TGO). Fetched: https://site.uit.no/spaceweather/data-and-products/aurora/,
    https://site.uit.no/spaceweather/data-and-products/aurora/tromso/, https://site.uit.no/spaceweather/data-and-products/.
    Verified: SvalTrackII-based nowcast/1h/4h; deltaH, dB/dt, electrojet tracker products; Skibotn ASC.
    No thresholds.
42. UNIS/KHO Aurora Forecast. Fetched: https://aurora.unis.no/AuroraForecast.html. Verified: Starkov 1994 +
    Zhang & Paxton 2008 ovals; NOAA Kp; "up to 75% chance" when the oval is overhead; Sun ~10° below
    horizon.
43. Canadian Space Agency, AuroraMAX. Fetched: https://www.asc-csa.gc.ca/eng/astronomy/northern-lights/auroramax-observatory.asp
    (https://auroramax.com/ returned only a title). Verified: Yellowknife camera, season Aug-May.
44. Aurora Hunter (arXiv:2605.24038, 2026). Fetched: https://arxiv.org/abs/2605.24038 and
    https://arxiv.org/html/2605.24038. Verified: station MLATs, ROC-AUC values, Kp saturation ~0.755,
    Feldstein oval numbers 67°/63°/61°, AACGM at 110 km.
45. Nanjo et al., 2022, Sci. Rep. 12, 8038. Fetched: https://www.nature.com/articles/s41598-022-11686-8
    (PMC returned a captcha). Verified: occurrence statistics and K-index correlation.
46. Nature 133, 687 (1934), "Height of the Aurora in Canada". Fetched: https://www.nature.com/articles/133687b0.
    Verified: 105 km most frequent lower limit; agreement with Størmer.
47. HGSS 15, 17 (2024), early auroral photography at Sodankylä. Fetched: https://hgss.copernicus.org/articles/15/17/2024/.
    Verified: Størmer's ~100 km lower border; 82 km on 27 Feb 1929.
48. Ann. Geophys. 41, 1 (2023), altitude of green and blue aurora. Fetched: https://angeo.copernicus.org/articles/41/1/2023/.
    Verified: 114-117 km peak-emission statistics.
49. Nature 178, 713 (1956) review of Størmer, The Polar Aurora. Fetched: https://www.nature.com/articles/178713a0.
    Verified: bibliographic only.
50. Zhang et al., 2006, JGR 111, A01104. Fetched: https://api.crossref.org/works/10.1029/2005JA011065.
    Verified: storm classes and that POES HP was analysed; the 20/79/129 GW values not in the abstract.
51. NOT FETCHED (all attempts 403): Sigernes et al. 2011, J. Space Weather Space Clim. 1, A03
    (Starkov 1994 boundary formulas; https://www.swsc-journal.org/articles/swsc/pdf/2011/01/swsc110021.pdf);
    Newell & Gjerloev 2011 full text; Sotirelis & Newell 2000; Landry & Anderson 2019; Carbary 2005 full
    text (Kp tables); Holzworth & Meng 1975 coefficients.

---

## Numbers to use

| Constant | Value | Source (fetched) | Confidence |
|---|---|---|---|
| OVATION grid (OP-2010 as validated) | 15 min MLT x 0.25° MLAT, 50-90° MLAT (paper); code: 96 MLT x 120 MLAT bins | Machol poster (2); Sotirelis 2010 (5) | verified (note: NOAA's public grid is 96 x 80, 50-89.5°) |
| Solar-wind averaging window | 4 h (2010 talk said 3 h) | Mooney 2021 (15); OvationPyme (13); auroramaps (14) | verified |
| Hourly weights, most recent first | 1, 0.65, 0.42, 0.27 (0.65^n) | OvationPyme, auroramaps code | verified in code; paper attribution (Newell 2010 par. 25) inferred |
| Coupling function | dΦ/dt = v^(4/3) B_T^(2/3) sin^(8/3)(θ/2) | Machol poster; OvationPyme | verified |
| OP-2013 validity | 0 < dΦ/dt <= 3.0 MWb/s (Kp ~8+); GUVI fill above 1.2 MWb/s (Kp 5+/6-); OP-2010 breaks down above Kp 5+/6- | Newell 2014 abstract (1) | verified |
| OP-2013 oval reach | equatorward "at least to 55° MLAT" | Newell 2014 (1) | verified |
| OP vs Polar UVI hemispheric power | R = 0.73 (single images), 0.75 (1-h averages); NOAA HP nowcast 0.69/0.76; Hardy-Kp 0.71/0.73 | Sotirelis 2010 (5) | verified |
| UVI power vs dΦ/dt | R = 0.74 (vs Bs 0.63, EKL 0.69) | Sotirelis 2010 (5) | verified |
| Machol 2012 visible-aurora skill | correct 77% overall; 86% when aurora predicted; FAR 14%; detection 58% | Machol 2012/poster (2) | verified |
| OP-2013 ROC (Met Office vs IMAGE) | 0.82 overall; 0.59 dayside; 0.55 at Kp 8; underprediction x1.1-6; >90% overpredicted | Mooney 2021 (15) | verified |
| Best probability threshold for "aurora present" | 5-15% | Mooney 2021 (15) | verified |
| Poleward-edge reliability | degraded for Kp >= 3; observed edge equatorward of forecast; Kp 5-8 nightside poleward boundary 70-75° | Mooney 2024 (16) | verified |
| Substorm poleward-boundary shift | up to 3° in onset sectors (17-30% of oval width) | Mooney 2021 (15) | verified |
| NOAA forecast lead / cadence | 30-90 min; 5-min hemispheric power file | SWPC page (6), file (7) | verified |
| NOAA probability mapping | "linear relationship to the intensity", SWPC-tuned; formula 10 + 8·flux | SWPC page (6); Mooney 2021 (15) | linear: verified; 10+8·flux: UNVERIFIED |
| Open-code probability mapping | P = 5·sqrt(10·flux) %, zero below 4 %, cap 100 | auroramaps util.py (14) | verified (code only, not NOAA operational) |
| Aurora visible from | up to ~1000 km | SWPC (6), (8) | verified |
| Particle power vs AE | U_A = 0.6e8 W/nT (0.06 GW per nT); U_J = 2.3e8 W/nT | Ahn 1983 (20) | verified |
| Nightside auroral power vs SME | r = 0.86 (SME), 0.81 (AE); per-sector AP = b0 + b1·BE + b2·SME GW (Table 1) | Newell & Gjerloev 2011 (18), 2014 (19) | verified |
| OP hemispheric power, quiet / active | ~10.8 GW (dΦ/dt 0.25 <dΦ/dt>) / ~35.7 GW (1.5 <dΦ/dt>) ; all conditions ~20.8 GW | Sotirelis 2010 (5) | verified (sums inferred from listed components) |
| POES activity levels | 10 levels ~ Kp 0+ to 5+; patterns validated to 100 GW | dmsp.bc.edu (21) | verified; GW-per-level table UNVERIFIED |
| NOAA GW visibility scale ("faint/bright") | none published | SWPC pages (6,8,9,10) | UNVERIFIED (not found) |
| Equatorward edge vs Kp (rule) | ~66° at Kp 0, ~2° per Kp step | SWPC tips (8) | verified |
| Equatorward electron boundary regressions | 0400-0500 MLT: 65.9 - 1.68 Kp; 1900-2000: 71.4 - 2.01 Kp; 2000-2100: 68.8 - 1.17 Kp | Gussenhoven 1987 (26) | verified (authors: preliminary); 1983 midnight coefficients UNVERIFIED |
| UV peak shift vs Kp | ~1° per Kp, fits good for Kp < 6 | Carbary 2005 (31) | verified |
| Feldstein oval nightside peak | 67° / 63° / 61° MLAT at Kp 1.0 / 3.7 / 5.0 | Aurora Hunter (44) | verified (as quoted by that paper) |
| Midnight equatorward boundary vs Dst | 55-65° for Dst > -50 nT; < 50° for Dst < -100 nT (Mar 1989); 65° non-storm mean; minimum ~1 h before Dst minimum; ~2.3° per -100 nT (polar cap boundary, Schulz) | Yokoyama 1998 (28) | verified |
| Oval radius vs Sym-H | ~18° (Sym-H 0) to ~30° (Sym-H -200 nT); mode 19°; OCB ~5° poleward of best-fit ring | Milan 2009a (29) | verified |
| Poleward edge reaches ~65° (equatorward of Tromsø) | at Sym-H ~ -200 nT | derived from Milan 2009a | inferred |
| Substorm onset latitudes | 55-74° MLAT; categories >68, 66-68, 64-66, 62-64, <62° | Milan 2009b (30) | verified |
| AuroraWatch UK thresholds | yellow 50, amber 100, red 200 nT (H/E, max of QDC deviation or hourly range, 3-min update) | Case 2017 (33) | verified |
| AuroraWatch UK frequency | yellow 4.7% (412 h/yr), amber 1.0% (88 h/yr), red 0.3% (23 h/yr) | Case 2017 (33) | verified |
| AuroraWatch UK sighting-based skill | none published | Case 2017 (33) | UNVERIFIED (absent) |
| FMI thresholds (dX/dt, 10-min) | 0.30 nT/s Nurmijärvi ... 0.50 Sodankylä, 0.52 Muonio, 0.57 Kevo/Kilpisjärvi (= 5-5.7 nT per 10 s) | FMI (36) | verified (legacy page); current R-index two-threshold values not published |
| Aurora nights, clear dark sky | 75% Kilpisjärvi; ~25% central Finland; ~monthly Helsinki | FMI (36) | verified |
| Tromsø clear-sky aurora occurrence | ~0.755 above Kp 2 (saturates above Kp ~2); >70% in early declining phase | Aurora Hunter (44); Nanjo 2022 (45) | verified |
| Kp-driven occurrence skill at Tromsø | ROC-AUC 0.849 (0.958 with cloud/moon stage) | Aurora Hunter (44) | verified |
| Space Weather Canada auroral-zone hourly range | quiet <= 93, unsettled 94-168, active 169-299, stormy 300-874, major >= 875 nT | NRCan (37) | verified |
| IRF Aurora Alert | camera-based, ~300 km radius, 1-min images; Level 6 = arc breaking, <10 min latency, ~90% detection | IRF (39), Yamauchi 2023 (40) | verified |
| SWPC 2015 view line vs citizen reports | accuracy ~50.3%; ~50% of reports equatorward; flux-based boundary 91% | Kosar 2018 (35); Case 2016 (34) | verified |
| Lower-border altitude | most frequent ~105 km (100-110 km); peak emission median 114-115 km | Nature 1934 (46); HGSS 2024 (47); Ann. Geophys. 2023 (48) | verified |
| Distance for 5° elevation | 694 km (h = 100 km), 743 km (h = 110 km) = 6.2-6.7° latitude | computed | derived |
| Geometric horizon distance | 1121-1175 km (h = 100-110 km), ~1200-1260 km with refraction | computed | derived |
| "Near zenith" (> 45°) | arc within ~100 km (~0.9-1.0° latitude); > 60° within ~60 km | computed | derived |
| Arc 2-3° latitude away | lower border at 15-25°, ray tops (250 km) at 35-45° | computed | derived |

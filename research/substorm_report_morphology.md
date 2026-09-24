<!-- Research report produced by a background research agent on 2026-09-24; every item marked verified was fetched that day. Consolidated in substorms_auroral_zone.md. -->
# Substorm morphology statistics for the SUBSTORM dashboard section — verified numbers with provenance

Compiled 2026-09-24 by the research agent. Target observers: Tromsø (69.6°N geographic / 67.3° AACGM MLAT) and Finnish/Swedish Lapland (66–69°N geographic / 63.5–66.5° MLAT).

**How this was verified.** Every number below is tied to a URL that was actually fetched in this session, with the exact figure or a short quote. Access notes: Wiley (AGU journals), NASA ADS and Springer pages refused scripted access (HTTP 403 / bot challenge), so for Wiley-only papers the *abstracts* were retrieved through the OpenAlex API (`https://api.openalex.org/works/doi:<DOI>`), which returns the publisher abstract text; those are marked "abstract (OpenAlex)". Open-access PDFs (Copernicus/Ann. Geophys., arXiv, Aalto repository, KTH, JHU/APL, U. Calgary, ICS-8) were downloaded and text-extracted, and the figure pages of Frey et al. (2004) and Milan et al. (2009) were rendered and read. Items that rest only on a search-engine excerpt of a page I could not fetch are marked **SNIPPET-ONLY**; items I could not confirm at all are marked **UNVERIFIED** with what I tried.

**Confidence flags used in the final table:** `verified` = number read in a fetched primary source (full text or publisher abstract); `inferred` = arithmetic/derivation from verified numbers (formula given); `snippet` = only seen in a search-engine excerpt of a page that could not be fetched; `unverified` = not found.

---

## 1. Substorm onset LOCATION statistics

### Source block 1.1 — Frey, Mende, Angelopoulos & Donovan (2004), JGR 109, A10304, doi:10.1029/2004JA010607
- Fetched: full text PDF, https://aurora.phys.ucalgary.ca/donovan/pdfs/frey_harald_jgr_2004.pdf (text extracted; page 3 rendered to read Fig. 2). Abstract also confirmed via OpenAlex.
- Verified statements (quotes):
  - "Over the first 2.5 years of operation, the FUV instrument on the IMAGE spacecraft observed more than 2400 substorm onsets in the Northern Hemisphere. The observations confirm earlier results of statistical studies in terms of a median substorm onset location at 2300 hours MLT and 66.4 degrees magnetic latitude."
  - Period: "19 May 2000 (start of regular IMAGE-FUV operations) to 31 December 2002".
  - Selection criteria: "(1) a clear local brightening of the aurora has to occur, (2) the aurora has to expand to the poleward boundary of the auroral oval and spread azimuthally in local time for at least 20 min, (3) a substorm onset was only accepted as a separate event if at least 30 min had passed after the previous onset."
  - Table 1 (median, mean in parentheses): DE-1, 68 onsets, 2250 (22.8) MLT, 65° MLAT [Craven & Frank 1991]; Viking, 133, 2305 (22.8), 66.7° (65.8°) [Henderson & Murphree 1995]; Polar, 648, 2230 (22.7), 67° (66.6°) [Liou et al. 2001]; IMAGE winter, 78, 2324, 65.6° [Gérard et al. 2004]; **IMAGE, 2437, 2300 (23.0), 66.4° (66.1°)** [this paper].
  - "Substorm onsets are evenly distributed in magnetic longitude".
  - "The geomagnetic latitude lines in Figure 3 at 60° and 70° bracket the latitude where more than 91% of the substorms occurred".
  - "Out of the total of 2437 substorms in the FUV data, 1022 occurred in the area that will be covered by the THEMIS-GBO (190–305° geographic longitude). Of those substorms only 2% would not fall into the field of view of the planned all-sky cameras because they started at a distance larger than 600 km to the closest all-sky camera." (i.e. 98% within 600 km of a planned station).
  - Fig. 2 caption: "The last panel also shows the range in local time with more than 80% of observed substorms (10% on each side)." **Read from the rendered figure (inferred, ±0.2 h):** the two dotted lines sit at ≈21.1 h and ≈24.7 h MLT, i.e. the central 80% of onsets fall roughly between 21:05 and 00:40 MLT (about −1.9 h / +1.7 h around the 23.0 median). The MLAT histogram spans ≈55–74° with the median line at 66.4°.

### Source block 1.2 — Frey & Mende (2006/2007), Proc. ICS-8, pp. 71–75, "Substorm onsets as observed by IMAGE-FUV"
- Fetched: full text PDF, https://ics8.ca/proc_files/frey.pdf (text extracted; page 3 rendered).
- Verified statements:
  - "The FUV instrument observed more than 4000 substorm onsets during the 5.5 years of the IMAGE mission. About 2/3 were observed during the first 3 years in the northern hemisphere, while 1/3 were observed towards the end of the mission in the southern hemisphere."
  - "…an average MLT of 2250±0127 hours (previously 2300±0121) and latitude of 66.4° ± 2.96° (previously 66.4° ± 2.86°)". → **σ(MLT) ≈ 1.35 h (2000–02) / 1.45 h (2003–05); σ(MLAT) ≈ 2.86° / 2.96°.**
  - Table 1 additions (median, mean): IMAGE'03 all, 1755 onsets, 2250 (22.8), 66.4° (66.1°); **IMAGE north, 2760, 2300 (23.0), 66.3° (66.0°); IMAGE south, 1432, 2245 (22.8), −66.5° (−66.3°).**
  - "when averaged over all seasons and several years, the average substorm onset locations are the same in both hemispheres with respect to magnetic latitude and local time."
  - Quoting Wang et al. (2005) results: "In sunlight, substorm onsets occur 1 hour earlier in local time and 1.5 more poleward than in darkness. … Most poleward latitudes of the onsets were found during very quiet times."
  - Quoting Liou et al. (2001): "In summer, substorms tend to occur in the early evening, whereas in winter they tend to occur near midnight with an average difference of ≈1 hour of MLT."

### Source block 1.3 — Liou (2010), JGR 115, A12330, "Polar Ultraviolet Imager observation of auroral breakup", doi:10.1029/2010JA015578
- Fetched: publisher abstract via OpenAlex API (Wiley full text returned 403).
- Verified (abstract): "A total of 2003 auroral substorm onsets are identified in the Northern Hemisphere between 1996 and 2000 and 536 onsets in Southern Hemisphere in 2007. Distributions of the onset locations are near Gaussian, with a population mean of **65.9° (standard deviation σ = 2.2°)** in magnetic latitude (MLat) and **22.6 (σ = 1.1)** in magnetic local time (MLT) for the northern hemispheric events and **68.0° (σ = 2.3°)** in MLat and 22.6 (σ = 1.1) in MLT for the southern hemispheric events. A comparison with previously published IMAGE onset results suggests that substorms occur more frequently and intensely in the descending than in the ascending phase of solar cycle."
- **SNIPPET-ONLY** (search-engine excerpts of the Wiley full text, https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2010JA015578, seen twice consistently but the page itself could not be fetched): "the location of auroral breakup moves approximately 0.6°–0.7° equatorward in magnetic latitude for every 1 nT decrease in hourly averages of the IMF Bz component"; "differences in the mean southern and northern onset latitude (2.1°) are statistically significant"; mean 60-min IMF Bz before onset "−1.3 (sN = 2.5) nT for the northern hemispheric events".

### Source block 1.4 — Liou, Newell, Sibeck, Meng, Brittnacher & Parks (2001), JGR 106, 5799, doi:10.1029/2000JA003001
- Fetched: abstract via OpenAlex.
- Verified: "648 well-defined Northern Hemisphere auroral breakups… The most likely onset location is at 2230 MLT and 67° Λm with half-maximum widths of 3 hours of MLT and 2° Λm, respectively. The onset latitude depends primarily on IMF Bz, but also Bx: the onset latitude decreases for Bx > 0 or Bz < 0 and increases for Bx < 0 or Bz > 0. … In summer, substorms tend to occur in the early evening at ∼2200 MLT, whereas in winter they tend to occur near midnight at ∼2300 MLT. The average summer-winter difference in the onset location is ∼1 hour of MLT. … The average onset local time is earliest (2200 MLT) for By > 0 in summer and latest (2330 MLT) for By < 0 in winter."

### Source block 1.5 — Gérard, Hubert, Grard, Meurant & Mende (2004), JGR 109, A03208, doi:10.1029/2003JA010129
- Fetched: abstract via OpenAlex (OA copy listed at https://orbi.uliege.be/handle/2268/31678, not fetched).
- Verified: "78 substorms observed close to the 2000–2001 winter solstice. The latitudinal distribution of the onsets observed with WIC is asymmetric with a median at 65.6° MLAT and a full width at half maximum (FWHM) of 3.5°. Their local time distribution is concentrated between 2000 and 0200 MLT with a median at 23.4 ± 0.3 hours MLT and a FWHM of 1.8 hours. … a clear anticorrelation is found between the onset MLAT and the 1-hour averaged solar wind dynamic pressure. A decrease of the onset latitude is also observed for larger B intensity values. No dependence of the onset MLT on the solar wind speed is observed".

### Source block 1.6 — Wang, Lühr, Ma & Frey (2007), Ann. Geophys. 25, 989–999, doi:10.5194/angeo-25-989-2007
- Fetched: full text PDF https://angeo.copernicus.org/articles/25/989/2007/angeo-25-989-2007.pdf and HTML abstract page.
- Verified: "Based on 2760 well-defined substorm onsets in the Northern Hemisphere and 1432 in the Southern Hemisphere … Southward pointing interplanetary magnetic field (IMF) is favorable for substorm to occur, but still 30% of the events are preceded by northward IMF. The magnetic latitude (MLat) of substorm onset depends mainly on the merging electric field (Em) with a relationship of |dMLat| = −5.2 Em^0.5, where dMLat is the deviation from onset MLat. In addition, seasonal effects on onset MLat are also detected, with about 2 degrees higher latitudes during solstices than equinoxes. … An average relation, dMLT = 0.25 By between IMF By and the deviation from onset MLT, was found. … a linear relationships remains between the solar zenith angle and onset MLT with dMLT = 1 min/deg. … No indications for systematic latitudinal displacements between the hemispheres have been found." Occurrence: "The occurrence number varies around 250 for each month in the Northern Hemisphere and around 150 in the south." Superposed epoch: "The averaged IMF Bz attains a minimum about 20 min before the onset. At the time of onset an IMF northward turning is observed." (Em defined as v_sw (By²+Bz²)^0.5 sin²(θ/2).)

### Source block 1.7 — Gjerloev, Hoffman, Sigwarth & Frank (2007), JGR 112, A07213, doi:10.1029/2006JA012189
- Fetched: abstract via OpenAlex.
- Verified: "116 substorms … The average onset location was 22.6 magnetic local time (MLT) and 66.8° invariant latitude (ILat)". (Rest of abstract used in Sect. 3.)

### Source block 1.8 — Milan et al. (2009), Ann. Geophys. 27, 659–668, doi:10.5194/angeo-27-659-2009 (Frey list re-binned by onset latitude)
- Fetched: full text PDF https://angeo.copernicus.org/articles/27/659/2009/angeo-27-659-2009.pdf (page 4 rendered to read Fig. 2).
- Verified: "identifying 1993 substorms during our period of interest [May 2000–April 2002] … Onsets were observed at magnetic latitudes between 55° and 74°". Categories and counts read from Fig. 2a: **(I) Λ>68°: 501; (II) 66–68°: 620; (III) 64–66°: 459; (IV) 62–64°: 226; (V) <62°: 187** (sum 1993). "Most onsets were observed between 21:00 and 01:00 MLT … We examined the MLT distribution of onsets within each of our five latitudinal bins and found that none had a significant deviation from the overall MLT distribution."

### Source block 1.9 — Grocott et al. (2009), Ann. Geophys. 27, 591, "Superposed epoch analysis of the ionospheric convection evolution during substorms: onset latitude dependence"
- Fetched: full text PDF https://angeo.copernicus.org/articles/27/591/2009/angeo-27-591-2009.pdf.
- Verified: "Frey et al. (2004) identified 2437 substorms occurring between May 2000 and December 2002, subsequently extending this number to **4193** after considering the 5-year period up to December 2005. Wild and Grocott (2008) refined this list to **3005 isolated events** (by excluding those known to have occurred within ±2 h of another substorm), **1979** of which were observed in the Northern Hemisphere. The onset locations of these 1979 events … have a mean magnetic latitude of 66° and a mean magnetic local time (MLT) of 23 h."

### Derived onset-location coverage fractions (inferred; Gaussian with the verified σ)
Computed with P(|x−μ|<w) = erf(w/(σ√2)):
| σ source | ±1 h MLT | ±1.5 h MLT | ±2 h MLT |
|---|---|---|---|
| Liou 2010, σ_MLT = 1.1 h | 63.7 % | 82.7 % | 93.1 % |
| Frey & Mende 2000–02, σ_MLT = 1.35 h | 54.1 % | 73.3 % | 86.2 % |
| Frey & Mende 2003–05, σ_MLT = 1.45 h | 51.0 % | 69.9 % | 83.2 % |

| σ source | ±1° | ±2° | ±3° | ±4° MLAT |
|---|---|---|---|---|
| Liou 2010, σ_MLAT = 2.2° | 35.1 % | 63.7 % | 82.7 % | 93.1 % |
| Frey & Mende, σ_MLAT = 2.86° | 27.3 % | 51.6 % | 70.6 % | 83.8 % |
| Frey & Mende, σ_MLAT = 2.96° | 26.5 % | 50.1 % | 68.9 % | 82.3 % |

Cross-check against the direct figure reading: Frey 2004 Fig. 2 gives the central 80 % of onsets within ≈21:05–00:40 MLT (≈ ±1.8 h), consistent with σ ≈ 1.35–1.45 h (±1.8 h → 80–82 %). Frey 2004 text: >91 % of onsets between 60° and 70° MLAT (a ±5° window around 65°), consistent with σ ≈ 2.9° (±5° → 91 %). Note that the Gérard (2004) winter-only FWHMs (3.5° → σ≈1.5°; 1.8 h → σ≈0.76 h) and Liou (2001) half-maximum widths (2°, 3 h) describe the *peak* of a skewed distribution and are narrower than the full-population σ; use the Frey & Mende / Liou 2010 σ for the model.

**Location of the Lapland observers relative to the onset distribution (inferred):** Tromsø at 67.3° MLAT sits +0.9° from the IMAGE median (66.4°) and +1.4° from the Polar-UVI mean (65.9°): roughly the 62nd–74th percentile of onset latitudes (i.e. 25–40 % of onsets start poleward of Tromsø, 60–75 % equatorward). Lapland stations at 63.5–66.5° MLAT sit between −2.9° and +0.1° of the median: the 16th–52nd percentile.

---

## 2. Onset LATITUDE dependence on activity / driving

### Source block 2.1 — Wang, Lühr, Ma & Ritter (2005), Ann. Geophys. 23, 2069–2079, "Statistical study of the substorm onset: its dependence on solar wind parameters and solar illumination"
- Fetched: full text PDF https://angeo.copernicus.org/articles/23/2069/2005/angeo-23-2069-2005.pdf (1829 NH onsets from the Frey list, 2002–2003).
- Verified quotes:
  - "In sunlight, substorm onsets tend to occur 1 h earlier in local time and 1.5° more poleward than in darkness. The solar wind input, represented by the merging electric field, integrated over 1 h prior to the substorm, correlates well with the latitude of the breakup. Most poleward latitudes of the onsets are found to range around 73° magnetic latitude during very quiet times."
  - "In darkness substorm onsets tend to occur at ∼23:00 MLT, with a half-maximum width of 0.8 h in MLT, while in sunlight they tend to occur about an hour earlier, at ∼22:00 MLT, with a half-maximum width of 1.8 h in MLT."
  - Regression (Em in mV/m, 1-h average before onset, restricted to Em ≤ 6 mV/m; fit of the form cos²(β+δ) with δ = 17°; correlation coefficients 0.5535/0.5708/0.5864 for the weightings tried; "In sunlight, R = 0.73", "In darkness, R = 0.57"): **"In sunlight we obtain β = 73° − 2.6√Em and in darkness β = 73° − 5.2√Em, where Em is measured in mV/m."** (β = onset MLAT.)
  - "the correlation has been limited to Em ≤ 6 mV/m in our study. With this selection we avoid non-linear responses and saturation of the system at extreme activity".
- Inferred lookup (darkness formula): Em = 0.5 → 69.3°; 1 → 67.8°; 2 → 65.6°; 3 → 64.0°; 4 → 62.6°; 6 → 60.3° MLAT. (Sunlight: 71.2°, 70.4°, 69.3°, 68.5°, 67.8°, 66.6°.) For Tromsø (67.3°) the darkness curve crosses the station at Em ≈ 1.2 mV/m; for 65° MLAT at Em ≈ 2.4 mV/m; for 63.5° at Em ≈ 3.3 mV/m. Wang et al. (2007) confirm the same slope with the full N+S set: |dMLat| = −5.2 Em^0.5 (Source block 1.6).

### Source block 2.2 — Liou (2010) IMF-Bz slope — **SNIPPET-ONLY** (see 1.3): ≈0.6–0.7° equatorward per 1 nT of (hourly) IMF Bz decrease. Tried: Wiley full text (403), ADS (405/bot page), Semantic Scholar (no abstract), OpenAlex abstract (does not contain the slope).

### Source block 2.3 — Gérard et al. (2004) (see 1.5): onset MLAT anticorrelated with 1-h averaged solar wind dynamic pressure; lower onset latitude for larger |B|. No coefficient in the abstract; full text not fetched (Wiley 403; ORBi copy not fetched).

### Source block 2.4 — Liou et al. (2001) (see 1.4): onset latitude decreases for Bz < 0 (and Bx > 0), increases for Bz > 0. No slope in the abstract.

### Source block 2.5 — Milan et al. (2009) (see 1.8): intensity vs onset latitude / open flux
- Verified quotes (41-substorm study binned by polar-cap open flux F_PC at onset; categories i <0.45, ii 0.45–0.55, iii 0.55–0.65, iv >0.65 GWb with 9, 13, 9, 10 events):
  - "Substorms in category i close approximately 0.1 GWb of flux, whereas in category iv this rises to 0.3 to 0.4 GWb. … In each category the growth phase lasts approximately one hour. On the other hand, the duration of the decrease in flux after onset increases from 30 min in the case of category i to 80 min in the case of category iv. In category i, the minimum in median AL reaches approximately **−200 nT**, increasing to **−600 nT** in category iv."
  - "The dayside reconnection voltage prior to onset increases from category i to category iv, from an average of 20 kV to an average of 100 kV".
  - 1993-substorm IMAGE study by onset latitude: "The brightness of the auroral oval, both prior to onset and during the expansion phase, increases as the latitude of onset decreases." "In the case of SI12, the midnight meridian post-onset brightness increases by almost a factor of 3 from category I to category V; for WIC this is closer to a factor of 5." "IMF BZ becomes more negative prior to low latitude substorms, while VSW, NSW, and PSW all increase. The AL signature becomes more pronounced for the low latitude onsets. Finally, SYM-H tends to be more negative, indicating an enhanced ring current, during the low latitude onsets."
  - Growth-phase motion: "There is a marked decrease in the oval latitude along all meridians during the growth phase, though this is most pronounced for low latitude onsets."

### Source block 2.6 — Tanskanen, Pulkkinen, Koskinen & Slavin (2002), JGR 107(A6), 1086, doi:10.1029/2001JA900153
- Fetched: abstract via OpenAlex (full text: Wiley 403; no repository copy found).
- Verified: "In total, 839 substorms from the midnight sector have been investigated … during the active year 1999, there were 26% more substorm events, they were 15% more intense, and **they were located at lower latitudes than during 1997**. … Mean intensity of isolated substorms was about **−350 nT**, whereas it was about **−670 nT** for stormtime events."

### Source block 2.7 — Li, Wang & Peng (2013), JGR 118, doi:10.1002/jgra.50399, "Solar wind impacts on growth phase duration and substorm intensity: A statistical approach"
- Fetched: abstract via OpenAlex.
- Verified: "379 interplanetary magnetic field (IMF) southward turning events … 1995 to 2011 … Substorm growth phase persists from several minutes up to 2–3 h … The lower limits of solar wind reconnection E-field and bulk speed for substorm occurrence are found to be 0.6 mV/m and 280 km/s … the substorm intensity is linearly correlated to the dayside reconnection E-field … the geometric means of growth phase duration and auroral power maximum for these three groups are 91 min, 62 min, 32 min, and 35 GW, 51 GW, 74 GW, respectively" (groups of increasing reconnection E-field).

### Source block 2.8 — Kullen & Karlsson (2004), JGR 109, A12218, doi:10.1029/2004JA010488
- Fetched: author PDF https://people.kth.se/~kullen/jgr04.pdf and abstract via OpenAlex.
- Verified: "330 pseudobreakups and 419 substorms have been identified … 77 small-oval, 149 medium-oval, 38 large-oval, 37 expanding-oval and 118 shrinking-oval substorms" (Polar UVI, 3 winter months 1998–99). "The majority of large substorms appear when the IMF is strongly southward and the solar wind energy flux is high. Most small substorms occur during weakly positive or zero IMF Bz and low solar wind energy flux values." "The average lifetime of small-oval and medium-oval substorms is about 1.3 hours. Large-oval substorms last for about 2.3 hours. Nearly all large-oval substorms have a lifetime of 1.5 hours or more, some last up to 4-5 hours." "onset is preceded by a 30-60 minutes long growth phase". "Pseudobreakups are short-lived (5-16 min)". "They [substorms] are present during 50 % of the statistical time period".

### Onset MLAT vs Kp / Dst — **UNVERIFIED**
- Searched (three phrasings) for a published regression of onset MLAT on Kp, Dst or SYM-H; none found. The only Kp-linked statement surfaced was NOAA's rule for the *oval* ("moves equatorward about 2 degrees for each level of Kp"), which is not an onset statistic and is not from a peer-reviewed source; do not use it as an onset regression. Milan et al. (2009) show qualitatively that SYM-H is more negative before low-latitude onsets (Fig. 6, no numbers in text). Recommendation: drive onset latitude from the solar-wind merging electric field with the Wang et al. (2005) darkness regression (verified) and use Milan's AL-vs-category numbers for intensity.
- Storm-time onset MLAT: no direct number found beyond Tanskanen 2002 ("located at lower latitudes") and the Wang (2005) formula evaluated at high Em (Em = 4–6 mV/m → 60–63° MLAT). Milan et al. (2009) category V (<62°) holds 187/1993 = 9.4 % of onsets; categories IV+V (<64°) 20.7 %.

---

## 3. Substorm BULGE geometry and expansion speeds

### Source block 3.1 — Gjerloev, Hoffman, Sigwarth & Frank (2007), JGR 112, A07213, doi:10.1029/2006JA012189 (116 substorms, Polar VIS Earth Camera)
- Fetched: abstract via OpenAlex (full text Wiley 403; ResearchGate 403).
- Verified: "The expansion period identified solely from images varied primarily from **10 to 40 minutes, with an average of 30.9 minutes**. … The average onset location was 22.6 magnetic local time (MLT) and 66.8° invariant latitude (ILat) … the bulge aurora rapidly expanded out of the onset location **approximately equally to the west (surge) and to the east**, so that the average center of the bulge remained close to the onset MLT. This is also the case for average location of the maximum expansion in latitude of the bulge. Thus the bulge is offset about 1 1/2 hours west of midnight. By half the expansion period the bulge has usually expanded poleward sufficiently to reveal a brightened portion of the original auroral oval. This brightening expands **less than 1 hour MLT to the west, but rapidly to the east**, farther than the east end of the bulge. … The bulge expansion is fastest initially but slows for the second half of the expansion period. The ends of the bulge continue a small expansion poleward during early recovery when the center of the bulge slowly retreats."
- Not in the abstract (would need full text): the numeric ΔMLT / ΔILat of the bulge ends at maximum expansion. **UNVERIFIED** as a number; the search-engine excerpt "root mean square boundary normal velocity of 149 m/s for the poleward boundary" is **SNIPPET-ONLY**.

### Source block 3.2 — Gjerloev, Hoffman, Sigwarth, Frank & Baker (2008), JGR 113, A07S12, doi:10.1029/2007JA012431 "Typical auroral substorm: A bifurcated oval"
- Fetched: abstract via OpenAlex. Verified: same 116 events; "After the substorm onset the auroral oval becomes clearly bifurcated consisting of two components: the oval aurora in the latitude range of the preonset oval and expanding primarily eastward postmidnight, and the bulge aurora, which emerges out of the oval, expanding poleward and both east and west in MLT. The oval aurora decay faster than the bulge emissions".

### Source block 3.3 — Mende, Frey, Morsony & Immel (2003), JGR 108(A9), 1339, doi:10.1029/2002JA009751 (91 IMAGE substorms, superposed epoch)
- Fetched: abstract via OpenAlex.
- Verified: "At onset the proton auroral peak intensity increased only by a factor of 2 compared with ∼5 for the electrons. … **The mean poleward expansion of the electron aurora reached about 3.5° in 5 min and reached a total expansion of 5.5° in an hour.** The protons expanded about 2.5° in 5 min and expanded about 3° one hour after onset. The latitude width of the aurora increased at onset due to both a large poleward and a moderate equatorward expansion. There appeared to be stronger substorm-related activity in the local time range toward dawn than toward dusk." (Fits done at relative MLT −4, −2, 0, +2, +4 h.)

### Source block 3.4 — Milan, Grocott & Hubert (2010), JGR 115, A00I04, doi:10.1029/2010JA015663 (≈2000 IMAGE substorms)
- Fetched: abstract via OpenAlex.
- Verified: "during the growth phase there is preexisting auroral emission in the MLT sector of the subsequent onset. After onset the auroral bulge expands eastward and westward, but remains centered on the onset sector. **Approximately 30 min after onset, during the substorm recovery phase**, the peaks in electron and proton auroral emission move into the postnoon and prenoon sectors, respectively".

### Source block 3.5 — Milan et al. (2009) (see 1.8), 1993-substorm keograms
- Verified: "The midnight sector oval progresses poleward promptly following onset; the rate and duration of the poleward progression increases for decreasing onset latitude. The other meridians can display continued equatorward motion for between 20 min and 1 h after onset." Epoch images: "There is a marked increase in auroral brightness and the formation of an auroral bulge by t=15 min. By t=115 min the auroral oval has returned to a configuration similar to that at t=−55 min, though there is still some residual excess brightness in the post-midnight sector". Flux-closure duration 30 min (small) to 80 min (large) after onset (41-event study, quoted in 2.5).

### Source block 3.6 — Laundal & Østgaard (2010), JGR 115, doi:10.1029/2010JA015910 (2770 IMAGE substorms)
- Fetched: abstract via OpenAlex. Verified: "We use images from 2770 substorms to study the evolution of the polar cap boundary location statistically. We show that, during the first 26 min after substorm expansion phase onset, the polar cap boundary location depends on seasons, interplanetary magnetic field (IMF) By, and IMF Bx. … Substorms in the dark hemisphere also have a much more pronounced bulge than substorms in the sunlit hemisphere."

### Source block 3.7 — Craven & Frank (1987), JGR 92(A5), 4565, doi:10.1029/JA092iA05p04565 (DE-1)
- Fetched: abstract via OpenAlex and OSTI record https://www.osti.gov/biblio/6174608.
- Verified: "Average speeds of poleward motion are **∼230 m/s** near local midnight for two isolated, small substorms and **∼1000 m/s** during an intensification within a previously active auroral oval. The speed of poleward expansion measured at ∼6-min temporal resolution can differ greatly from the average speed because of the episodic development of substorms. … Recovery of the high-latitude boundary of the aurora to presubstorm latitudes is first observed in the postmidnight sector. In the premidnight sector the discrete aurora can become stationary for a period of time or even continue further poleward before a retreat to lower latitudes begins. For these substorms the expansion and recovery phases are not separated by a ∼5° 'poleward leap' of the aurora."

### Source block 3.8 — Craven, Frank & Akasofu (1989), JGR 94(A6), 6961, doi:10.1029/JA094iA06p06961 (westward travelling surge, DE-1)
- Fetched: abstract via OSTI https://www.osti.gov/biblio/6048596, NTRS https://ntrs.nasa.gov/citations/19890056323 and OpenAlex.
- Verified: "large-scale motion of a surge over 7000 km along the auroral oval from near local midnight. **Average speed of the surge is 2.2 km/s.** … the surge advances initially at a speed of about **8 km/s followed by a steady decline to about 1 km/s over a period of 17 min**. This sequence is then repeated a second time … persistent and localized bright emission regions remain along the auroral oval for several tens of minutes. Average separation distances are approximately 700 km. … the average time per advance is about 5 min."

### Source block 3.9 — Ogasawara et al. (2011), JGR 116, doi:10.1029/2010JA016032 (THEMIS ASI, 16 events)
- Fetched: abstract via OpenAlex.
- Verified: "In a statistical analysis, the averaged speeds of the leading edge of the **westward and eastward auroral expansion were 8.8 and 5.3 km/s**, respectively. When mapped onto the equatorial magnetosphere, these speeds (267 and 162 km/s) were comparable to the averaged azimuthal plasma (E × B) flow speeds … Our events showed that E × B flows and auroral expansion predominantly propagated westward".

### Source block 3.10 — Carbary, Liou, Lui, Newell & Meng (2000), JGR 105, 16083–16096, "'Blob' analysis of auroral substorm dynamics" (Polar UVI, January 1997)
- Fetched: author PDF http://sd-www.jhuapl.edu/Aurora/resumes/FUV_papers/blob_analysis.pdf.
- Verified: "Over 120 individual auroral features were successfully acquired at onset and tracked until dissipation during January 1997. … transient spikes that lasted 5-10 minutes. … During the course of a substorm, 90% of the blobs moved poleward, while over 60% moved westward. … a sizable minority (~35%) of the blobs moved eastward … Blob speeds varied from essentially zero up to several km/s. However, during the January substorms, the blobs did appear to have a preferred speed of **0.84 ± 0.34 km/s**." Body: "117 moved poleward while only 18 moved equatorward … the mean slope of **0.047 ± 0.063 degrees/minute (0.088 ± 0.12 km/s)**. Thus … a large majority (87%) of the blobs move poleward"; longitudinal "mean slope was -0.012 ± 0.036 degrees/minute (-0.023 ± 0.068 km/s)"; sample blob "speed varies from less than 0.1 km/s to nearly 2.5 km/s, with a mean of 0.8 ± 0.7 km/s".

### Source block 3.11 — Kullen, Ohtani & Karlsson (2009), JGR 114, doi:10.1029/2008JA013712
- Fetched: abstract via OpenAlex (author PDF https://people.kth.se/~kullen/jgr08.pdf also downloaded).
- Verified: "the AE increase appears with a time delay of 5–15 min after onset … A tail dipolarization is seen in GOES data with a time delay of 2–31 min after onset … we find that the tail dipolarization region expands in average with an **azimuthal speed of 0.22 MLT min−1 and an equatorward speed of 0.09° min−1**." (10 growth-phase-pseudobreakup substorms, winter 1998–99; this is the dipolarization region mapped to the ionosphere, a proxy for the current-wedge/bulge azimuthal growth.)

### Source block 3.12 — Akasofu (2021), Front. Astron. Space Sci. 7:604750 (review, open access)
- Fetched: https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2020.604750/full.
- Verified quotes: "For moderate substorms, the speed of the poleward advance of arcs is about **250 m/s**; during a very large substorm, both the speed and the extent of advance can be several times greater." "One can see in this case that both the aurora and the electrojet reached as far as 78° in latitude." "The onset of the UL current begins after a significant delay of about one hour behind the DD current. This delay period is called the growth phase." "such a pattern (the sequence of quiet-active-patches) occurs often twice or thrice in one night." "Substorms occur when the power is typically 3–5 × 10^18 erg/s or 3–5 × 10^11 W, so that the accumulated energy W during the growth phase (about 1 h) becomes about 5 × 10^22 erg".

### Source block 3.13 — Akasofu (2022/23), MNRAS 518(3), 3286, "new understanding of why the aurora has explosive characteristics"
- Fetched: https://academic.oup.com/mnras/article/518/3/3286/6831646.
- Verified quotes: "The growth phase is generally known to last for 45–60 min"; "The rate and duration of both the growth and expansion phases are about the same, 10^11 W and 1 h (respectively) for most medium intensity substorms"; "its average duration is a few hours or more"; "The front of the explosive arcs can reach as far as 78° from 65°"; "The activity (westward traveling surge, WTS) spreads toward the evening sky with a speed of 25 km/s" [sic — this figure is an order of magnitude above every imaging measurement above (Craven 1989: 2.2 km/s; Ogasawara 2011: 8.8 km/s); treat as a typo/outlier and do not use]; "When the accumulated energy reaches to about 10^16 J".

### Akasofu (1964) canonical sequence — original numbers **SNIPPET-ONLY / UNVERIFIED**
- The original paper (Planet. Space Sci. 12, 273–282, doi:10.1016/0032-0633(64)90151-5) is paywalled at ScienceDirect (WebFetch 403); OpenAlex has no abstract; Springer open-access reviews that restate it (Geoscience Letters 2016 doi:10.1186/s40562-016-0044-5; Space Sci. Rev. 2017 doi:10.1007/s11214-017-0363-7; Prog. Earth Planet. Sci. 2015 doi:10.1186/s40645-015-0050-9) all bounce to a bot challenge. Search-engine excerpts of those pages state: "The original auroral substorm model consisted of two phases: the expansive phase (10–30 min) and the recovery phase (~2 h)" and "the expansion phase during which the spectacular auroral activities occur for a brief period of about 1.0–1.5 hours". The best *fetched* restatements are 3.12/3.13 above (growth ≈ 45–60 min; expansion ≈ 1 h for medium substorms; 250 m/s poleward for moderate events; up to 78°) plus the imaging statistics (Gjerloev 2007: expansion 10–40 min, mean 30.9 min; Milan 2010: recovery by ≈30 min).

### Substorm current wedge width — **SNIPPET-ONLY**
- "The most probable width for the current wedge at the end of the substorm expansion phase is about six hours of local time (90°)" appeared in a search excerpt attributed to Kepko et al. (2015), Space Sci. Rev., doi:10.1007/s11214-014-0124-9 ("Substorm Current Wedge Revisited"); the Springer page could not be fetched. Consistent with Kullen 2009's 0.22 MLT/min × 30 min ≈ 6.6 h MLT (inferred).

### Derived azimuthal reach (inferred; 1 h MLT = 690 km at 66° MLAT and 110 km altitude)
- WTS at the Craven (1989) average 2.2 km/s: 1.9 h MLT in 10 min, 5.7 h MLT in 30 min; at the late-stage 1 km/s: 0.9 h MLT per 10 min, 2.6 h MLT per 30 min. Ogasawara (2011) leading edges (8.8 / 5.3 km/s) are short-lived onset-time speeds; applied for 10 min they would give 7.7 / 4.6 h MLT, which exceeds observed bulge widths, so the model should use the decaying-speed picture (Craven 1989: 8 → 1 km/s over ~17 min; Gjerloev 2007: "fastest initially but slows for the second half"). West and east reach are statistically similar (Gjerloev 2007), with the oval-aurora brightening extending further east than west (Gjerloev 2007/2008; Mende 2003 "stronger substorm-related activity … toward dawn").
- Poleward reach: Mende (2003) 3.5° in 5 min then 5.5° total by 60 min (superposed-epoch mean of 91 events); Craven & Frank small isolated substorms 230 m/s ≈ 0.12°/min (≈3.7° in 30 min); intensification 1000 m/s ≈ 0.54°/min; Akasofu moderate 250 m/s ≈ 0.135°/min; Carbary blob preferred speed 0.84 km/s ≈ 0.45°/min (feature speed, not boundary speed). Working default for an average substorm: 4–6° poleward by 30 min, extreme events to ≈78° MLAT.

---

## 4. Substorm PHASE durations, recurrence and waiting times

### Source block 4.1 — Partamies, Juusola, Tanskanen & Kauristie (2013), Ann. Geophys. 31, 349–358, doi:10.5194/angeo-31-349-2013
- Fetched: full text PDF https://angeo.copernicus.org/articles/31/349/2013/angeo-31-349-2013.pdf (+ HTML abstract). Note: phases are defined from the global **AL** index (Juusola et al. 2011 routine), not the IMAGE IL index.
- Verified quotes:
  - Criteria: "Growth phase: from IMF Bz southward turn until the substorm onset; Substorm onset: abrupt decrease of AL, dAL/dt < −4 nT min−1, with a minimum AL value less than −50 nT; Expansion phase: from the substorm onset until the local AL index minimum; Recovery phase: from the AL index minimum until AL has reached −50 nT or a new onset."
  - Sample: "the 15-year period [1995–2009] included **15 568 growth, 54 519 expansion and 53 551 recovery phases**. This sums up to the total durations of 524 days (1.4 years) of growth phase, 896 days (2.5 years) of expansion and 1787 days (5 years) of substorm recovery phase."
  - **"The median durations of the substorm phases were 31 min for the growth, 12 min for the expansion and 31 min for the recovery, but their modes were much shorter: 14 min for the growth, 14 min for the expansion, and 10 min for the recovery."**
  - Table 1 (median index values during all substorm phases; last rows = duration): Growth / Expansion / Recovery / Quiet — AE 70 / 187 / 186 / 61 nT; AU 41 / 69 / 69 / 35 nT; **AL −29 / −111 / −110 / −24 nT**; Dst −8 / −17 / −16 / −8 nT; **median duration 31 / 12 / 31 / 75 min; mean duration 48 / 24 / 48 / 200 min.**
  - "The typical length of the substorm event is about 2–4 h." "durations of 1.3–2.3 h for the combination of expansion and recovery phases were found by Kullen and Karlsson (2004)". "The average duration of substorms observed in 1993–2003 by Tanskanen (2009) is about 3 h, while the full range of the yearly averages varied from 2.8 to 3.3 h. Tanskanen (2009) defined the onsets from the decrease of a local electrojet (IL) index … The decrease was required to be at least 100 nT and the rate of decrease was more than 80 nT in 15 min. The start of the substorm growth was defined as the time when the IL index showed the first signs of a negative bay, but not more than 30 min before the onset time. The substorm was concluded to be over when the IL index had recovered 80 % of its peak deflection."
  - "A typical cadence of 2–3 h has been reported as the substorm recurrence rate (e.g. Borovsky et al., 1993; Pulkkinen et al., 2007)."
  - Multi-cycle events: "For events with a larger number of expansions, a clearer periodicity of about one hour (median value) was suggested." Solar cycle: yearly median expansion duration maximises in 2003 at 16 min; quiet-period median maximises in 2009 at 2.6 h.
  - Example active day (3 Jan 1995): "3 growth phases, 16 expansion and recovery phases as well as 4 quiet time periods".

### Source block 4.2 — Tanskanen (2009), JGR 114, A05204, doi:10.1029/2008JA013682
- Fetched: abstract via OpenAlex (full text Wiley 403; no repository copy found). Method details verified via Partamies 2013 (4.1) and Tanskanen 2011 (4.3).
- Verified (abstract): "from year 1993 to year 2003 … **Almost 6000 substorms** were identified by an automated search engine. … The substorm number and peak amplitude were found to only weakly follow the Sun's activity … The largest substorm numbers and peak amplitudes were found during the declining solar cycle phases when the interplanetary high-speed streams hit the Earth. We found out that the substorms last longer during the least active season (i.e., summer months) and during the least active years (e.g., 1997 and 2001). Furthermore, the substorm number and peak amplitude show much larger values for winter than for summer".
- IL peak-amplitude quartiles: **UNVERIFIED** (not in abstract; full text inaccessible). Use the 1993–2008 means/σ from 4.3 instead.

### Source block 4.3 — Tanskanen, Pulkkinen, Viljanen, Mursula, Partamies & Slavin (2011), JGR 116, A00I34, doi:10.1029/2010JA015788 (same search engine, 1993–2008)
- Fetched: full-text reprint from Aalto repository https://aaltodoc.aalto.fi/server/api/core/bitstreams/92f9a406-2585-4f1f-92d4-caf3e6307ab7/content (+ abstract via OpenAlex).
- Verified quotes (IMAGE IL index, 1600–0300 UT window, "rapid decrease in the IL index exceeding 80 nT in 15 min"; end when IL has recovered to 20% of peak):
  - "In total, 8717 substorms were identified from the IL … The average yearly substorm number is **517 with a standard deviation of 75**." (abstract: "On average, 550 substorms were observed per year, which gives in total about 9000 substorms.")
  - "The mean values for amplitude (**405 nT**) and duration (**2 h and 55 min**) are shown with a horizontal dotted line. The standard deviation of the peak amplitude is 48 nT and 17 min for a duration." (These σ are of the *yearly means*.) "The 2 years with the strongest substorms, on average, were 1994 and 2003, when the yearly averaged peak amplitude was 500 nT and 510 nT … smallest peak amplitudes occurred in 1997 (342 nT) and 2008 (341 nT)."
  - Spread of individual events: "The peak amplitude of the substorms in 1996 varied between **210 nT and 1852 nT**, while their duration varied from 48 min to several hours … average size of the substorms is Ass,1996 = 380 nT."
  - Seasonal: "The monthly substorm occurrence rate is about two times larger in winter than during the summer months." "The substorm duration has its maximum during summer months … winter substorms last on average an hour less." Abstract: "The spring substorms during the declining solar cycle phase (|Ass,decl| = 500 nT) were 25% larger than the spring substorms during the ascending solar cycle years (|Ass,acs| = 400 nT)."
  - Example: single event with "smooth growth from −20 nT down to −100 nT", expansion reaching 652 nT in 17 min, "duration of the entire substorm was about 2 h 5 min".

### Source block 4.4 — Newell & Gjerloev (2011a), JGR 116, A12211, doi:10.1029/2011JA016779
- Fetched: abstract via OpenAlex; onset criterion also verified in Forsyth et al. (2015) full text (4.7).
- Verified: "There are **10,719 onsets in the SML data between 1 January 1997 and 31 December 2002, of which 5084 are isolated**. Isolated SML onsets behave almost identically to the onsets determined by global imagers. … recurrent substorms (those following less than 2 h after a previous onset) rise from a higher baseline by a smaller percentage but with the same absolute change in auroral power, thus reaching a higher peak power." "the median delay after imaging onset until the AL indicator is less than half using SML (about 4 min versus 8 min)." Criterion (Forsyth 2015 text): "Newell and Gjerloev [2011] used a rate of change in SML (−15 nT/min over at least 3 min) to indicate substorm onset." (The additional sustained-drop condition often quoted for this list could not be verified: the SuperMAG substorm page is JavaScript-rendered and returned no text.)

### Source block 4.5 — Newell & Gjerloev (2011b), JGR 116, A12232, doi:10.1029/2011JA016936 "Substorm and magnetosphere characteristic scales"
- Fetched: abstract via OpenAlex.
- Verified: "a database of more than **53,000 substorms** derived from it [SME], covering 1980–2009 … substorms do not have a preferred recurrence rate but instead have two distinct dynamic regimes, each following a power law. The number of substorms recurring after a time Δt, N(Δt), varies as **Δt^−1.19** for short times (< 3 hours) [second exponent lost in the abstract text]. Other evidence also shows these distinct regimes … including a break in the power law spectra for SME at about **3 hours**. The time between two consecutive substorms is only weakly correlated (r = 0.18 for isolated and r = 0.06 for recurrent) with the time until the next, suggesting quasiperiodicity is not common. However, substorms do have a preferred size, with the **typical peak SME magnitude reaching 400–600 nT, but with a mean of 656 nT, corresponding to a bit less than 40 GW AP**. … a peak in the SME distribution around **61 nT, corresponding to about 5 GW** precipitating AP."

### Source block 4.6 — Borovsky, Nemzek & Belian (1993), JGR 98(A3), 3807, doi:10.1029/92JA02556
- Fetched: abstract via OpenAlex.
- Verified: "1001 values of Δt are obtained. … the most-probable time between substorms onsets is **Δt ≈ 2.75 hours** … a random probability for the occurrence of substorms with a **mean time between random substorms of about 5 hours** … About **1500 substorms occur per year**: about half are periodic and about half occur randomly."

### Source block 4.7 — Freeman & Morley (2004), GRL 31, L12807, doi:10.1029/2004GL019989
- Fetched: abstract via OpenAlex; Wiley full-text page returned 403.
- Verified: "one free parameter D – the period between substorms under constant solar wind driving. … For values of **D between 2.6 h and 2.9 h**, the probability distribution of waiting times between successive simulated substorm onsets is not significantly different to an empirical distribution derived from energetic particle observations at geostationary orbit in 1982-3." (The "2.7 h" figure quoted in the literature is the midpoint of this range — inferred.)

### Source block 4.8 — Forsyth et al. (2015), JGR 120, 10,592, doi:10.1002/2015JA021343 (SOPHIE)
- Fetched: full text PDF https://arxiv.org/pdf/1606.02651.
- Verified: "We find that more than 50% of events in previous lists occur within 20 min of our identified onsets." Method: expansion/recovery phases from percentiles of dSML/dt after a 30-min low-pass filter; expansion phases <10 min and possible growth phases <30 min between expansions are removed. Growth-phase literature quoted: "the growth phase, first identified by McPherron [1970] and which, on average, lasts 30–90 min [Li et al., 2013]". "Over ~1 h, the magnetospheric current systems are re-organized" (recovery). Also: "the average occurrence rate of SMCs is approximately 1/10 of that of substorms". Substorm energy: "process ~10^15 J of captured solar wind energy during their lifetime [Tanskanen et al., 2002]".
- SOPHIE phase-duration statistics (medians): **UNVERIFIED** — the paper presents comparisons of onset lists, not a duration table.

### Source block 4.9 — Juusola, Østgaard, Tanskanen, Partamies & Snekvik (2011), JGR 116, A10228, doi:10.1029/2011JA016852
- Fetched: abstract via OpenAlex. Provides the AL-based phase algorithm reused by Partamies 2013 (criteria quoted in 4.1); the abstract itself contains no duration statistics ("The occurrence frequency of high-speed flows peaks at the beginning of substorm recovery").

### Source block 4.10 — Kullen & Karlsson (2004) (see 2.8): substorm lifetime (expansion+recovery, growth excluded) 1.3 h (small/medium oval) and 2.3 h (large oval), "some last up to 4-5 hours"; growth phase "30-60 minutes"; pseudobreakups "5-16 min"; substorms present 50 % of the time in a 3-month winter sample.

### Source block 4.11 — Gjerloev et al. (2007) (see 3.1): image-defined expansion period 10–40 min, mean 30.9 min. Milan et al. (2010) (3.4): recovery under way ≈30 min after onset. Milan et al. (2009) (2.5): flux closure lasts 30 min (small) to 80 min (large substorms); growth phase ≈1 h.

### Source block 4.12 — Newell et al. (2010), JGR 115, A12216, doi:10.1029/2010JA015331 (4861 imager onsets + DMSP)
- Fetched: abstract via OpenAlex.
- Verified: "While diffuse electron and monoenergetic auroral precipitating power rises by 79% and 90%, respectively, following an onset, wave aurora rises by 182%. In the first 10–15 min following onset, the power associated with Alfvénic acceleration is comparable to monoenergetic acceleration … **The rise time of the electron diffuse aurora following onset is much slower, about 50 min, and thus presumably extends into recovery.** Discrete acceleration, which rises over just a few minutes, is already deep into decline, while diffuse auroral power is still rising. … a drop in the mean solar wind driving starting 20 min before substorm onset … probably only a minority of substorms are externally driven."

---

## 5. Substorm INTENSITY vs driving; electrojet index vs auroral power

### Source block 5.1 — Tanskanen et al. (2002) (see 2.6)
- Verified (abstract): 839 midnight-sector substorms (1997 + 1999); "on average the Northern Hemisphere Joule heating accounts for ∼30% of solar wind energy input during 1997 and 1999 substorms"; 1999 had "26% more substorm events, they were 15% more intense"; "Mean intensity of isolated substorms was about −350 nT, whereas it was about −670 nT for stormtime events"; "the amount of Joule dissipation depends on the energy input during the substorm expansion phase … the correlation is best for substorms recorded in the postmidnight sector". Regression coefficients of IL peak on ∫ε dt: **UNVERIFIED** (full text inaccessible).

### Source block 5.2 — Milan et al. (2009) (see 2.5): median AL minimum −200 nT (open flux <0.45 GWb) → −600 nT (>0.65 GWb); dayside reconnection voltage before onset 20–30 kV → 100 kV; WIC midnight post-onset brightness ×5 from the highest- to lowest-latitude onset category; "A dayside reconnection rate of 100 kV should produce 0.36 GWb of open flux in one hour, whereas 30 kV will produce just 0.11 GWb".

### Source block 5.3 — Li et al. (2013) (see 2.7): "the substorm intensity is linearly correlated to the dayside reconnection E-field"; geometric-mean auroral power maxima 35 / 51 / 74 GW for the three reconnection-E-field groups.

### Source block 5.4 — Newell & Gjerloev (2011a) (see 4.4)
- Verified: "The best correlation is between SME and total nightside auroral power, namely, **r = 0.86**. Hence, nearly 3/4 of the minute-by-minute variance in nightside power can be determined by SME alone. … even that index [AE(12)] correlates at the r = 0.81 level, or 2/3 of the variance, in nightside power. Most auroral power stems from the diffuse aurora, with a **linear relationship between the auroral electrojet indices and nightside diffuse power**." (Regression coefficients are in the full text only — UNVERIFIED.)

### Source block 5.5 — Newell & Gjerloev (2011b) (see 4.5): mean substorm peak SME 656 nT ≈ "a bit less than 40 GW" auroral power; quiet-time SME mode 61 nT ≈ 5 GW. **Inferred slope ≈ (40−5)/(656−61) ≈ 0.06 GW per nT of SME** (two-point estimate; use only as a sanity check).

### Source block 5.6 — Ahn, Akasofu & Kamide (1983), JGR 88(A8), 6275, doi:10.1029/JA088iA08p06275
- Fetched: abstract via OpenAlex.
- Verified: "the three global quantities (watt) are related almost linearly to the AE(nT) and AL(nT) indices. Our present estimates give the following relationships: **U_J = 2.3 × 10^8 · AE, U_A = 0.6 × 10^8 · AE and U_I = 2.9 × 10^8 · AE; U_J = 3.0 × 10^8 · AL, U_A = 0.8 × 10^8 · AL, and U_I = 3.8 × 10^8 · AL**" (U_J Joule heating, U_A particle energy injection rate, U_I their sum; W per nT; based on 71 stations, 17–19 March 1978). → particle (auroral) power ≈ 0.06 GW per nT AE, ≈ 0.08 GW per nT |AL|; total ≈ 0.29 GW/nT AE.

### Source block 5.7 — Baumjohann & Kamide (1984), JGR 89(A1), 383, doi:10.1029/JA089iA01p00383
- Fetched: abstract via OpenAlex.
- Verified: "A linear regression analysis of Joule energy deposition rates integrated over the northern hemisphere as a function of the standard auroral electrojet indices yields a correlation coefficient of r = 0.7–0.9. Except for very disturbed times, when the AE(12) index tends to underestimate the electrojet current, the hemispherical Joule heating rate can be calculated by substituting **1 nT in the AE index by approximately 0.3 GW**."

### Source block 5.8 — Østgaard et al. (2002), JGR 107, doi:10.1029/2001JA002002 (7 substorms, PIXIE+UVI)
- Fetched: abstract via OpenAlex. Verified: "Our estimate of U_A is a factor 2–4 larger than that reported in earlier studies. We find that the contributions to the total time-integrated energy dissipation over the duration of the substorm … from W(U_R), W(U_J), and W(U_A) on average are 15%, 56%, and 29%."

### Source block 5.9 — Newell, Liou, Zhang, Sotirelis, Paxton & Mitchell (2014), Space Weather 12, 368, doi:10.1002/2014SW001056 (OVATION Prime-2013)
- Fetched: abstract via OpenAlex.
- Verified: coupling function "dΦMP/dt > 1.2 MWb/s which roughly corresponds to Kp = 5+ or 6−. The range of validity is approximately 0 < dΦMP/dt ≤ 3.0 MWb/s (Kp about 8+) … OP-2013 continues to show the auroral oval advancing equatorward, at least to 55° MLAT or a bit less". No AE–HP formula in the abstract (the model is driven by the coupling function, not AE) — **UNVERIFIED** for an AE→HP relation.

### Source block 5.10 — Newell, Sotirelis & Wing (2009), JGR 114, A09207, doi:10.1029/2009JA014326
- Fetched: abstract via OpenAlex. Verified: "the diffuse aurora is surprisingly dominant, constituting 84% of the energy flux into the ionosphere during conditions of low solar wind driving (63% electrons, 21% ions) … Even under the latter [high-driving] condition, the diffuse aurora contains 71% of the hemispheric energy flux (57% electrons, 14% ions). … the broadband aurora rises fastest with activity, increasing by a factor of 8.0 from low to high driving."

### Source block 5.11 — Tanskanen et al. (2016), JGR 121, doi:10.1002/2015JA021835 (supersubstorms)
- Fetched: abstract via OpenAlex. Verified: "extremely intense substorms with SuperMAG AL (SML) peak intensities < −2500 nT ('supersubstorms'/SSSs) for the period from 1981 to 2012 … highest occurrence (3.8 year−1) in the descending phase … All SSS events were associated with strong southward interplanetary magnetic field".

### Source block 5.12 — Coumans et al. (2006), JGR 111, doi:10.1029/2005JA011317 — only a search summary was seen (proton vs electron response to dynamic pressure); no numbers fetched → **UNVERIFIED**, not used.

---

## 6. Post-onset aurora by local time and phase (what an auroral-zone observer sees)

### Growth phase (equatorward-drifting quiet arcs)
- **Coumans, Blockx, Gérard, Hubert & Connors (2007)**, JGR 112, doi:10.1029/2007JA012329 — abstract via OpenAlex. Verified: "the sector of maximum proton precipitation during the growth phase is on average centered around 2200 MLT and rapidly shifts in local time by about 1.2 h toward midnight at the time of the onset. The open magnetic flux increases by 33% on average during the growth phase. The mean value of the open flux immediately before the substorm onset is about 0.66 GWb for substorms triggered by a northward turning of Bz and 0.74 GWb for nontriggered substorms. … The open magnetic flux continues to increase during the 20 min following the onset, for a large number of events. **The rate of equatorward displacement of the auroral oval boundaries during growth phase is typically ∼3 deg/h.** It is statistically correlated (r = 0.40) with the magnitude of the Bz component … correlated, with higher coefficient (r = 0.54), with functions describing the efficiency of solar wind energy transfer … the maximum displacement of the polar boundary is statistically located around midnight MLT."
- Milan et al. (2009): growth phase ≈1 h; "The SI12 and WIC ovals move to lower latitudes between t=−55 and −5 min, most apparent in the midnight sector"; Kullen & Karlsson (2004): growth 30–60 min; Li et al. (2013): 32–91 min depending on driving; Partamies (2013): AL-defined growth median 31 min (mode 14 min); Akasofu (2022): 45–60 min.
- Wang et al. (2007): mean IMF Bz minimum "about 20 min before the onset"; Newell et al. (2010): mean solar-wind driving drops "starting 20 min before substorm onset".

### Expansion phase (breakup, poleward expansion, WTS, bulge) — see Sect. 3 for geometry/speeds
- Onset sector: 21–01 MLT (Milan 2009), median 23:00 MLT (Frey 2004), 22.6 MLT mean (Liou 2010, Gjerloev 2007); pre-existing arc in the onset sector during growth (Milan 2010).
- Bulge: expands poleward (electron aurora 3.5° in 5 min, 5.5° by 1 h; Mende 2003), west (surge) and east about equally (Gjerloev 2007); oval aurora brightens and spreads mainly eastward/post-midnight (Gjerloev 2008; Mende 2003 "stronger substorm-related activity … toward dawn"); maximum expansion reached after 10–40 min, mean 30.9 min (Gjerloev 2007).
- Precipitation: broadband (Alfvénic) aurora +182 % at onset, comparable to monoenergetic in the first 10–15 min; diffuse aurora rises over ≈50 min into recovery (Newell 2010).
- Tromsø-specific — **Grandin et al. (2024)**, Ann. Geophys. 42, 355, https://angeo.copernicus.org/articles/42/355/2024/ (fetched HTML): "57 breakups above Tromsø" (66.7° N geomagnetic) and "25 onsets occurring above Svalbard" (75.4° N) "between 2015 and 2022"; Tromsø breakups peak at "23:00 and 00:00 MLT", Svalbard at "22:00 and 23:00 MLT"; at Tromsø the 1–100 keV electron energy flux shows "sharp peak of up to 25 mW m−2 in the first 2 min" then "stable values of around 7 mW m−2", with peak energy "∼ 6 keV immediately after the auroral breakup"; Svalbard (OCB-type) breakups "remain low throughout (1–2 mW m−2)", a "factor of at least 10" less in >10 keV electrons.
- Electrojet/AE timing: AE responds "with a time delay of 5–15 min after onset" (Kullen 2009); SML detects imager onsets with a median delay of ≈4 min (AL: 8 min) (Newell & Gjerloev 2011a).

### Recovery phase (pulsating aurora, omega bands, patchy diffuse aurora)
- **Partamies et al. (2017)**, JGR 122, 5606, doi:10.1002/2017JA024039 — abstract via OpenAlex. Verified: "Based on about 400 pulsating aurora events … The median duration of pulsating aurora is about **1.4 h**. This value is a conservative estimate since in many cases the end of event is limited by the end of auroral imaging … The longest durations of auroral pulsations are observed during events which start within the substorm recovery phases. As a result, the geomagnetic indices are not able to describe pulsating aurora." Peak emission height drops "by about 8 km at the start of the pulsating aurora interval". (Fennoscandian all-sky cameras; the MLT distribution is in the full text only — the "3–6 MLT" peak seen in a search snippet is SNIPPET-ONLY.)
- **Jones, Lessard, Rychert, Spanswick & Donovan (2011)**, JGR 116, A03214, doi:10.1029/2010JA015840 — abstract via OpenAlex. Verified: "74 pulsating aurora events from 119 days of good optical data within the period from September 2007 through March 2008 [Gillam, 66.18° MLAT] … the source region of pulsating aurora drifts or expands eastward, away from magnetic midnight, for premidnight onsets … **The most probable duration of a pulsating aurora event is roughly 1.5 h**, while the distribution of possible event durations includes many long (several hours) events. … pulsating aurora is quite common with the **occurrence rate increasing to around 60% for morning hours, with 69% of pulsating aurora onsets occurring after substorm breakup**."
- **Grono & Donovan (2020)**, Ann. Geophys. 38, 1–8, doi:10.5194/angeo-38-1-2020 "Surveying pulsating auroras" — fetched HTML https://angeo.copernicus.org/articles/38/1/2020/. Verified: "APAs [amorphous pulsating aurora] are seen … occurring in a band from **17 to 7 MLT between 56 and 75° MLAT, peaking during 3.5 to 6 MLT at 66 to 70° MLAT with an ~86 % probability**." "PPA [patchy pulsating] occurrence probability peaks at ~21 % from 4 to 5.5 MLT between 65 to 67° MLAT." "The peak occurrence probability of PAs [patchy aurora] is ~29 % between 4 to 5.5 MLT from 65 to 66° MLAT." "Before local midnight, pulsating auroras are almost exclusively APAs." Data: "462 h of APAs, 44 h of PPAs, and 58 h of PAs" (10 years of THEMIS ASI data). Jones et al. (2011) quoted there: "events persist for an average of 1.5 h" with "events lasting upwards of 15 h".
- **Tesema et al. (2020)**, JGR 125, doi:10.1029/2019JA027713 — abstract via OpenAlex. Verified: "Pulsating auroras (PsAs) … are predominantly observed after magnetic midnight, during the recovery phase of substorms and at the equatorward boundary of the auroral oval. … Among the 840 PsA events identified using ground-based auroral all-sky camera (ASC) network over the Fennoscandian region, 253 events were observed by DMSP, POES, and FAST".
- **Partamies et al. (2017)**, Ann. Geophys. 35, 1069–1083, doi:10.5194/angeo-35-1069-2017 "Statistical study of auroral omega bands" — full text https://arxiv.org/pdf/1710.06688 (+ OpenAlex abstract). Verified: "438 auroral omega-like structures over Fennoscandian Lapland from 1996 to 2007"; "The lifetimes of omega bands range from **1 to 47 min with a median value of 8 min (mean of 10 min)**"; occurrence "equivalent to **02:00–04:00 MLT**" with "a peak value at 02:00–03:00 MLT", "agrees very well with the peak occurrence at 02:30 MLT by Syrjäsuo and Donovan (2004)"; "In total, **90 % of all observed omega structures took place within 1.5 h from the substorm onset**. That places most of the omega undulations into the recovery phase, since the mean duration for substorm expansion phases according to the local electrojet index data is of the order of 20 min (Partamies et al., 2015)"; "Out of the reference set of 259 omega bands, two took place during growth phases, 96 during expansion phases and 161 during recovery phases"; "omega bands are observed during substorm expansion and recovery phases that are more intense than average"; most frequent from the southernmost camera (SOD, Sodankylä: "137 out of 438").
- **Wild et al. (2011)**, JGR 116, doi:10.1029/2010JA015874 — abstract via OpenAlex. Verified: omega bands "∼150 × 200 km in size and propagated eastward at ∼0.4 km s−1", "somewhat smaller and slower moving than the majority of previously reported omega bands"; Ps6 pulsations co-occur.
- Diffuse-aurora timing: rise time ≈50 min after onset (Newell 2010); Milan (2009): by t = +115 min the oval has returned to its pre-growth configuration with "residual excess brightness in the post-midnight sector".

### Canonical Akasofu (1964) sequence, as far as it could be verified (see 3.12–3.13 and the SNIPPET note)
- Growth ≈ 45–60 min (Akasofu 2022, fetched; Milan 2009 ≈1 h); expansion phase: image-defined 10–40 min (mean 30.9 min, Gjerloev 2007), "about 1 h" for medium substorms in Akasofu's own recent wording (fetched), "expansive phase (10–30 min)" in the original two-phase scheme (SNIPPET-ONLY); poleward advance 250 m/s for moderate events, several times faster/larger for very large ones, reaching up to 78° MLAT (fetched); recovery to pre-onset configuration by ≈2 h (Milan 2009 keograms, fetched; "~2 h" in the original scheme SNIPPET-ONLY); 2–3 such sequences per night at a station (Akasofu 2021, fetched; "as many as four … during a single night", GI Alaska page https://www.gi.alaska.edu/alaska-science-forum/auroral-substorm, fetched).

---

## Numbers to use

| Constant | Value | Source (fetched) | Confidence |
|---|---|---|---|
| Onset MLT median (NH) | 23.0 h (mean 23.0) | Frey 2004 full text, 2437 onsets | verified |
| Onset MLT median (all IMAGE, 4192 onsets N+S) | 22:50–23:00; mean 22.8–23.0 | Frey & Mende 2006 Table 1 | verified |
| Onset MLT mean, Polar UVI | 22.6 h, σ = 1.1 h (near-Gaussian; N and S) | Liou 2010 abstract | verified |
| Onset MLT σ (IMAGE) | 1.35 h (2000–02), 1.45 h (2003–05) | Frey & Mende 2006 ("2300±0121", "2250±0127") | verified |
| Onset MLT central 80 % range | ≈21:05–00:40 MLT | Frey 2004 Fig. 2 (read from rendered figure) | inferred |
| Fraction of onsets within ±1 h / ±2 h MLT of peak | 51–64 % / 83–93 % (σ = 1.45–1.1 h) | Gaussian with verified σ | inferred |
| Onset MLT peak-of-distribution widths (skewed peak) | Liou 2001: half-max width 3 h; Gérard 2004: FWHM 1.8 h; Wang 2005: half-max width 0.8 h dark / 1.8 h sunlit | abstracts / full text | verified |
| Onset MLAT median (NH IMAGE) | 66.4° (mean 66.1°); N 66.3° (66.0°), S −66.5° (−66.3°) | Frey 2004; Frey & Mende 2006 | verified |
| Onset MLAT mean, Polar UVI | NH 65.9° σ 2.2°; SH 68.0° σ 2.3° | Liou 2010 abstract | verified |
| Onset MLAT σ (IMAGE) | 2.86° (2000–02), 2.96° (2003–05) | Frey & Mende 2006 | verified |
| Onset MLAT range | 55–74° (1993 onsets, IMAGE) | Milan 2009 full text | verified |
| Fraction within 60–70° MLAT | > 91 % | Frey 2004 | verified |
| Fraction within ±2° MLAT of mean | 50–64 % (σ = 2.96–2.2°) | Gaussian with verified σ | inferred |
| Onset-latitude class counts (of 1993) | >68°: 501; 66–68°: 620; 64–66°: 459; 62–64°: 226; <62°: 187 | Milan 2009 Fig. 2a | verified |
| Isolated-onset list | 4193 total, 3005 isolated (no other onset within ±2 h), 1979 NH; mean 66°, 23 h | Grocott 2009 full text | verified |
| Other onset-location means (Table 1) | DE-1 22.8 h/65°; Viking 22.8 h/65.8°; Polar 22.7 h/66.6°; Gjerloev 2007 22.6 h/66.8° | Frey 2004 Table 1; Gjerloev 2007 abstract | verified |
| Seasonal MLT shift | summer ≈22:00 vs winter ≈23:00 MLT (≈1 h); sunlit onsets 1 h earlier and 1.5° poleward | Liou 2001; Wang 2005 | verified |
| Seasonal MLAT shift | ≈2° higher at solstices than equinoxes | Wang 2007 | verified |
| IMF-By MLT shift | dMLT = 0.25 h per nT By; SZA: 1 min per degree | Wang 2007 | verified |
| Onset MLAT vs merging E-field (darkness) | MLAT = 73° − 5.2·√Em (Em in mV/m, 1-h average, Em ≤ 6) | Wang 2005 full text; Wang 2007 | verified |
| Onset MLAT vs merging E-field (sunlight) | MLAT = 73° − 2.6·√Em | Wang 2005 | verified |
| Most poleward onsets (very quiet) | ≈73° MLAT | Wang 2005 | verified |
| Onset MLAT vs IMF Bz | ≈0.6–0.7° equatorward per −1 nT (hourly Bz) | Liou 2010 (search excerpt of Wiley full text) | snippet |
| Onset MLAT vs Kp / Dst regression | none found | — | unverified |
| Onset MLAT vs solar-wind dynamic pressure | anticorrelated (no coefficient in abstract) | Gérard 2004 | verified (sign only) |
| AL minimum vs pre-onset open flux | median −200 nT (F_PC < 0.45 GWb) → −600 nT (> 0.65 GWb) | Milan 2009 | verified |
| Flux-closure duration after onset | 30 min (small) → 80 min (large substorms) | Milan 2009 | verified |
| Isolated vs storm-time IL intensity | −350 nT vs −670 nT (mean) | Tanskanen 2002 abstract | verified |
| Auroral-power maximum vs reconnection E-field | 35 / 51 / 74 GW (low/mid/high groups) | Li 2013 abstract | verified |
| Growth-phase duration | median 31 min, mode 14 min, mean 48 min (AL-based) | Partamies 2013 | verified |
| Growth-phase duration (other) | 30–60 min (Kullen 2004); 45–60 min (Akasofu 2022); ≈1 h (Milan 2009); geometric means 91/62/32 min by driving (Li 2013) | full text / abstracts | verified |
| Growth-phase equatorward oval motion | ≈3°/h; proton precipitation sector 2200 MLT shifting 1.2 h toward midnight at onset | Coumans 2007 abstract | verified |
| Expansion-phase duration (AL-based) | median 12 min, mode 14 min, mean 24 min | Partamies 2013 | verified |
| Expansion-phase duration (image-based) | 10–40 min, mean 30.9 min | Gjerloev 2007 abstract | verified |
| Expansion-phase duration (local IL) | mean ≈20 min | Partamies 2017 omega paper (quoting Partamies 2015) | verified |
| Recovery-phase duration (AL-based) | median 31 min, mode 10 min, mean 48 min | Partamies 2013 | verified |
| Quiet-time duration between substorm phases | median 75 min, mean 200 min | Partamies 2013 | verified |
| Index medians by phase | AL −29 / −111 / −110 / −24 nT; AE 70 / 187 / 186 / 61 nT (growth/expansion/recovery/quiet) | Partamies 2013 Table 1 | verified |
| Whole-substorm duration (IL) | mean 2 h 55 min (yearly σ 17 min); yearly 2.8–3.3 h; individual 48 min–several h | Tanskanen 2011; Partamies 2013 | verified |
| Whole-substorm duration (imaging, expansion+recovery) | 1.3 h small/medium oval; 2.3 h large oval; up to 4–5 h | Kullen 2004 | verified |
| Typical substorm event length | 2–4 h | Partamies 2013 | verified |
| Substorm count (IMAGE IL, 1993–2008) | 8717 events; 517 ± 75 per year (16–03 UT window) | Tanskanen 2011 | verified |
| Substorm count (SML) | 10,719 onsets 1997–2002 (5084 isolated); >53,000 in 1980–2009 | Newell & Gjerloev 2011a/b | verified |
| Substorm count (LANL injections) | ≈1500 per year | Borovsky 1993 | verified |
| IL peak amplitude | mean 405 nT (yearly means 341–510 nT); individual range 210–1852 nT (1996) | Tanskanen 2011 | verified |
| IL peak amplitude quartiles | not obtained | Tanskanen 2009 full text inaccessible | unverified |
| SME peak per substorm | typical 400–600 nT, mean 656 nT (≈ 40 GW AP); quiet mode 61 nT (≈ 5 GW) | Newell & Gjerloev 2011b | verified |
| SML onset criterion (N&G list) | dSML/dt ≤ −15 nT/min sustained ≥ 3 min | Forsyth 2015 quoting N&G 2011 | verified |
| IL onset criterion (Tanskanen) | drop ≥ 100 nT, rate > 80 nT per 15 min; end at 80 % recovery | Partamies 2013 quoting Tanskanen 2009 | verified |
| Recurrence (mode) | 2.75 h; random component mean ≈5 h | Borovsky 1993 | verified |
| Recurrence (model) | D = 2.6–2.9 h (≈2.7 h) | Freeman & Morley 2004 | verified |
| Recurrence (SML) | no preferred rate; N(Δt) ∝ Δt^−1.19 below ≈3 h; regime break ≈3 h; "recurrent" = next onset < 2 h | Newell & Gjerloev 2011a/b | verified |
| Multi-cycle intensification period | ≈1 h (median) | Partamies 2013 | verified |
| Sequences per night at a station | 2–3 (up to 4) | Akasofu 2021 review; GI Alaska | verified |
| Poleward expansion (superposed mean) | electrons 3.5° in 5 min, 5.5° by 60 min; protons 2.5° / 3° | Mende 2003 abstract | verified |
| Poleward boundary speed | 230 m/s (small isolated) → 1000 m/s (intensification); 250 m/s moderate | Craven & Frank 1987; Akasofu 2021 | verified |
| Poleward speed in °/min | 0.12–0.14 (moderate) to 0.54 (intense); feature centroids 0.047 ± 0.063°/min | derived from above; Carbary 2000 | inferred / verified |
| Max poleward reach | up to ≈78° MLAT (large events) | Akasofu 2021/2022 | verified |
| Westward travelling surge speed | mean 2.2 km/s; 8 → 1 km/s over 17 min; steps ≈700 km every ≈5 min | Craven 1989 | verified |
| Leading-edge azimuthal speeds (early expansion) | west 8.8 km/s, east 5.3 km/s (16 THEMIS events) | Ogasawara 2011 | verified |
| Feature (blob) speed | preferred 0.84 ± 0.34 km/s; 90 % move poleward, >60 % westward, ≈35 % eastward | Carbary 2000 | verified |
| Bulge azimuthal symmetry | expands ≈ equally west and east; centre stays at onset MLT (≈1.5 h west of midnight); oval brightening < 1 h MLT west, far to the east | Gjerloev 2007; Milan 2010 | verified |
| Azimuthal growth rate of dipolarization/wedge | 0.22 h MLT per min; equatorward 0.09°/min | Kullen 2009 | verified |
| Current-wedge width at end of expansion | ≈6 h MLT | Kepko 2015 (search excerpt) | snippet |
| Bulge azimuthal reach (model default) | ≈2–3 h MLT each side by 30 min (2.2 km/s → 1 km/s decaying WTS; 0.22 MLT/min × 30 min ≈ 6.6 h total) | derived | inferred |
| Time to maximum bulge | 10–40 min, mean ≈31 min; recovery under way by ≈30 min | Gjerloev 2007; Milan 2010 | verified |
| Return to pre-growth configuration | ≈2 h after onset (t = +115 min) | Milan 2009 | verified |
| AE response delay after optical onset | 5–15 min; SML median 4 min, AL 8 min | Kullen 2009; N&G 2011a | verified |
| Diffuse-aurora rise time after onset | ≈50 min | Newell 2010 | verified |
| Precipitation increase at onset | diffuse +79 %, monoenergetic +90 %, broadband +182 % | Newell 2010 | verified |
| Brightness increase at onset | electrons ×5, protons ×2 (peak); WIC ×2 pre→post; ×5 across onset-latitude classes | Mende 2003; Milan 2009 | verified |
| Tromsø breakup energy flux | 25 mW/m² peak in first 2 min → ≈7 mW/m² plateau; ≈6 keV | Grandin 2024 | verified |
| Tromsø breakup MLT peak | 23–00 MLT (Svalbard 22–23 MLT) | Grandin 2024 | verified |
| Joule heating vs AE | 2.3×10^8 W/nT (Ahn 1983); ≈0.3 GW/nT (Baumjohann & Kamide 1984) | abstracts | verified |
| Particle (auroral) power vs AE / AL | 0.6×10^8 W per nT AE; 0.8×10^8 W per nT |AL| (≈6 GW per 100 nT AE) | Ahn 1983 | verified |
| Nightside AP vs SME | r = 0.86 (AE(12): 0.81); linear for diffuse power; ≈0.06 GW/nT two-point slope | N&G 2011a/b | verified / inferred |
| Joule fraction of ε input | ≈30 % (NH) | Tanskanen 2002 | verified |
| Energy partition W(U_R):W(U_J):W(U_A) | 15 : 56 : 29 % | Østgaard 2002 | verified |
| Coupling ↔ Kp anchors | dΦ/dt 1.2 MWb/s ≈ Kp 5+/6−; 3.0 MWb/s ≈ Kp 8+; oval to ≈55° MLAT | Newell 2014 | verified |
| Supersubstorm threshold | SML < −2500 nT; 3.8 per year in declining phase | Tanskanen 2016 | verified |
| Pulsating aurora duration | median 1.4 h (400 events, Lapland); most probable 1.5 h (74 events, Gillam); up to >15 h | Partamies 2017; Jones 2011 | verified |
| Pulsating aurora occurrence | ≈60 % of morning hours; 69 % of PsA onsets after breakup | Jones 2011 | verified |
| Pulsating aurora MLT/MLAT peak | amorphous PsA 86 % probability at 3.5–6 MLT, 66–70° MLAT (band 17–07 MLT, 56–75°); patchy PsA 21 % and patchy aurora 29 % at 4–5.5 MLT, 65–67° | Grono & Donovan 2020 | verified |
| Pulsating aurora location | post-midnight, recovery phase, equatorward oval boundary | Tesema 2020 | verified |
| Omega bands: MLT | peak 02–04 MLT (bin 02–03; 02:30 per Syrjäsuo & Donovan 2004) | Partamies 2017 omega | verified |
| Omega bands: lifetime | 1–47 min, median 8 min, mean 10 min | Partamies 2017 omega | verified |
| Omega bands: timing | 90 % within 1.5 h of onset; 96 expansion / 161 recovery / 2 growth (of 259) | Partamies 2017 omega | verified |
| Omega band size/drift | ≈150 × 200 km, ≈0.4 km/s eastward (small case); eastward drift generally | Wild 2011 | verified |
| Akasofu 1964 original phase durations | expansive 10–30 min, recovery ≈2 h (two-phase scheme) | Springer reviews (search excerpts only) | snippet |

---

## Access log — what could not be verified and what was tried
- **Akasofu (1964) original timings**: ScienceDirect 403; OpenAlex abstract empty; Springer restatements (Geoscience Lett. 2016, SSR 2017, PEPS 2015) return a bot challenge to both WebFetch and curl. Numbers rest on search excerpts; the fetched Akasofu 2021/2022 reviews and imaging statistics are used instead.
- **Liou (2010) Bz slope (0.6–0.7°/nT)**: Wiley 403, ADS 405/"Human Verification", Semantic Scholar has no abstract; OpenAlex abstract lacks the slope. Snippet only.
- **Onset MLAT vs Kp/Dst/SYM-H regression**: three targeted searches found nothing peer-reviewed; use the Em regression (Wang 2005) instead.
- **Gjerloev (2007) bulge ΔMLT/ΔILat at maximum and poleward-boundary RMS speed (149 m/s snippet)**: full text inaccessible (Wiley 403, ResearchGate 403).
- **Kepko (2015) wedge width ≈6 h MLT**: Springer bot challenge; snippet only.
- **Tanskanen (2002) regression of IL peak on ∫ε**, **Tanskanen (2009) IL amplitude quartiles**, **Newell & Gjerloev (2011a) SME→AP regression coefficients**, **Partamies (2017) PsA MLT histogram**, **SOPHIE phase-duration medians**: full texts inaccessible (Wiley 403); abstract-level numbers only.
- **SuperMAG substorm-list page** (sustained-drop criterion): JavaScript-rendered; WebFetch timed out twice and curl returned no text. Criterion taken from Forsyth 2015's description.
- **Newell (2014) AE→hemispheric-power formula**: not in abstract; the model is coupling-function driven. Ahn 1983 / Baumjohann & Kamide 1984 / N&G 2011b give the AE–power scalings instead.
- Local copies of all fetched PDFs/texts are in `scratchpad/pdfs/` and `scratchpad/txt/`; OpenAlex abstract dumps in `scratchpad/abs/openalex*.txt`; rendered figure pages in `scratchpad/png/`.

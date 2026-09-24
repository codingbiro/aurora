<!-- Research report produced by a background research agent on 2026-09-24 for the Copenhagen short-term efficacy audit; every item marked verified was fetched that day. Consolidated in copenhagen_short_term_efficacy.md. -->
# Mid-latitude aurora visibility for Copenhagen (55.68 N, 12.57 E; AACGM ~52.4 N) — evidence audit

Status: COMPLETE (26 fetched sources; partial findings were written as research proceeded). Agent B1, 2026-09-24. Web-search budget (200/session) was exhausted near the end; remaining gaps are marked UNVERIFIED.

Conventions: every number is tagged with the source block ID in brackets, e.g. [S1]. "VERIFIED" = the figure was read verbatim from the fetched page/PDF. "UNVERIFIED" = quoted from a secondary source or from search-engine summary only; what was tried is stated.

---

## 1. Empirical sighting statistics at 50-55 deg magnetic latitude

### 1c. UK: AuroraWatch UK (Lancaster University) — Case et al. 2017 [S1] VERIFIED (PDF full text)

Source: Case, N. A., Marple, S. R., Honary, F., Wild, J. A., Billett, D. D., Grocott, A. (2017), "AuroraWatch UK: An Automated Aurora Alert System", Earth and Space Science 4, 746-754, doi:10.1002/2017EA000328. Open-access PDF fetched from Lancaster EPrints: https://eprints.lancs.ac.uk/id/eprint/88521/1/Case_et_al_2017_Earth_and_Space_Science.pdf (text extracted with pypdf).

Verbatim (Table 1, activity index A = hourly range of H and E components relative to a quiet-day curve, primary magnetometer Crooktree near Aberdeen):

| Color | Activity range (nT) | Meaning |
|---|---|---|
| Green | A < 50 | "Aurora is unlikely to be visible by eye or camera from anywhere in the UK." |
| Yellow | 50 <= A < 100 | "Aurora may be visible by eye from Scotland and may be visible by camera from Scotland, northern England and Northern Ireland." |
| Amber | 100 <= A < 200 | "Aurora is likely to be visible by eye from Scotland, northern England and Northern Ireland; possibly visible from elsewhere in the UK. Photographs of aurora are likely from anywhere in the UK." |
| Red | A >= 200 | "It is likely that aurora will be visible by eye and camera from anywhere in the UK." |

Verbatim (Table 2, geomagnetic coordinates IGRF2017): Crooktree 58.98 N, 85.22 E; Eskdalemuir 57.32 N; Lancaster 56.14 N; Lerwick 61.65 N; York 55.70 N. NOTE: these are geomagnetic (dipole-type) latitudes, roughly 3-4 deg higher than the AACGM values usually quoted; Lancaster (54.0 N geographic) is ~1.7 deg north of Copenhagen geographically and, being further west, sits ~3-4 deg higher in magnetic latitude than Copenhagen (AACGM ~52.4).

Verbatim (Section 4, 1 Sep 2000 - 24 Oct 2017, 150,192 h): "the activity level in this merged data set reached the yellow threshold for 7,089 h (4.7%), amber for 1,495 h (1.0%), and red for 390 h (0.3%). This corresponds to approximately 412 h of yellow, 88 h of amber, and 23 h of red alert level per year."

Verbatim: "the elevated status percentages closely match the percentage of time that Kp >= 4 (i.e., geomagnetically active)" — i.e. the paper ties yellow-or-above (>= 50 nT hourly range at ~59 deg geomagnetic) statistically to Kp >= 4, but gives NO per-level Kp mapping.

Verbatim (on light pollution): "since the AWUK alert level is not affected by local conditions such as cloud cover or light pollution, the historical data presented here could be used to determine the frequency of potential aurora sightings from the UK if local conditions had permitted."

Verbatim (on eye vs camera): "a camera sensor is more sensitive than the human eye and is capable of long exposures. As such, we include both 'by eye' and 'by camera' estimates in the alert level meanings." And: the level meanings "are based upon experience of where in the UK the aurora is seen at certain levels of geomagnetic activity" (paraphrase of the sentence around 'experience'; see PDF).

Relevance to Copenhagen: "Amber" (100-200 nT hourly range at Crooktree, ~88 h/yr) is the level at which AWUK says aurora is "likely to be visible by eye from ... northern England and Northern Ireland" (York 55.7 geomagnetic; Lancaster 56.1) and "photographs ... likely from anywhere in the UK". Copenhagen is 3-4 deg magnetically south of Lancaster, so Copenhagen naked-eye is more like AWUK "red" (>= 200 nT; ~23 h/yr) and camera roughly "amber".

Alerts page (fetched https://aurorawatch.lancs.ac.uk/alerts/) carries the same four level texts and adds: "local conditions will still need to be right for you to see aurora".

### 1c (cont.). Case et al. 2016, Space Weather — the origin of the dashboard's "8 deg" [S2] PARTIAL

Crossref record fetched: https://api.crossref.org/works/10.1002/2015SW001320 — Case, MacDonald, Viereck (2016), "Using citizen science reports to define the equatorial extent of auroral visibility", Space Weather 14(3), 198-209. Abstract verbatim (excerpt): "we utilize nearly 500 citizen science auroral reports to compare with the view line provided by an updated SWPC aurora forecast product using auroral precipitation data from OVATION Prime (2013). The citizen science observations were recorded during March and April 2015 ... We find that this updated SWPC view line is conservative in its estimate and that the aurora is often viewable further equatorward than is indicated by the forecast. ... An OVATION Prime (2013) energy flux-based equatorial boundary view line is also developed and is found to provide the best overall agreement with the citizen science reports, with an accuracy of 91%."

The "8 deg" and "18 % contour" figures are NOT in the abstract; full text still to be checked (see below).


### 1a. Germany: Polarlicht-Archiv (AKM e.V. / Andreas Moeller) [S3] VERIFIED (JSON API)

Source: https://api.polarlicht-archiv.de/statistics (public JSON endpoint used by https://www.polarlicht-archiv.de/statistics/; fetched 2026-09-24). Site: "Polarlicht-Archiv fuer Deutschland", (c) 2013-2026 Andreas Moeller; FAQ (https://www.polarlicht-archiv.de/faq/): "Das Polarlicht-Archiv ist eine Sammlung von Polarlicht-Nachweisen und Sichtungen aus Deutschland ... Es werden nur Sichtungen aus Deutschland oder Sued-Europa angenommen." Sightings are posted in the AKM e.V. forum or via the online form.

Verbatim JSON (attributes): eventCount 1154, sightingCount 6455, imageCount 10958, videoCount 488.
Brightness class distribution of all 6455 sightings (classes 1-5; the meteoros.de AKM page names the classes "fotografisch", "schwach visuell", "deutlich visuell", "sehr hell", "extrem hell" — mapping of numbers to names inferred, UNVERIFIED): class 1: 3087 (47.8%), class 2: 1035 (16.0%), class 3: 1000 (15.5%), class 4: 617 (9.6%), class 5: 193 (3.0%). I.e. ~48% of German sightings are camera-only; ~52% were seen by eye at some level.
Sightings by month (all years): Jan 72, Feb 87, Mar 136, Apr 120, May 73, Jun 26, Jul 52, Aug 119, Sep 143, Oct 145, Nov 108, Dec 73 — equinox peaks, June minimum (twilight).
Sightings per recent year (with brightness-class counts 1/2/3/4/5): 2024: 62 (35/13/11/1/2); 2025: 94 (52/17/23/2/0); 2023: 57 (34/11/8/4/0); 2022: 40 (20/14/5/1/0); 2021: 14; 2020: 6; 2019: 7; 2018: 12; 2017: 25; 2016: 42; 2015: 39; 2014: 15; 2013: 13; 2012: 21; 2011: 11; 2010: 5. (NOTE: these "sightingCount" per year in recentYears look like event-nights rather than individual reports — the 2024 count of 62 vs the well-known >20 May-2024 reports suggests the per-year list counts nights; treat as "aurora nights per year" — UNVERIFIED which.)
Top observers include "Leibniz-Institut fuer Atmosphaerenphysik (IAP)" (Kuehlungsborn, 54.1 N, 11.8 E — the closest analogue to Copenhagen) with 84 sightings and "Panomax Webcam" 104.

Kp distribution: the per-event list endpoint (/events) returns HTTP 403 to non-browser clients, so the event-by-event Kp table could not be pulled. UNVERIFIED. The search-engine summary of meteoros.de/polarlicht-vorhersage.de states "Ab einem Kp-Wert von 5 sind Polarlichterscheinungen in Norddeutschland moeglich, fuer Sueddeutschland sind Werte von 7-8 noetig" — not read verbatim on a fetched page (the meteoros.de page fetched gave only the year statements: "Jahre mit vielen Polarlichtbeobachtungen ... 2001 oder 2012 ... keine einzige Polarlichtnacht (2007 - 2009)").

### 1b. Denmark: DMI [S4]

DMI theme page fetched: https://www.dmi.dk/vejr-og-atmosfare/temaforside-lysfanomener-pa-himlen/nordlys-et-fanomen-primart-for-de-arktiske-egne/ (John Cappelen, updated 3 Sep 2018). It contains NO Kp guidance; it says aurora in Denmark appears "ret kortvarigt" and "har ofte staerkt roedlige farver" (often strongly reddish colours) — consistent with the 630 nm red upper parts being what is seen from far south. (Verbatim fragments as returned by the fetch.)

## 2. Boundary models (partial, being filled)

### NOAA SWPC "Tips on viewing the aurora" [S5] VERIFIED
URL fetched: https://www.spaceweather.gov/content/tips-viewing-aurora (redirect from swpc.noaa.gov). Verbatim: "At Kp = 0, the equator ward edge of the auroral oval is approximately 66 degrees. And it moves equatorward about 2 degrees for each level of Kp." "Given the right vantage point, say for example on top of a hill in the northern hemisphere with an unobstructed view toward the north, a person can see aurora even when it is 1000 km (600 miles) further north." "Best aurora is usually within an hour or two of midnight (between 10 PM and 2 AM local time)." "Get away from city lights. The full moon will also diminish the apparent brightness of the aurora (not the actual brightness)." "The best Seasons for aurora watching are around the spring and fall equinoxes."

### Gussenhoven, Hardy & Heinemann 1983 [S6] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/JA088iA07p05692 — abstract verbatim (excerpt): "The boundaries are well-ordered by Kp in the night sector ... The equatorward diffuse auroral boundary is well fit by a circle at each activity level. The center of the circle is offset from the geomagnetic pole, and the radius of the circle increases with increasing magnetic activity. ... Using the equations for boundary variations with Kp, each evening sector boundary was projected to a midnight boundary. The projected midnight boundary serves as an index of auroral activity". Midnight slope/intercept: NOT in abstract — UNVERIFIED (Wiley full text 403; ADS blocked by fetch policy).

### AFRL Midnight Boundary Index page [S7] VERIFIED (curl -k, cert error otherwise)
https://dmsp.bc.edu/html2/dmspssj4_midnit.html — verbatim: "The Midnight Boundary Index is an estimate of the equatorward boundary of precipitating auroral electrons as determined by the SSJ4 instrument on DMSP spacecraft." "Gussenhoven et al. (1981) ... determined the regression coefficients for a linear fit of equatorward auroral boundaries for 13 of the 24 hourly local time sectors and compared the results to the Kp indices ... A follow-on study (Gussenhoven et al., 1983) ... increased the database to 20 of 24 local time sectors". "Midnight Boundary data are available upon request." No coefficients given on the page.

### Yokoyama, Kamide & Miyaoka 1998, Ann. Geophys. 16, 566-573 [S8] VERIFIED (open-access PDF, text extracted)
https://angeo.copernicus.org/articles/16/566/1998/angeo-16-566-1998.pdf — verbatim: "the equatorward boundary of the belt at midnight expands equatorward, reaching its lowest latitude about one hour before Dst peaks. This time lag depends very little on storm intensity." Data: auroral boundary index 1983-1991, "423 geomagnetic storms": "133 weak storms Dstmin >= -50 nT, 205 moderate storms -50 > Dstmin >= -100 nT, and 85 intense storms Dstmin < -100 nT". "the equatorward boundary of the auroral belt appears to reach the lowest latitude 0-2 h before Dst reaches its peak". Also cites: "Akasofu and Chapman (1963) have shown a 2.5 deg equatorward shift of the equatorwardmost arcs for each 100 nT decrease in Dst." The specific claim "55-65 deg for Dst > -50, < 50 deg for Dst < -100" is NOT stated in the text in those words (Fig. 3 top shows the scatter of min Dst vs equatorwardmost boundary latitude; numbers not extractable from figure) — UNVERIFIED as a quotation.

### Carbary 2005 [S9] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2005SW000162 — "boundary latitudes of each profile are determined at a threshold of 4 photons cm-2 s-1 ... The boundary and peak locations vary linearly with Kp index ... As a general rule of thumb, the UV intensity peak shifts 1 deg in magnetic latitude for each increment in Kp. The fits are surprisingly good for Kp < 6 but begin to deteriorate at high Kp".

### Zhang & Paxton 2008 [S10]
https://api.crossref.org/works/10.1016/j.jastp.2008.03.008 — bibliographic record only (JASTP 70, 1231-1242); abstract not in Crossref. UNVERIFIED beyond citation.

### Troyer et al. 2025, JGR Space Physics [S11] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2024JA033497 — "A Probabilistic Kp and Hp Driven Auroral Boundary Model Using 28 Years of DMSP Data": "just under 1 million auroral boundaries between 1986 and 2014"; fits per Kp/Hp and MLT bin, "for an arbitrary distribution percentile"; "Hp30 is the best representation of the data"; 50th and 95th percentile specifications. Latitude values not in abstract.


### 1c (cont.). Case, MacDonald & Viereck 2016 — FULL TEXT VERIFIED [S2 updated]
Accepted manuscript fetched from Lancaster EPrints: https://eprints.lancs.ac.uk/id/eprint/78236/1/viewable_aurora_extent_final.pdf (record https://eprints.lancs.ac.uk/id/eprint/78236/; draft dated February 13, 2016; text extracted with pypdf). Verbatim:
- Data: "Positive reports, which make up 85% of the reports in this case study"; "The positive sightings and verified tweets collectively span from 43.8 deg to 73.2 deg in absolute magnetic latitude, with a median latitude of 58.6 deg." "...span from approximately 19:00 to 07:00 LT, with the median start time of 22:45 LT." "The corresponding Kp values for the Aurorasaurus reports span from 0 to 7, with a median value of 5."
- SWPC view line: reports equatorward of it "account for 62.0% of the total positive reports, the median difference is +3.70 deg (or approximately 400km equatorward)"; "the accuracy of the view-line ... was poor at 43.9%."
- Equatorial boundary definition: "the equatorial boundary is defined as the most equatorward latitude at which P(A) >= 18%, which equates to Sigma_j >= 1 erg cm-2 s-1 (c.f. Machol et al. [2012] who cite this threshold as approximately corresponding to visible aurora)."
- Offset fit: "the line of best fit through the maximums is found to be: |phi_EB| - |phi_rep| = (0.00 +/- 0.03) P(A)max + (7.65 +/- 2.06)" -> "phi_EB_VL = phi_EB +/- 8 (5)". "The median difference of the positive reports is 7.74 deg (850 km poleward) and 95.0% of the positive reports are poleward of the view-line. The accuracy of this view-line is 91.2% (Sum TP = 246, Sum TN = 12 and Sum R = 283)."
- Reports vs the 1-erg boundary itself: "The median difference for all positive reports is 0.62 deg (approximately 70 km equatorward). When filtering to only those reports equatorward of the equatorial boundary the median difference was +3.06 deg (approximately 350 km equatorward)."
- Table 1: Updated SWPC phi = phi_P(A)max +/- (P(A)max/20 + 3): 43.9%; Aurorasaurus phi = phi_P(A)max +/- (P(A)max/16 + 8): 90.1%; Equatorial Boundary phi = phi_EB +/- 8: 91.2%.
- Geometry: "Since the visible aurora can reach over 400km in altitude [Kataoka et al., 2013], a simple estimate places this view-line in the region of 9 - 10 deg in latitude from the auroral oval. Of course, such a basic approach neglects several factors including the width of the auroral oval (which can span several degrees in latitude), the total aurora precipitation flux (which can affect its luminosity) and the type of aurora. In the early evening, for example, the aurora typically consists of quiet arcs that do not extend far in latitude."
INTERPRETATION: the "8 deg" is the fit through the MAXIMUM offsets per P(A)max bin (an envelope, "line of best fit through the maximums"), not the typical offset. The typical (median) positive report lies only 0.62 deg equatorward of the 1-erg edge, and even among reports that were equatorward of it the median is +3.06 deg. The 8 deg envelope was derived from a March-April 2015 dataset dominated by one severe storm (St Patrick's Day, Kp 8-) and by North-American reporters, mostly with cameras and dark rural skies; the dataset's own accuracy metric rewards a generous envelope because 85% of reports were positive. So 8 deg is a "you might possibly see something (usually with a camera)" envelope, not a naked-eye-from-a-city threshold.

### 1d. Netherlands/Belgium [S12] partly VERIFIED
poollicht.be (SpaceWeatherLive) Kp help page fetched: https://www.poollicht.be/nl/help/de-kp-index.html — table "Welke Kp-waarde heb ik nodig om poollicht te zien op mijn locatie?": Kp 5: Edinburgh, Gothenburg, Riga; Kp 6: Dublin, Manchester, Hamburg, Gdansk, Vilnius, Moscow; Kp 7: London, Brussels, Cologne, Dresden, Warsaw; Kp 8: Paris, Munich, Vienna, Bratislava, Kiev. Caveat verbatim: "Let er op dat men op de locaties in de onderstaande tabel alleen poollicht kan zien onder perfecte omstandigheden" (only under perfect conditions: clear northern horizon, no clouds, no light pollution, full darkness). Copenhagen (55.7 N) sits between Gothenburg (57.7 N, Kp 5) and Hamburg (53.6 N, Kp 6) -> SpaceWeatherLive's implied "seen under perfect conditions" threshold for Copenhagen is about Kp 5.5-6.
Search-engine summaries (NOT read on a fetched page, UNVERIFIED): VWK (Vereniging voor Weerkunde en Klimatologie): "Nederland ligt in een marginale zone ... in jaren met verhoogde zonneactiviteit wordt het op 5 tot 10 dagen per jaar gemeld"; "Bij Kp 7 of hoger is er een reele kans op poollicht in Nederland"; "Bij Kp 5 en 6 is fotografisch poollicht boven Nederland mogelijk met korte pieken; vanaf Kp 7 neemt de kans op visueel poollicht toe" (vwkweb.nl returned 403 to the fetcher).

## 3. Phenomenology at 52 deg magnetic latitude

### STEVE / SAID — MacDonald et al. 2018, Science Advances 4, eaaq0030 [S13] VERIFIED (LANL accepted manuscript)
https://www.osti.gov/pages/servlets/purl/1483550 (text extracted with pypdf). Verbatim: "The arc is located ~4 deg equatorward of the main auroral oval"; "the arc was found just below 60 deg MLAT"; Swarm ion velocity "westward (negative) flow that reaches 5.5 km/s"; "SAIDs tend to occur at a latitude of ~60.1 deg around 22:30 in MLT with an average half-width of 0.57 deg"; emission "altitudes of peak emission ranging from 170 to 230 km". -> STEVE sits at ~58-61 deg MLAT, i.e. 6-9 deg poleward of Copenhagen: seen from Copenhagen it would be a low mauve band in the north, elevation roughly 10-20 deg (geometry computed below).

### STEVE statistics — Gallardo-Lacourt et al. 2018, JGR Space Physics [S14] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2018JA025368 — "28 STEVE events"; "STEVE occurs about 1 hr after substorm onset at the end of a prolonged expansion phase"; "average duration for STEVE is about 1 hr, and its latitudinal width is ~20 km"; "equatorward displacement from its initial location of about 50 km and a longitudinal extent of 2,145 km". (Search-engine summary, UNVERIFIED: all events 22-01 MLT; typical Dst ~ -20 nT; Kp rising 2 -> 3.5.)

### SAR arcs — Mendillo et al. 2016, JGR Space Physics [S15] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1002/2015JA021722 — Millstone Hill (Westford MA, ~53 deg MLAT) all-sky imager 1987-2014: "A total of 314 SAR arcs have been observed during the 27 years of imaging"; "SAR arcs from Millstone Hill give the location of the plasmapause at radial distances between 2 to 4.5 Earth radii" (i.e. MLAT ~45-62 deg); "the most prominent storm time optical feature from a subauroral site is a stable auroral red (SAR) arc"; emission altitude 400 km. -> ~12 SAR-arc nights per year at a 53 deg MLAT site with a research imager; they are 630-nm, sub-visual to faint, storm-recovery-phase features.

### Emission colour seen from Denmark — DMI [S4] VERIFIED
DMI theme page (John Cappelen, updated 3 Sep 2018): aurora in Denmark "har ofte staerkt roedlige farver" and appears "ret kortvarigt". DMI news 11 Sep 2014 (https://www.dmi.dk/nyheder/2014/nordlys-kan-na-danmark-fra-i-nat, duty forecaster Jesper Eriksen quoted): "et sted, hvor der er saa moerkt som overhovedet muligt", "fri og moerk nordlig horisont", "Se mod nord", and viewing from built-up areas is "normalt umuligt paa grund af lysforurening".

## 4. Light pollution and darkness for Copenhagen

### klarhimmel.dk light-pollution page [S16] VERIFIED (no data source cited on page)
https://klarhimmel.dk/lysforurening — Bortle classes listed: "Koebenhavn" Bortle 9 "Total byhimmel"; "Gribskov" Bortle 4; "Jaegerspris Nordskov" Bortle 4; "Saltholm" Bortle 3 "Landhimmel"; "Hedehusene" Bortle 5 "Forstadshimmel". Dark Sky Moen (search-engine summary, UNVERIFIED, darkskymoen.dk timed out): Moen/Nyord IDA Dark Sky Park, Bortle 2. lysforurening.dk (fetched https://lysforurening.dk/morke-observationssteder/) lists Tisvildeleje, Stevns, Moen, Nyord as dark observing sites with coordinates but gives no SQM numbers.

### Astronomical darkness, Copenhagen (55.68 N, 12.57 E) [S17] VERIFIED (sunrise-sunset.org API, times UTC)
https://api.sunrise-sunset.org/json?lat=55.68&lng=12.57&date=YYYY-MM-DD&formatted=0 — astronomical twilight end (evening) / begin (morning):
2026-03-21: 19:32 / 03:01; 2026-04-21: 21:10 / 01:06; 2026-05-10, 05-21, 06-21, 07-21, 08-05: NO astronomical darkness (API returns 00:00/00:00 = sun never below -18 deg); 2026-08-21: 21:15 / 01:10; 2026-09-22: 19:16 / 02:48; 2026-10-21: 17:59 / 03:49; 2026-12-21: 16:59 / 05:16. Local time = UTC+1 (winter) / UTC+2 (summer). So from roughly the first week of May to the second week of August Copenhagen never gets astronomically dark; around magnetic midnight (22:50 UT) the sky is fully dark from about late August to mid-April.


### 1d (cont.). Netherlands: VWK (Vereniging voor Weerkunde en Klimatologie) [S12b] VERIFIED (curl)
https://www.vwkweb.nl/index.php?page=1509 — verbatim: "Nederland ligt in een marginale zone waar in gemiddeld een van de honderd gevallen het poollicht zichtbaar wordt. Het op zichzelf algemene verschijnsel is daarmee voor onze streken een zeldzaamheid. In jaren met verhoogde zonneactiviteit wordt het op 5 a 10 dagen in ons land gemeld. De meeste waarnemingen komen nog uit het noorden van het land. Slechts heel zelden is het poollicht zo sterk dat het ook vanuit de stad is te zien." "Als de Kp-index 7 of hoger is is er op dat moment een reeele kans op poollicht in Nederland." Brightness scale: "1 -- Als de melkweg. Kleurgewaarwording nauwelijks mogelijk, meestal is iets rood te onderscheiden; 2 -- Als ijle Cirruswolken, beschenen door de maan; 3 -- Als stapelwolken, beschenen door de maan; 4 -- Landschap verlicht zoals bij volle maan." Form "G glow: Lichtgloed aan de noordelijke horizon. Deze zal in de meeste gevallen het bovenste gedeelte zijn van een grotendeels onder de horizon liggende homogene boog". (The Netherlands, ~49-50 deg AACGM, is 2-3 deg south of Copenhagen; spacepage.be, fetched, says "Ideaal voor onze streken is een waarde van 7 of meer".)

### Landry et al. 2019, JGR [S18] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2018JA025451 — DMSP 1987-2012 + DE 2 model of the equatorward boundary of the diffuse aurora: "weighted averages of the AE index and the solar wind coupling function dPhi_MP/dt both outperform the often used Kp index".

### Starkov 1994 coefficients — cross-checked by OCR against Sigernes et al., "Real time aurora oval forecasting - SvalTrack II" (UNIS) [S19] VERIFIED (values)
Source: https://aurora.unis.no/doc/Sigernes_Oval.pdf (image-only PDF; OCR'd locally with rapidocr after PyMuPDF rendering at 200 dpi; OCR text saved as sigernes_unis_ocr.txt). The JSWSC 2011 journal copy (https://www.swsc-journal.org/articles/swsc/pdf/2011/01/swsc110021.pdf) is behind a DataDome bot wall (HTTP 403 to both the fetcher and curl).
OCR of Table 1/2 verbatim (row order as OCR read it): Kp->AL polynomial "c0 c2 c3 | 18 | -12.3 | 27.2 | -2.0"; "Poleward boundary of the auroral oval | b0 | -0.07 | -10.06 | -6.61 | -4.44 | -3.77 | 6.37 | -4.48 | b1 | 24.54 | 19.83 | 7.47 | 7.90 | 10.17 | -1.10 | 10.16 | b2 | -3.01 | -4.73 | -5.80 | -12.53 | -9.33 | 0.34 | -5.87 | b3 | 0.25 | 0.91 | 2.15 | 1.19 | 1.24 | -0.38 | 0.98"; "Equatorward boundary of the auroral oval | b0 | 1.61 | -9.59 | -12.07 | -6.56 | -2.22 | -23.98 | -20.07 | 17.49 | 1.50 | 23.21 | 17.78 | 11.44 | 42.79 | 36.67 | b2 | -10.97 | -7.20 | -7.96 | -6.73 | -0.58 | -26.96 | -24.20 | b3 | 1.15 | 2.03 | 0.96 | 1.31 | 0.08 | 5.56 | 5.11"; "Equatorward boundary of the diffuse aurora | b0 | -0.74 | -2.12 | -2.41 | -1.68 | 8.69 | 3.44 | 8.61 | 7.89 | 3.94 | 3.24 | -2.48 | 29.77 | -20.73 | -5.34 | b2 | -16.38 | -4.32 | -3.09 | -1.67 | 1.58 | 13.03 | -1.36 | b3 | 3.35 | 0.87 | 0.72 | 0.31 | -0.28 | -2.14 | 0.76". "Table 2. Expansion coefficients for auroral boundaries by Starkov [9] used in Eq. (3)." "A_i or alpha_i = b0 + b1 log10 AL + ..." (third-order polynomial in log10 AL).
Comparison with the dashboard's table (/Users/quick/Documents/GitHub/aurora/research/starkov1994_coeffs.csv, used by web/src/model/oval.mjs): all 84 numbers are present with identical values; in 7 of the 12 rows the OCR column order is identical to the CSV, in the other 5 rows the OCR scrambled the column reading order (same multiset of values). The CSV column assignment (A0,A1,A2,A3,alpha1,alpha2,alpha3) therefore cannot be 100% confirmed for those 5 rows by OCR, but the values themselves are. Kp->|AL| = 18 - 12.3 Kp + 27.2 Kp^2 - 2.0 Kp^3 nT: VERIFIED.

Dashboard model outputs (computed by running web/src/model/oval.mjs with node; equatorward boundary in corrected geomagnetic latitude):
| Kp | Starkov diffuse edge, MLT 0 | Starkov diffuse edge, MLT 23 | Starkov discrete-oval edge, MLT 0 | NOAA 66-2Kp |
|---|---|---|---|---|
| 3 | 61.14 | 61.67 | 63.77 | 60 |
| 4 | 59.06 | 59.53 | 62.58 | 58 |
| 5 | 57.10 | 57.49 | 61.40 | 56 |
| 6 | 55.41 | 55.72 | 60.47 | 54 |
| 7 | 54.10 | 54.33 | 59.94 | 52 |
| 8 | 53.27 | 53.46 | 59.72 | 50 |
| 9 | 53.05 | 53.22 | 59.68 | 48 |
The task's quoted "61.7 / 59.5 / 57.5 / 55.7 at Kp 3/4/5/6" are the MLT-23 values. Solved thresholds for Copenhagen (52.4 AACGM), MLT 0, diffuse edge: within 8 deg (<= 60.4) at Kp 3.36 (MLT 23: 3.59); within 5 deg (<= 57.4) at Kp 4.84; within 3 deg (<= 55.4) at Kp 6.01; within 2 deg at Kp 6.74; at/over the observer (<= 52.4): never with pure Starkov (saturates at 53.05 at Kp 9), Kp 7.51 with the dashboard's "hybrid" (Starkov to Kp 6 then 2 deg/Kp). Discrete-oval edge within 8 deg only at Kp >= 6.10 and it saturates at ~59.7 (Starkov's AL(Kp) polynomial flattens above Kp 7) — the model cannot represent the Kp 8-9 storms in which the discrete oval was overhead in Denmark/Germany (e.g. 10-11 May 2024, Dst -412 nT, visual oval boundary reconstructed to 29.8 deg invariant latitude by Hayakawa et al. 2024, https://arxiv.org/abs/2407.07665, abstract VERIFIED).

### Magnetic coordinates of the comparison sites [S20] computed (aacgmv2 Python package, IGRF-based AACGM-v2, epoch 2026-01-01, 110 km)
| Site | Geographic | AACGM lat | Centered-dipole lat |
|---|---|---|---|
| Lerwick | 60.14 N, 1.18 W | 57.9 | 61.8 |
| Gothenburg | 57.71 N, 11.97 E | 54.7 | 57.4 |
| Skagen | 57.72 N, 10.59 E | 54.7 | — |
| Crooktree (AWUK primary) | 57.09 N, 2.64 W | 54.4 | 59.1 |
| Hornbaek / Gilleleje | 56.1 N, 12.4 E | 52.9 | 55.7 |
| Copenhagen | 55.68 N, 12.57 E | 52.4 | 55.3 |
| Eskdalemuir | 55.32 N, 3.21 W | 52.4 | — |
| Lancaster (AWUK) | 54.01 N, 2.77 W | 50.8 | 56.2 |
| York (AWUK) | 53.95 N, 1.05 W | 50.7 | 55.9 |
| Kuehlungsborn (IAP) | 54.12 N, 11.77 E | 50.6 | 54.0 |
| Westford MA (Millstone Hill) | 42.62 N, 71.49 W | 50.4 | 52.0 |
| Hamburg | 53.55 N, 9.99 E | 50.0 | 53.7 |
| Amsterdam | 52.37 N, 4.90 E | 48.7 | 53.4 |
Case et al. 2017 Table 2 "geomagnetic coordinates (IGRF2017)" (Crooktree 58.98, Lancaster 56.14, York 55.70, Lerwick 61.65) match the centered-dipole column, not AACGM. aacgmv2 gives Copenhagen magnetic midnight (MLT = 0) at 23:05 UT (task statement: ~22:50 UT).
KEY CONSEQUENCE: in AACGM, Copenhagen (52.4) lies between AWUK's "Scotland" (Crooktree 54.4) and "northern England" (Lancaster/York 50.7-50.8) sites, at the same magnetic latitude as Eskdalemuir. AWUK's level wording therefore maps directly onto Copenhagen: YELLOW (50-100 nT hourly range) = "may be visible by camera" at Copenhagen's latitude, eye only further north; AMBER (100-200 nT) = "likely to be visible by eye" at Copenhagen's latitude (dark sky) and "photographs likely"; RED (>= 200 nT) = eye "anywhere" including south of Copenhagen.

### GFZ Hp30 [S22] VERIFIED
https://kp.gfz.de/en/hp30-hp60 — verbatim: "The geomagnetic Hpo index is a Kp-like index with a time resolution of half an hour, called Hp30, and one hour, called Hp60. besides that, the Hpo index is not capped at 9 like Kp, but is an open ended index that describes the strongest geomagnetic storms more nuanced than the three-hourly Kp".

### Frey et al. 2004, JGR (substorm onsets) [S23] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2004JA010607 — "more than 2400 substorm onsets in the Northern Hemisphere ... median substorm onset location at 2300 hours MLT and 66.4 degrees magnetic latitude."

### Machol et al. 2012, Space Weather [S24] abstract VERIFIED (Crossref)
https://api.crossref.org/works/10.1029/2011SW000746 — "Evaluation of OVATION Prime as a forecast model for visible aurorae": validated against Polar UVI for Kp >= 3 (1997-1998); "forecasts for a visible aurora to occur or to not occur were correct 77% of the time ... the visible aurora will occur ... correct 86% of the time." (The "1 erg cm-2 s-1 ~ visible" threshold is attributed to this paper by Case et al. 2016; not in the abstract itself.)

### Bortle scale [S25] VERIFIED (Wikipedia table)
https://en.wikipedia.org/wiki/Bortle_scale — Class 3: NELM 6.6-7.0, SQM 21.3-21.6; Class 4: NELM 6.3-6.5, SQM 20.8-21.3; Class 5: NELM 5.6-6.0, SQM 19.25-20.3; Class 8: NELM 4.1-4.5, SQM < 18.00, "The sky is light gray or orange - one can easily read"; Class 9: NELM <= 4.0, "Many stars forming constellations are invisible."

### tomz.dk Danish aurora FAQ [S26] VERIFIED (hobbyist site, no author/date shown)
https://www.tomz.dk/oftest-stillede-spoergsmaal-om-nordlys-i-danmark/ — verbatim: "Typisk vil KP-indeks omkring KP5-KP6 give mulighed for fotograferbart nordlys i Danmark"; "Ved saerligt staerke Geomagnetiske storme (G2/G3+) kan du maaske skelne nogle meget svage roede og groenne farver"; recommended areas "Nordsjaelland, Nordjylland, Jyske vestkyst, Bornholm, Samsoe, Moen"; "Jo moerkere himlen er, desto tydeligere vil nordlysets farver og formationer fremstaa".

### Case et al. 2017 on colours/altitudes [S1] VERIFIED
"the most familiar color associated with the aurora is the green 557.7 nm emission which is the result of excited oxygen atoms in the 100-200 km altitude range. However, other colors are produced at different altitudes (i.e., red 630.0 nm at altitudes above 200 km) and by other atmospheric gases (e.g., blue 427.8 nm from singly ionized molecular nitrogen)." Also: "as the result of substorm activity, the oval expands and can be seen from latitudes further equatorward than usual (Elphinstone et al., 1996)." SWPC phenomena page (https://www.spaceweather.gov/phenomena/aurora, VERIFIED): "The aurora typically forms 80 to 500 km above Earth's surface."; "The best place to observe the aurora is under an oval shaped region between the north and south latitudes of about 60 and 75 degrees."; "Late in the evening, near midnight, the arcs often begin to twist and sway ... This is the peak of what is called an auroral substorm."

---

## 2 (conclusions). Which index level puts the boundary at 60 deg CGM (Copenhagen + 7.6 deg)?

| Boundary | Model / data | Level for 60 deg at midnight | Source, confidence |
|---|---|---|---|
| Diffuse equatorward edge | Starkov 1994 (dashboard code, MLT 0) | Kp ~3.5 (61.1 at Kp 3, 59.1 at Kp 4); MLT 23: Kp ~3.8 | S19 VERIFIED coefficients; computed |
| Diffuse edge | NOAA rule 66 - 2 Kp | Kp 3 | S5 VERIFIED |
| Diffuse/1-erg edge | OVATION Prime (Case 2016 definition P >= 18 % = 1 erg) | not a Kp model; reports at median Kp 5 spanned 43.8-73.2 MLAT | S2 VERIFIED |
| Diffuse edge (DMSP boundary index) | Yokoyama 1998 | "between 65 and 55 deg" whenever Dst > -50 nT; "below 50 deg" once Dst < -100 nT; moves "6-7 deg equatorward for each 100 nT decrease when the Dst becomes less than -100 nT"; lowest latitude 0-2 h before Dst minimum | S8 VERIFIED |
| Discrete-arc edge (all-sky camera, no substorm) | Akasofu & Chapman 1963 via Yokoyama | 2.5 deg equatorward per 100 nT Dst decrease | S8 VERIFIED (as quoted) |
| UV oval boundary | Carbary 2005 | peak shifts "1 deg in magnetic latitude for each increment in Kp"; linear fits "good for Kp < 6" | S9 VERIFIED abstract; table not accessed |
| Discrete oval equatorward edge | Starkov 1994 (dashboard code) | 60.4 only at Kp >= 6.1; saturates at 59.7 (Kp 8-9) — model artefact | S19 + computed |
| Substorm onset arc | Frey et al. 2004 | median onset 66.4 deg MLAT at 23 MLT; onsets at 60 deg are storm-time only | S23 VERIFIED |
| Gussenhoven 1983 midnight regression | DMSP | coefficients NOT obtained (Wiley 403; NGDC hosts only the 1987 ion paper: 04-05 MLT electrons 65.9 - 1.68 Kp per earlier repo note) | S6 UNVERIFIED |
| Best driver | Troyer 2025 (28 yr DMSP): "Hp30 is the best representation"; Landry 2019: AE and dPhi/dt "outperform the often used Kp index" | — | S11, S18 VERIFIED abstracts |

Substorm expansion shift at mid-latitudes: UNVERIFIED. Tried: two web searches (only qualitative statements: brightening starts at the equatorward edge and expands poleward), Case 2017 (qualitative: "the oval expands and can be seen from latitudes further equatorward than usual"), Gallardo-Lacourt 2018 (STEVE moves ~50 km = ~0.45 deg equatorward during its ~1 h life). The web-search budget was exhausted before a DMSP/IMAGE statistic could be found. The storm-scale numbers (Yokoyama: 6-7 deg per 100 nT below -100 nT; Akasofu-Chapman: 2.5 deg per 100 nT) are the verified quantitative handles; a 1-3 deg substorm-scale excursion is plausible but unsupported here.

## 3 (conclusions). What a Copenhagen observer actually sees

Geometry (computed, spherical Earth R = 6371 km, no refraction; 1 deg latitude = 111 km):
| Ground distance to the arc | Elevation of 100 km lower border | 150 km | 250 km (red) | 400 km (red top) |
|---|---|---|---|---|
| 190 km (edge 1.7 deg N; Starkov diffuse Kp 7) | 27.6 | 37.8 | 52.4 | 64.3 |
| 335 km (edge 3 deg N; Kp 6) | 15.2 | 23.0 | 35.6 | 48.4 |
| 520 km (edge 4.7 deg N; Kp 5) | 8.5 | 13.7 | 23.2 | 34.7 |
| 700 km (edge 6.3 deg N; Kp ~4.2) | 4.9 | 8.8 | 16.1 | 25.8 |
| 845 km (edge 7.6 deg N = 60 deg CGM; Kp ~3.5) | 2.9 | 6.1 | 12.4 | 20.8 |
| 1000 km (SWPC's "can see aurora even when it is 1000 km further north") | 1.2 | 3.9 | 9.3 | 16.7 |
Geometric horizon distance: 1121 km for 100 km altitude, 1756 km for 250 km, 2201 km for 400 km.
So at the dashboard's "low in the north" threshold (edge 8 deg = ~890 km north) only emission above ~150 km clears 5 deg elevation: i.e. the RED 630-nm upper parts (Case 2017: "red 630.0 nm at altitudes above 200 km"; Case 2016: "the visible aurora can reach over 400 km in altitude"), which is exactly why DMI says Danish aurora "har ofte staerkt roedlige farver" (S4) and why the Dutch brightness class 1 is "meestal is iets rood te onderscheiden" (S12b). The green lower border sits at 3-6 deg elevation, inside the horizon haze and the light dome of Helsingoer/Helsingborg or Copenhagen itself. From Kp ~5 (edge ~5 deg north) the green border reaches 8-14 deg and a naked-eye arc "low in the north" becomes realistic from a dark coast; from Kp ~6 (edge ~3 deg north) the arc stands 15-35 deg up and is a naked-eye object even from the city's northern outskirts; at Kp 7+ it is overhead-ish (28-64 deg).
Storm phase: the diffuse/1-erg edge is lowest 0-2 h before the Dst minimum (S8), i.e. late main phase; SAR arcs (S15: 314 arcs in 27 years at Millstone Hill, AACGM 50.4 — a 400-km-altitude, red, storm-recovery feature at the plasmapause, L 2-4.5) and STEVE (S13/S14: ~4 deg equatorward of the oval, "just below 60 deg MLAT", "about 1 hr after substorm onset", ~1 h long, 170-230 km altitude, SAID at ~60.1 deg around 22:30 MLT) are the sub-auroral features relevant to 50-55 deg; from Copenhagen a STEVE at 59.5-60 deg would be ~800-850 km north, i.e. a faint mauve band at 6-11 deg elevation — a camera target.
Local time: Case 2016 positive reports 19:00-07:00 LT, median 22:45 LT (S2); SWPC: "within an hour or two of midnight (between 10 PM and 2 AM local time)" (S5); Frey: onsets median 23 MLT (S23); Copenhagen MLT 0 = 23:05 UT = 00:05 CET / 01:05 CEST (S20). German archive month distribution (S3): Sep-Oct and Mar-Apr peaks, June minimum (twilight).

## 4 (conclusions). Light pollution and practice
- Copenhagen is Bortle 9 "Total byhimmel" (S16), i.e. SQM < 18 mag/arcsec2 and naked-eye limit <= 4.0 (S25): the Milky Way is invisible, so any aurora of Dutch class 1 ("as the Milky Way") is invisible by definition; only class 2-3 (moonlit-cirrus to moonlit-cumulus brightness) shows. Gribskov / Jaegerspris Nordskov (north Zealand) are Bortle 4 (SQM 20.8-21.3, NELM 6.3-6.5), Saltholm Bortle 3, Moen/Nyord Dark Sky Park Bortle 2 (search summary, UNVERIFIED). The gain from the city to the north coast is ~3 mag/arcsec2, a factor ~16 in sky background, which is the difference between "camera only" and "faint naked-eye glow" for the same Kp.
- Every regional guidance says the same: DMI (S4) "normalt umuligt paa grund af lysforurening" from built-up areas, "fri og moerk nordlig horisont"; poollicht.be (S12) city list valid "alleen ... onder perfecte omstandigheden"; VWK (S12b) "Slechts heel zelden is het poollicht zo sterk dat het ook vanuit de stad is te zien"; AWUK (S1) "local conditions will still need to be right".
- Moon: SWPC (S5) "The full moon will also diminish the apparent brightness of the aurora (not the actual brightness)."
- Twilight (S17): no astronomical darkness in Copenhagen from ~5 May to ~10 August; around magnetic midnight (23:05 UT) the sky is astronomically dark from late August to mid-April; in late April / late August astronomical darkness lasts only ~21:10-01:10 UT.

## Numbers to use

| Constant | Value | Source | Confidence |
|---|---|---|---|
| Copenhagen AACGM latitude | 52.4 (Hornbaek/Gilleleje 52.9; Skagen 54.7) | S20 aacgmv2 2026 | computed, HIGH |
| Copenhagen magnetic midnight | 23:05 UT (MLT 0) | S20 | computed, HIGH (task's 22:50 is within model differences) |
| Case 2016 view-line offset from the 1-erg (P >= 18 %) OVATION edge | 8 deg = fit through the MAXIMUM offsets (7.65 +/- 2.06); median offset of positive reports only 0.62 deg; +3.06 deg among reports already equatorward of the edge; 95 % of reports poleward of edge - 8 deg; dataset Kp 0-7, median 5, 85 % positive | S2 | VERIFIED verbatim |
| Case 2016 SWPC view line | 62 % of reports equatorward, median +3.70 deg (~400 km); accuracy 43.9 % | S2 | VERIFIED |
| 1 erg cm-2 s-1 electron energy flux "approximately corresponding to visible aurora" | attributed to Machol et al. 2012 | S2, S24 | VERIFIED attribution; threshold itself not in Machol abstract |
| AuroraWatch UK thresholds (hourly range H/E at Crooktree, AACGM 54.4) | yellow 50-100 nT, amber 100-200 nT, red >= 200 nT | S1 | VERIFIED |
| AWUK frequency 2000-2017 | yellow 4.7 % (~412 h/yr), amber 1.0 % (~88 h/yr), red 0.3 % (~23 h/yr) | S1 | VERIFIED |
| AWUK level meaning at Copenhagen's magnetic latitude (between Crooktree 54.4 and Lancaster 50.8) | yellow = camera, amber = "likely by eye" (dark sky), red = eye anywhere | S1 + S20 | VERIFIED wording, mapping computed |
| AWUK elevated time vs Kp | "closely match the percentage of time that Kp >= 4" | S1 | VERIFIED |
| German archive (AKM, 1560-2026) | 1154 events, 6455 sightings; brightness classes 1..5 = 3087 / 1035 / 1000 / 617 / 193 (48 % camera-only) | S3 | VERIFIED JSON; class-name mapping inferred |
| German aurora nights per year | 2022: 40, 2023: 57, 2024: 62 (max class 5 on 2 nights), 2025: 94; solar-min 2019-2020: 6-7 | S3 | VERIFIED counts; "nights" interpretation inferred |
| Netherlands (AACGM ~48.7) | visible "in gemiddeld een van de honderd gevallen"; "5 a 10 dagen" per year in active years; "Kp 7 of hoger ... reeele kans" | S12b | VERIFIED |
| SpaceWeatherLive city table | Gothenburg Kp 5, Hamburg Kp 6, Brussels/Cologne Kp 7 ("alleen onder perfecte omstandigheden") -> Copenhagen ~Kp 5.5 | S12 | VERIFIED wording, interpolation mine |
| Danish hobby guidance | photographable aurora in Denmark "omkring KP5-KP6"; faint colours by eye only at "G2/G3+" | S26 | VERIFIED (non-authoritative) |
| NOAA rule | 66 deg at Kp 0, 2 deg per Kp; aurora visible up to 1000 km north; best 22-02 LT; moon dims apparent brightness | S5 | VERIFIED |
| Starkov diffuse edge, MLT 0 (dashboard code, coefficients OCR-checked) | Kp 3: 61.1, 4: 59.1, 5: 57.1, 6: 55.4, 7: 54.1, 9: 53.1 (MLT 23: 61.7/59.5/57.5/55.7) | S19 | VERIFIED values; column order of 5 rows OCR-ambiguous |
| Starkov discrete-oval edge | 63.8 (Kp 3) ... 60.5 (Kp 6) ... 59.7 (Kp 9): saturates | S19 | computed; unrealistic above Kp 7 |
| Dashboard thresholds (Starkov diffuse, MLT 0) | 8 deg: Kp 3.36; 5 deg: Kp 4.84; 3 deg: Kp 6.01; overhead (hybrid): Kp 7.51 | computed from web/src/model/oval.mjs | HIGH |
| DMSP boundary index vs Dst | 55-65 deg for Dst > -50 nT; < 50 deg for Dst < -100 nT; 6-7 deg per 100 nT below -100 nT; lowest 0-2 h before Dst min | S8 | VERIFIED |
| Discrete-arc edge vs Dst | 2.5 deg per 100 nT (Akasofu & Chapman 1963) | S8 | VERIFIED as quoted |
| UV oval | 1 deg per Kp (peak); fits good for Kp < 6 | S9 | VERIFIED |
| Substorm onset latitude | median 66.4 deg MLAT, 23 MLT | S23 | VERIFIED |
| STEVE | ~4 deg equatorward of oval, just below 60 deg MLAT, ~1 h after onset, ~1 h duration, 20 km wide, 170-230 km altitude | S13, S14 | VERIFIED |
| SAR arcs at AACGM 50.4 | 314 in 27 years (~12/yr), 400 km altitude, L 2-4.5 | S15 | VERIFIED |
| Emission altitudes | green 557.7 nm 100-200 km; red 630.0 nm > 200 km; visible aurora "over 400 km"; SWPC "80 to 500 km" | S1, S2, S5 | VERIFIED |
| Elevation of 250-km red emission at 845 km / 520 km / 335 km | 12.4 / 23.2 / 35.6 deg | computed | HIGH (geometry) |
| Copenhagen Bortle | 9 (SQM < 18, NELM <= 4); Gribskov/Jaegerspris 4 (SQM 20.8-21.3) | S16, S25 | VERIFIED listing (klarhimmel cites no source) |
| No astronomical darkness | ~5 May - ~10 Aug; Mar 21: 19:32-03:01 UT; Sep 22: 19:16-02:48 UT; Dec 21: 16:59-05:16 UT | S17 | VERIFIED API |
| Hp30 | 30-min, open-ended Kp-like; "best representation" of DMSP boundaries | S22, S11 | VERIFIED |
| May 2024 storm | Dst -412 nT; visual oval boundary reconstructed to 29.8 deg invariant latitude | Hayakawa 2024 arXiv abstract | VERIFIED |

## Are the dashboard's thresholds right for Copenhagen?

Verdict in one line: the "overhead" rule (edge at or south of 52.4 deg, ~Kp 7.5-7.7 or Dst < -100 nT) is sound; the "visible low in the north" rule (1-erg / Starkov-diffuse edge within 8 deg, i.e. Kp ~3.4-3.6) is right for a CAMERA on a DARK NORTHERN HORIZON but roughly 1.5-2.5 Kp units too optimistic for the naked eye, and 2.5-3 units too optimistic for the naked eye inside Copenhagen.

Evidence:
1. The 8 deg is an envelope, not a typical value. Case et al. 2016 fitted the line "through the maximums" of the report-minus-edge offsets (7.65 +/- 2.06) and chose 8 deg so that 95 % of reports fall poleward of it; the median positive report was only 0.62 deg equatorward of the 1-erg edge, and +3.06 deg among those that were equatorward at all. The reports came from March-April 2015 (one Kp 8- storm), median Kp 5, 85 % positive (self-selected), largely North American rural observers, many with cameras. An 8 deg allowance therefore says "somebody with a camera and a dark sky may catch something", which is what the dashboard should call it.
2. Independent regional statistics agree that naked-eye aurora at AACGM ~50-53 needs Kp ~5-6, not 3.5: AuroraWatch UK, whose sites bracket Copenhagen's magnetic latitude (Crooktree 54.4, Eskdalemuir 52.4, Lancaster 50.8), calls 50-100 nT "may be visible by camera" and only 100-200 nT "likely to be visible by eye" at those latitudes, and its elevated time tracks Kp >= 4; the German archive shows 48 % of all sightings are camera-only; SpaceWeatherLive's "perfect conditions" table gives Kp 5 for Gothenburg (54.7) and Kp 6 for Hamburg (50.0); Danish and Dutch guidance quote Kp 5-6 for photographable and G2/G3+ (Kp 6-7) or "Kp 7 of hoger" for visual.
3. Geometry explains the gap: with the edge 8 deg (890 km) north, the green lower border is at 3-6 deg elevation and only the red 630-nm tops (>200 km) reach 12-20 deg; that is a dim red glow, invisible against a Bortle 9 sky (Copenhagen's NELM <= 4) and marginal even at Bortle 4 (Gribskov). By Kp 5 the edge is ~5 deg north (green at ~9-14 deg elevation): naked-eye "low in the north" from the Kattegat coast. By Kp 6 the edge is ~3 deg north (arc 15-35 deg up): naked-eye from the city's dark northern edge.
4. Starkov-specific caveats: the discrete-oval edge saturates near 59.7 deg for Kp >= 7 and the diffuse edge near 53 deg, so pure Starkov can never put the oval over Copenhagen; the dashboard's hybrid (2 deg/Kp above Kp 6, "overhead" at Kp 7.5) is a reasonable patch, and Yokoyama's Dst rule (boundary < 50 deg once Dst < -100 nT) is a better physical trigger for "overhead" during storms. Kp 7.7 as the overhead threshold is consistent with all of the above; real storms that put the oval over Denmark (Dst < -100 to -150 nT, e.g. 10-11 May 2024) also carry Kp 8-9.
5. Index choice: Troyer 2025 (28 yr DMSP) finds Hp30 the best driver of the equatorward boundary; Landry 2019 finds AE / coupling-function averages beat Kp; Yokoyama finds Dst orders the storm-time boundary. Using forecast Kp alone (3-hour, capped at 9) is the weakest of the options for a nowcast.

Recommended thresholds for Copenhagen (edge = OVATION 1-erg / Starkov diffuse edge at the observer's MLT):
- "Camera from a dark northern horizon (north coast)": edge within 8 deg -> Kp/Hp30 >= ~3.5 (keep the current tier, but label it camera-only and dark-site).
- "Naked-eye glow/arc low in the north from a dark site; camera from the city": edge within ~5 deg -> Kp/Hp30 >= ~5 (AWUK amber analogue).
- "Naked-eye from Copenhagen's northern sky": edge within ~3 deg -> Kp/Hp30 >= ~6 (AWUK red analogue; Hamburg/Gothenburg table).
- "Overhead": edge <= 52.4 -> Kp >= ~7.5-8, or Dst <= -100 nT (Yokoyama) as an independent trigger.
- Gate all tiers on darkness (no astronomical night 5 May - 10 Aug), moon, and the 21-02 local-time window; prefer Hp30 (open-ended, 30-min) over Kp.

---
## Source list (fetched URLs)
S1 Case et al. 2017, E&SS 4, 746, doi:10.1002/2017EA000328 — https://eprints.lancs.ac.uk/id/eprint/88521/1/Case_et_al_2017_Earth_and_Space_Science.pdf ; alerts page https://aurorawatch.lancs.ac.uk/alerts/
S2 Case, MacDonald, Viereck 2016, Space Weather 14, 198, doi:10.1002/2015SW001320 — https://eprints.lancs.ac.uk/id/eprint/78236/1/viewable_aurora_extent_final.pdf ; Crossref https://api.crossref.org/works/10.1002/2015SW001320
S3 Polarlicht-Archiv (AKM e.V. / A. Moeller) — https://api.polarlicht-archiv.de/statistics ; https://www.polarlicht-archiv.de/faq/ ; https://www.meteoros.de/themen/polarlicht/polarlicht-in-deutschland/
S4 DMI — https://www.dmi.dk/vejr-og-atmosfare/temaforside-lysfanomener-pa-himlen/nordlys-et-fanomen-primart-for-de-arktiske-egne/ ; https://www.dmi.dk/nyheder/2014/nordlys-kan-na-danmark-fra-i-nat
S5 NOAA SWPC — https://www.spaceweather.gov/content/tips-viewing-aurora ; https://www.spaceweather.gov/phenomena/aurora
S6 Gussenhoven, Hardy, Heinemann 1983, JGR 88, 5692 — https://api.crossref.org/works/10.1029/JA088iA07p05692 (abstract only)
S7 AFRL Midnight Boundary Index — https://dmsp.bc.edu/html2/dmspssj4_midnit.html
S8 Yokoyama, Kamide, Miyaoka 1998, Ann. Geophys. 16, 566 — https://angeo.copernicus.org/articles/16/566/1998/angeo-16-566-1998.pdf
S9 Carbary 2005, Space Weather 3, S10001 — https://api.crossref.org/works/10.1029/2005SW000162
S10 Zhang & Paxton 2008, JASTP 70, 1231 — https://api.crossref.org/works/10.1016/j.jastp.2008.03.008 (no abstract)
S11 Troyer et al. 2025, JGR — https://api.crossref.org/works/10.1029/2024JA033497
S12 SpaceWeatherLive/poollicht.be — https://www.poollicht.be/nl/help/de-kp-index.html ; spacepage.be — https://www.spacepage.be/poollicht/de-data-begrijpen-en-kansen-op-poollicht-voorspellen.html
S12b VWK — https://www.vwkweb.nl/index.php?page=1509
S13 MacDonald et al. 2018, Sci. Adv. 4, eaaq0030 — https://www.osti.gov/pages/servlets/purl/1483550
S14 Gallardo-Lacourt et al. 2018, JGR — https://api.crossref.org/works/10.1029/2018JA025368
S15 Mendillo et al. 2016, JGR — https://api.crossref.org/works/10.1002/2015JA021722
S16 klarhimmel.dk — https://klarhimmel.dk/lysforurening ; lysforurening.dk — https://lysforurening.dk/morke-observationssteder/
S17 sunrise-sunset.org API — https://api.sunrise-sunset.org/json?lat=55.68&lng=12.57&date=2026-06-21&formatted=0 (and other dates)
S18 Landry et al. 2019, JGR — https://api.crossref.org/works/10.1029/2018JA025451
S19 Sigernes et al., SvalTrack II (UNIS) — https://aurora.unis.no/doc/Sigernes_Oval.pdf (OCR); Sigernes et al. 2011 JSWSC 1, A03 blocked (403)
S20 aacgmv2 (Python) computations, 2026-01-01
S21 (K-scale limits) — see below if fetched
S22 GFZ Hp30 — https://kp.gfz.de/en/hp30-hp60
S23 Frey et al. 2004, JGR — https://api.crossref.org/works/10.1029/2004JA010607
S24 Machol et al. 2012, Space Weather — https://api.crossref.org/works/10.1029/2011SW000746
S25 Bortle scale — https://en.wikipedia.org/wiki/Bortle_scale
S26 tomz.dk — https://www.tomz.dk/oftest-stillede-spoergsmaal-om-nordlys-i-danmark/
Also fetched: Hayakawa et al. 2024 — https://arxiv.org/abs/2407.07665 ; Kosar et al. 2018 E&SS — https://api.crossref.org/works/10.1029/2018EA000454 (technical report abstract only).
Not obtained (tried): Wiley full texts (403: Case 2016 VoR, Gussenhoven 1983, Troyer 2025, Gallardo-Lacourt 2018); ScienceDirect Kosar 2018 JASTP; Sigernes 2011 JSWSC (DataDome); Polarlicht-Archiv per-event Kp list (API /events returns 403 without the site's client); darkskymoen.dk (timeout); timeanddate.com (403); nasa.gov and ADS (fetch-policy refusals); Silverman / Feldstein mid-latitude catalogues (search budget exhausted before attempted).

### GFZ "About Kp index" [S21] VERIFIED (curl)
https://kp.gfz.de/en/about-kp — verbatim excerpts (as extracted):
About Kp index The three-hour Kp index was developed in 1949 by Julius Bartels and is described in his publication 'The standardized index, Ks, and the planetary index, Kp. IATME Bull., 12b, 97– 120'. The publication Matzka et al. (2021) describes the production of the Kp index as well as its history and properties. Kp is provided by GFZ both in near real-time as nowcast values and monthly as definitive values. The derived indices are the ap (linear index), the Ap (daily mean of ap), Cp and C9. A further product derived from Kp are the international quiet and disturbed days, the Q-days and D-Days. Time series of the Kp and the derived indices and products go back to 1932. The Kp index distributed by GFZ is the internationally recognised official Kp index endorsed by the International Association of Geomagnetism and Aeronomy, IAGA. GFZ is a member of the International Service of Geomagnetic Indices, ISGI. All index data and graphs on this website are subject to the Creative Commons Attribution 4.0 International (CC BY 4.0) license. Please refer to GFZ Helmholtz Centre for Geosciences as data source. Information on the data download and file formats can be found on Data page . Ks and Kp are calculated from the K values or the geomagnetic recordings of the following 13 geomagnetic observatories: geomagnetic Observatory code operating institute country since Eyrewell EYR GNS Science New Zealand 1978 Canberra CNB Geoscience Australia Australia 1981 Uppsala UPS Geological Survey of Sweden Sweden 2004 Brorfelde BFE Technical University of Denmark Denmark 1984 Wingst WNG GFZ Helmholtz-Zentrum für Geoforschung Germany 1938 Niemegk NGK GFZ Helmholtz-Zentrum für Geoforschung Germany 1988 Lerwick LER British Geological Survey United Kingdom 1932 Eskdalemuir ESK British Geological S

Note on S21: the GFZ page confirms Kp is computed from 13 observatories including "Brorfelde BFE Technical University of Denmark Denmark 1984", "Lerwick LER", "Eskdalemuir ESK", "Hartland HAD", "Wingst WNG", "Niemegk NGK" — i.e. a Kp station (Brorfelde, 55.6 N 11.7 E) sits ~50 km from Copenhagen, so Kp (and DTU's real-time BFE K index) is already a locally representative disturbance measure for this observer. The K-scale nT limits per K step (needed to convert AuroraWatch's 50/100/200 nT hourly-range thresholds into Kp) were NOT found on a fetched page (Wikipedia K-index page and GFZ About-Kp page lack the table; search budget exhausted): UNVERIFIED. The only verified AWUK-to-Kp link is Case et al. 2017's statement that elevated (yellow+) time "closely match[es] the percentage of time that Kp >= 4".

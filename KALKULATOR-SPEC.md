# Preiskalkulator — Handoff & Spezifikation

Vollständige Referenz für den interaktiven Preiskalkulator im **Studio-Rack-Look** für
voiceoverfella.de. Diese Datei ist der Wissensstand, damit die Umsetzung **ohne** den
ursprünglichen Chat fortgeführt werden kann.

- **Fertige Demo:** `studio-rack-demo.html` (eigenständige HTML/CSS/JS-Datei, ein IIFE, keine Build-Tools).
- **Status:** Demo funktional komplett & getestet. **Noch offen:** Integration in `index.html` + Formular-Versand (Netlify Forms) + Fonts self-hosten.

---

## 1. Was der Kalkulator kann

Ein 19"-Rack-Konfigurator. Oben immer der **GENRE**-Streifen (3 Druckknöpfe, farbig:
**Allgemein = rot, Hörbuch = grün, Games = blau**). Je nach Genre baut sich darunter ein
anderer Satz Racks auf. Ganz unten immer das **PREIS**-Rack (Audio-Player-Optik): Transport-
Tasten links, blaues Digital-Display rechts. **Play** berechnet den Preis (zählt hoch,
Fortschrittsbalken, CALC-LED), **Stop** setzt zurück. Danach erscheinen **„Angebot anfragen"**
(rot, öffnet Modal) und **„Schnell per WhatsApp quatschen"** (grün, wa.me/491713473248).

### Genre-Pfade (Racks im `#stack`)
- **allgemein:** `NUTZUNGSRECHTE` (3 Kippschalter + blaues LCD mit Erklärung) · `LÄNGE` (horizontaler Fader, Minuten) · `NUTZUNGSDAUER · GEBIET` (kombiniert: Drehregler + vertikaler Fader mit Icons)
- **hoerbuch:** `LÄNGE` (großer Drehregler 0–30 Std + Wörter-Anzeige = Std×7500) · `VERARBEITUNG` (Kipp-Hebel gemastered/nicht)
- **games:** `TAKES` (4 Drehregler 0–9 → 4-stellige Zahl 0000–9999, je ein blaues 7-Segment-Fenster) · `AUFTEILUNG` (Kipp-Hebel: eine Datei für alle Takes / pro Take)

---

## 2. PREIS-FORMELN (das Wichtigste — exakt so implementiert)

Global: **Mindestpreis 100 €**, auf 2 Nachkommastellen gerundet.
`return Math.max(100, Math.round(price*100)/100)`

### ALLGEMEIN
Faktoren: Jahr → 1 Jahr ×1 · 2 Jahre ×2 · ∞ ×3.  Gebiet → 1 Land ×1 · Europaweit ×2 · Weltweit ×3.

- **Privat:** `100 € × Minuten`  · Jahre **und** Gebiet werden **ignoriert**.
- **Unbezahlte Medien:** `Basis × Gebiet` · Jahre **ignoriert**.
  - Basis nach Minuten: `≤2 Min → 350` · `3–5 Min → 500` · `>5 Min → 500 + 100 × ((Min−5)/5)`
  - konkret: 10 Min → 600 · 20 Min → 800 · 30 Min → 1000
- **Bezahlte Medien:** `600 € × Jahr × Gebiet` · Minuten **ignoriert**.

Länge-Fader-Rasten (Minuten): `0,1,2,3,4,5,10,20,30`.

### HÖRBUCH
`Rate × Stunden` — Rate: **gemastered 400 €**, **nicht gemastered 350 €**. (Stunden = Regler 0–30.)

### GAMES
`100 € + Takes × Satz` — Satz: **alle Takes (eine Datei) 3 €**, **pro Take (einzelne Datei) 4,50 €**.
(Takes = 4-stellige Zahl der vier Regler, 0000–9999.)

### Verifizierte Testfälle
| Genre | Auswahl | Preis |
|---|---|---|
| Privat | 5 Min (∞ egal) | 500 |
| Unbezahlt | 10 Min · Weltweit | 1.800 |
| Unbezahlt | 30 Min · 1 Land | 1.000 |
| Unbezahlt | 2 Min · 1 Land | 350 |
| Bezahlt | 2 Jahre · Europaweit | 2.400 |
| Hörbuch | 5 Std · gemastered | 2.000 |
| Hörbuch | 5 Std · nicht gemastered | 1.750 |
| Games | 90 Takes · alle Takes | 370 |
| Games | 90 Takes · pro Take | 505 |

---

## 3. Implementierung (in `studio-rack-demo.html`)

- **`currentGenre`** (Variable, in `buildGenre(key)` gesetzt) merkt das aktive Genre.
- **`computePrice()`** liest den Zustand per DOM und rechnet nach obigen Formeln. Gelesene Elemente:
  - Nutzungsrecht: `#stack .rocker.on .lbl`
  - Minuten: `#stack .fader .tk.act .n`
  - Jahre: `#stack .duo .knob-wrap .klabel.act` ('1 JAHR'/'2 JAHRE'/'∞')
  - Gebiet: `#stack .duo .vtk.act .vn` ('1 LAND'/'EUROPAWEIT'/'WELTWEIT')
  - Hörbuch-Stunden: erstes `#stack .kreadout .kr-num`
  - Verarbeitung/Aufteilung: `#stack .lever-lbl.hot` (enthält 'NICHT' → nicht gemastered; enthält 'PRO TAKE' → 4,50)
  - Takes: alle `#stack .seg7-num` zusammengesetzt
- **`calc()`** (im PREIS-Rack): `const real=computePrice(); target = real ?? Zufall`. Balken füllen + Zahl hochzählen; `.cdd-num` zeigt Ergebnis (Format `de-DE`, 2 Nachkommastellen).
- **Bausteine (Funktionen im IIFE):** `chassis`, `makeVU`/`vuLoop`/`vuKick` (ruhige VU-Nadeln), `pushGroup(options,onchange,colors)`, `rockerGroup(options,active,onchange)`, `nutzungsrechte()` (+ blaues `.lcd`), `fader(ticks,unit)`, `vfader(ticks[{n,icon}])`, `knob(detents,{big,sweepStart,sweepEnd,unit,labelEvery,readout,readout2,showLabels,onchange,knobPx,stagePx,initial})`, `dauerGebiet()`, `takesControl()`, `lever(topLabel,botLabel)` (kippt via `rotateX` oben/unten), `buildCalcRack()`, `buildGenre(key)`, `collectSettings()`, Modal-Block.
- **Transport-Tasten:** Play (`.tbtn.play`, rot, = Berechnen), Stop (`.tbtn.stop`, = Reset). Rewind/Pause/Forward/Record haben Klasse `deco` (ausgegraut, `pointer-events:none`, ohne Funktion).

---

## 4. Angebots-Modal („Angebot anfordern")

- Öffnet über den roten Button nach der Berechnung. Zeigt oben Badge **„⚡ Antwort innerhalb von 8 Stunden"**.
- Block **„Deine Konfiguration"** = `collectSettings()` liest die aktuellen Rack-Werte automatisch aus.
- Felder: **Vorname\*, Name\*, Firma, PLZ\*, Straße\***, **Skript** (Textarea **„oder"** Datei-Upload PDF/Word/TXT), **Kostenlose Demo?** (Ja/Nein-Toggle).
- Unten Badge **„🎁 Kostenlose Demo innerhalb von 24 Stunden"** (bezieht sich auf die Demo, nicht aufs Audio).
- Pflichtfelder mit rotem `*` + Hinweis „* Pflichtfeld"; Validierung markiert leere Felder.
- Absenden baut Text-Zusammenfassung (Kontakt + Konfiguration + Skript + Dateiname + Demo-Wunsch) → **`mailto:contact@voiceoverfella.com`** (Demo-Weg). **Der berechnete Preis ist aktuell NICHT in der Zusammenfassung** (optional ergänzen).

---

## 5. OFFENE TO-DOs für die Live-Integration in `index.html`

1. **Kalkulator einbauen:** Markup + CSS + JS aus `studio-rack-demo.html` in `index.html` übernehmen (als eigener Abschnitt, z. B. „Preis berechnen"). Platzierung mit Dominik klären.
2. **Fonts self-hosten:** `VT323` (Digital) und `Caveat` (Handschrift) lokal in `fonts/` legen + in `fonts.css` einbinden, den **Google-Fonts-CDN-`<link>` entfernen** (DSGVO — Rest der Seite ist bereits Google-frei self-hosted). Bestehende self-hosted Fonts: Bricolage Grotesque, Archivo, Space Mono.
3. **Formular auf Netlify Forms umstellen** (Seite liegt auf Netlify): `data-netlify="true"`, `enctype="multipart/form-data"`, verstecktes `form-name` + Honeypot, Datei-Upload-Feld, verstecktes Feld mit Konfig-Zusammenfassung **+ berechnetem Preis** (per JS befüllen). E-Mail-Benachrichtigung an `contact@voiceoverfella.com` im Netlify-Dashboard aktivieren → Versand inkl. Anhang läuft dann automatisch (kein `mailto` mehr nötig).
4. **Preis in die Zusammenfassung** aufnehmen (Modal + Netlify-Feld).
5. **Responsive-Check:** Racks wrappen auf schmalen Screens (`.duo` stapelt, `.transport`/`.takes` wrappen) — auf Mobile prüfen.

---

## 6. Design-Tokens (aus dem Website-CSS)
`--paper #F4ECDD` · `--paper-soft #EFE4CF` · `--ink #18121E` · `--ink-soft #241B2E` ·
`--red #FF3D2E` · `--red-deep #D92A1C` · `--amber #FFB52E` · `--off #FFFDF7`.
Genre-Farben: Allgemein `#FF3D2E` · Hörbuch `#2EC16B` · Games `#3A8DFF`.
Digital-Displays: weiße Pixel-Schrift (VT323) auf Blau (`#3238c4`→`#1b1f8e`) mit Scanline-Overlay.
Fonts: Display **Bricolage Grotesque** · Body **Archivo** · Labels **Space Mono** · Digital **VT323** · Handschrift **Caveat**.

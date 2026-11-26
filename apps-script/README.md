# Lebenskompass mit SOS (Google Apps Script)

Dieselbe App wie die Supabase-Variante (Branch `app-v1`), aber als Apps-Script-Web-App mit Google Sheet als Datenbasis.

## Einrichtung im bestehenden Lebenskompass-Projekt
1. Das Apps-Script-Projekt des Lebenskompass öffnen.
2. Den Inhalt von `Code.gs`, `Index.html`, `Styles.html` und `App.html` jeweils komplett ersetzen.
3. Optional: neue Skriptdatei `Datenuebernahme` anlegen (nicht im Repository, enthält persönliche Daten) und einmal `datenUebernehmen` ausführen.
4. **Projekteinstellungen → Skript-Eigenschaften**: `GEMINI_API_KEY` mit deinem Gemini-Schlüssel anlegen (optional `GEMINI_MODEL`, Standard `gemini-2.5-flash`).
5. **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Neue Version → Bereitstellen**.

Das vorhandene Daten-Sheet wird weiter genutzt. Neue Tabellenblätter (Skills, SkillLog, Dankbarkeit, CheckIns, Fruehwarnzeichen, FwEintraege, FwEinstellungen) und neue Spalten legt die App selbst an.

## Erinnerungen
In der App unter Einstellungen → Erinnerungen einschalten. Das legt einen stündlichen Zeit-Trigger an, der die Mails zu den gewählten Zeiten schickt. Links in der Mail führen direkt zum Check-in, zur Dankbarkeit oder zum Wochenrückblick.

## Menü
Unten: Heute, Kompass, SOS, Frühwarnzeichen, Rückblick. Die Einstellungen liegen als Zahnrad oben rechts.

## Frühwarnzeichen
Eigene Zeichen mit Bereich, „Woran ich es merke“, Gewicht (1 bis 3), Alarm, Hilfe-Schritten und Skill, auf Wunsch mit KI formuliert. Die App zählt die Punkte der letzten Tage und zeigt eine von drei Stufen: Stabil (Welle), Achtsam (Dreieck) und Handeln (Raute), immer mit Symbol und Wort statt nur Farbe.

| Tabellenblatt | Inhalt |
|---|---|
| `Fruehwarnzeichen` | id, name, kategorie, woran, gewicht, alarm, hilfe (ein Schritt pro Zeile), skill, auto (schlaf, anspannung oder leer), reihenfolge |
| `FwEintraege` | eine Zeile pro Tag: datum und die angetippten Zeichen (IDs, durch Komma getrennt) |
| `FwEinstellungen` | eine Zeile „einstellungen“: Grenzen (achtsam, handeln, tage) und Kontakte (person, personNr, praxis, praxisNr) |

Direktlink: `?v=fwz`.

## Ohne blauen Google-Hinweis (Hülle auf GitHub Pages)
Öffnet man die `/exec`-Adresse direkt, blendet Google oben „Diese Anwendung wurde von einem Google Apps Script-Nutzer erstellt“ ein. Die Hülle im Ordner `kompass/` bettet die App stattdessen ein, dann ist der Hinweis weg.

- `Code.gs` erlaubt das Einbetten (`XFrameOptionsMode.ALLOWALL`).
- Die Bereitstellung steht auf **Zugriff: Jeder**, damit das Einbetten auch auf dem iPhone klappt (Safari schickt in eingebetteten Seiten keine Google-Anmeldung mit). Geschützt ist die App dann durch einen geheimen Schlüssel (`APP_SCHLUESSEL` in den Skript-Eigenschaften, wird automatisch angelegt). Jeder Aufruf aus dem Browser läuft über `api()` und prüft ihn. Du selbst kommst angemeldet auch ohne Schlüssel hinein.
- In den Skript-Eigenschaften `APP_ID` mit der Bereitstellungs-ID anlegen (Bereitstellen → Bereitstellungen verwalten, die lange ID). Im Editor liefert Google sonst die Test-Adresse (`/dev`), die nur angemeldet funktioniert.
- Den persönlichen Link bekommst du im Editor mit `linkOhneBanner` (steht im Ausführungsprotokoll) oder in der App unter Zahnrad → Auf den Startbildschirm. Danach führen auch die Erinnerungs-Mails zur Hülle.
- Adresse der Hülle: `https://crank3ahead.github.io/HealthCoach/kompass/?a=…&k=…` (Konstante `APP.huelle` in `Code.gs`).
- Neuen Schlüssel erzwingen: `APP_SCHLUESSEL` in den Skript-Eigenschaften löschen, dann `linkOhneBanner` erneut ausführen.

# Lebenskompass mit SOS (Google Apps Script)

Dieselbe App wie die Supabase-Variante (Branch `app-v1`), aber als Apps-Script-Web-App mit Google Sheet als Datenbasis.

## Einrichtung im bestehenden Lebenskompass-Projekt
1. Das Apps-Script-Projekt des Lebenskompass öffnen.
2. Den Inhalt von `Code.gs`, `Index.html`, `Styles.html` und `App.html` jeweils komplett ersetzen.
3. Optional: neue Skriptdatei `Datenuebernahme` anlegen (nicht im Repository, enthält persönliche Daten) und einmal `datenUebernehmen` ausführen.
4. **Projekteinstellungen → Skript-Eigenschaften**: `GEMINI_API_KEY` mit deinem Gemini-Schlüssel anlegen (optional `GEMINI_MODEL`, Standard `gemini-2.5-flash`).
5. **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Neue Version → Bereitstellen**.

Das vorhandene Daten-Sheet wird weiter genutzt. Neue Tabellenblätter (Skills, SkillLog, Dankbarkeit, CheckIns) und neue Spalten legt die App selbst an.

## Erinnerungen
In der App unter Einstellungen → Erinnerungen einschalten. Das legt einen stündlichen Zeit-Trigger an, der die Mails zu den gewählten Zeiten schickt. Links in der Mail führen direkt zum Check-in, zur Dankbarkeit oder zum Wochenrückblick.

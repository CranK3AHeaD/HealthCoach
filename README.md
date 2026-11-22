# Lebenskompass

Lebenskompass und Notfall-Coach in einer App: Regeln nach Lebensbereichen, Notfall-Skills mit SOS-Ansicht, Anspannung tracken, Dankbarkeit, Check-ins und Wochenrückblick. Die KI-Hilfe läuft über Gemini.

Die App ist eine Web-App (PWA). Sie läuft im Browser, lässt sich auf dem Handy zum Home-Bildschirm hinzufügen und funktioniert auch offline. Die Daten liegen in Supabase, jeder sieht nur seine eigenen Einträge.

## Einrichtung (einmalig)

### 1. Datenbank anlegen
1. Supabase öffnen, Projekt wählen, links **SQL Editor**.
2. Den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und **Run** drücken.

### 2. Anmeldung einstellen
1. **Authentication → URL Configuration**: bei **Site URL** die Adresse der App eintragen (zum Beispiel `https://crank3ahead.github.io/HealthCoach/`) und dieselbe Adresse auch unter **Redirect URLs** hinzufügen.
2. **Authentication → Sign In / Providers → Email**: aktiviert lassen. Wer nicht per Mail bestätigen will, kann „Confirm email“ ausschalten.

### 3. KI-Funktion (Gemini) einrichten
1. **Edge Functions → Deploy a new function → Via Editor**.
2. Name: `ki`. Den Inhalt von [`supabase/functions/ki/index.ts`](supabase/functions/ki/index.ts) einfügen.
3. In den Einstellungen der Funktion **Verify JWT** ausschalten (die Funktion prüft die Anmeldung selbst).
4. **Edge Functions → Secrets**: neuen Eintrag `GEMINI_API_KEY` mit deinem Gemini-Schlüssel anlegen. Optional `GEMINI_MODEL` (Standard: `gemini-2.5-flash`).

Der Gemini-Schlüssel steht nur in Supabase, nie im Code.

### 4. Konto anlegen und Daten übernehmen
1. Die App öffnen und **Konto anlegen**.
2. Danach im SQL Editor die Datei `datenuebernahme.sql` ausführen (liegt nicht im Repository, weil sie persönliche Daten enthält). Sie trägt deine Skills, Einträge und Regeln aus den Google Sheets ein und kann gefahrlos mehrfach laufen.

### 5. Aufs Handy
- **iPhone**: Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- **Android**: in Chrome öffnen → Menü → „App installieren“.

## Am Rechner bearbeiten
Alle Listen (Regeln, Skills, Bereiche, Situationen, Einträge) lassen sich in Supabase unter **Table Editor** wie eine Tabelle bearbeiten. Änderungen erscheinen beim nächsten Öffnen der App.

## Aufbau
| Datei | Inhalt |
|---|---|
| `index.html`, `css/app.css`, `js/app.js` | die App |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb und Installation |
| `supabase/schema.sql` | Tabellen und Zugriffsschutz |
| `supabase/functions/ki/` | Server-Funktion für Gemini |
| `.github/workflows/pages.yml` | Veröffentlichung über GitHub Pages |

Der Supabase-Schlüssel in `js/app.js` ist der öffentliche „publishable“ Schlüssel. Er darf im Code stehen; die Daten schützt der Zugriffsschutz (Row Level Security) in der Datenbank.

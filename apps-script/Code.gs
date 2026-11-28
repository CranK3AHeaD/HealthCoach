/**
 * Lebenskompass mit SOS – Server (Google Apps Script)
 * Daten liegen in einem Google Sheet. Gibt es noch keins, wird es beim ersten Start angelegt.
 * KI über Gemini: Schlüssel in den Skript-Eigenschaften als GEMINI_API_KEY (optional GEMINI_MODEL, Standard gemini-3.5-flash-lite wie im Notfall-Coach).
 * Erinnerungen per Mail über einen stündlichen Zeit-Trigger.
 */

const APP = {
  titel: 'Lebenskompass',
  icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9ed/512.png',
  sheetName: 'Lebenskompass – Daten',
  // Hülle ohne Google-Banner (GitHub Pages, Ordner kompass/ im Repository)
  huelle: 'https://crank3ahead.github.io/HealthCoach/kompass/'
};

const SCHEMA = {
  Bereiche:    ['id', 'name', 'farbe', 'symbol', 'reihenfolge'],
  Situationen: ['id', 'name', 'symbol', 'reihenfolge'],
  Werte:       ['id', 'name', 'beschreibung', 'reihenfolge'],
  Regeln:      ['id', 'titel', 'kernsatz', 'warum', 'schritte', 'vorlagen', 'skills', 'bereichId',
                'situationen', 'werte', 'status', 'favorit', 'erstellt', 'geaendert'],
  Reflexionen: ['id', 'regelId', 'datum', 'wirkung', 'notiz'],
  Skills:      ['id', 'titel', 'kategorie', 'ansatz', 'einsatz', 'dauer', 'von', 'bis', 'diskret',
                'material', 'hinweis', 'favorit', 'schritte', 'wirkung', 'ausloeser', 'quelle', 'status'],
  SkillLog:    ['id', 'skillId', 'datum', 'vorher', 'nachher', 'sterne', 'notiz', 'ausloeser'],
  Dankbarkeit: ['id', 'datum', 'nr', 'text'],
  GutGemacht:  ['id', 'datum', 'nr', 'text'],
  CheckIns:    ['id', 'datum', 'art', 'schlaf', 'energie', 'stimmung', 'tag', 'notiz'],
  Fruehwarnzeichen: ['id', 'name', 'kategorie', 'woran', 'gewicht', 'alarm', 'hilfe', 'skill', 'auto', 'reihenfolge'],
  FwEintraege: ['id', 'datum', 'zeichen'],
  FwEinstellungen: ['id', 'achtsam', 'handeln', 'tage', 'person', 'personNr', 'praxis', 'praxisNr']
};

const SCHEMA_VERSION = '5';

const ZIELE = ['kompass', 'sos', 'dank', 'woche', 'rueckblick', 'checkin', 'fwz', 'gut'];

/* ---------- Web-App ---------- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!zugang_(p.k)) {
    return HtmlService.createHtmlOutput(
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<div style="font-family:Georgia,serif;max-width:420px;margin:15vh auto;padding:0 20px;line-height:1.5;color:#E9E4D8;background:#07090E">' +
      '<h2 style="font-weight:400">Lebenskompass</h2>' +
      '<p>Dieser Link ist nicht vollständig. Öffne die App bitte über das Symbol auf deinem Home-Bildschirm oder über den Link aus deiner Erinnerungs-Mail.</p></div>')
      .setTitle(APP.titel)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const t = HtmlService.createTemplateFromFile('Index');
  t.start = JSON.stringify({
    view: ZIELE.indexOf(p.v) > -1 ? p.v : '',
    param: (p.p === 'morgen' || p.p === 'abend') ? p.p : null,
    k: p.k ? String(p.k) : ''
  });
  const out = t.evaluate()
    .setTitle(APP.titel)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    // erlaubt das Einbetten in die Hülle ohne Google-Banner
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  try { out.setFaviconUrl(APP.icon); } catch (err) { /* Icon ist optional */ }
  return out;
}

/* ---------- Zugang ---------- */
/* Steht die Bereitstellung auf „Jeder“, braucht jeder Aufruf den geheimen Schlüssel.
   Du selbst (angemeldet, z. B. bei „Nur ich“) kommst immer hinein. */

function schluessel_() {
  const props = PropertiesService.getScriptProperties();
  let k = props.getProperty('APP_SCHLUESSEL');
  if (!k) {
    k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('APP_SCHLUESSEL', k);
  }
  return k;
}

function istBesitzer_() {
  let ich = '', aktiv = '';
  try { ich = Session.getEffectiveUser().getEmail(); } catch (err) {}
  try { aktiv = Session.getActiveUser().getEmail(); } catch (err) {}
  return !!ich && !!aktiv && ich === aktiv;
}

function zugang_(k) {
  if (istBesitzer_()) return true;
  const soll = PropertiesService.getScriptProperties().getProperty('APP_SCHLUESSEL');
  return !!soll && typeof k === 'string' && k.length === soll.length && k === soll;
}

/** Einziger Eingang für die App im Browser: prüft den Schlüssel und ruft dann die Funktion auf. */
function api(k, fn, args) {
  if (!zugang_(k)) throw new Error('Kein Zugang. Öffne die App über deinen Home-Bildschirm-Link.');
  const ERLAUBT = {
    ladeAlles: ladeAlles_, speichere: speichere_, loesche: loesche_, ki: ki_,
    speichereErinnerung: speichereErinnerung_, testErinnerung: testErinnerung_, linkOhneBanner: linkOhneBanner
  };
  if (!Object.prototype.hasOwnProperty.call(ERLAUBT, fn)) throw new Error('Unbekannte Funktion');
  return ERLAUBT[fn].apply(null, Array.isArray(args) ? args : []);
}

/** Adresse der Hülle mit deiner App-Adresse und dem Schlüssel. */
function huellenLink_() {
  // Im Editor liefert getUrl() oft die Test-Adresse (/dev), die nur angemeldet funktioniert.
  // Darum zählt zuerst die Bereitstellungs-ID aus den Skript-Eigenschaften (APP_ID).
  const props = PropertiesService.getScriptProperties();
  let id = String(props.getProperty('APP_ID') || '').trim();
  if (/\/dev\b/.test(id)) throw new Error('APP_ID: Bitte die Bereitstellungs-ID oder die /exec-Adresse eintragen, nicht die Test-Adresse (/dev).');
  const m = id.match(/\/macros\/s\/([A-Za-z0-9_-]+)/);
  if (m) id = m[1]; // auch eine ganze /exec-Adresse ist erlaubt
  if (!id) {
    const url = ScriptApp.getService().getUrl() || '';
    const u = url.match(/\/macros\/s\/([A-Za-z0-9_-]+)\/exec/);
    if (!u) throw new Error('Bitte in den Skript-Eigenschaften APP_ID mit der Bereitstellungs-ID anlegen (Bereitstellen → Bereitstellungen verwalten).');
    id = u[1];
  }
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error('APP_ID sieht nicht wie eine Bereitstellungs-ID aus.');
  return APP.huelle + '?a=' + id + '&k=' + schluessel_();
}

/** Im Editor ausführen: Der Link für den Home-Bildschirm ohne Google-Banner steht dann im Ausführungsprotokoll. */
function linkOhneBanner() {
  const link = huellenLink_();
  PropertiesService.getScriptProperties().setProperty('HUELLE_AKTIV', 'ja');
  Logger.log('Dein Link ohne Banner (öffne ihn auf dem Handy und lege ihn auf den Home-Bildschirm):\n' + link);
  return link;
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ---------- Öffentliche Funktionen (vom Browser aufgerufen) ---------- */

function ladeAlles_() {
  const ss = db_();
  richteEin_(ss);
  const daten = { sheetUrl: ss.getUrl() };
  Object.keys(SCHEMA).forEach(function (t) { daten[t] = lies_(ss, t); });
  return daten;
}

function speichere_(tabelle, obj) {
  const spalten = schema_(tabelle);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = db_();
    const sh = ss.getSheetByName(tabelle);
    const kopf = kopf_(sh);
    const rec = {};
    spalten.forEach(function (c) {
      const v = obj && obj[c] != null ? obj[c] : '';
      rec[c] = String(v).slice(0, 20000);
    });
    if (!rec.id) rec.id = Utilities.getUuid();
    const jetzt = new Date().toISOString();
    if (tabelle === 'Regeln') {
      if (!rec.erstellt) rec.erstellt = jetzt;
      rec.geaendert = jetzt;
      if (!rec.status) rec.status = 'gilt';
    }
    if ((tabelle === 'Reflexionen' || tabelle === 'SkillLog') && !rec.datum) rec.datum = jetzt;

    const zeile = findeZeile_(sh, rec.id) || (sh.getLastRow() + 1);
    if (zeile > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
    const werte = kopf.map(function (c) { return rec[c] != null ? rec[c] : ''; });
    const alt = zeile <= sh.getLastRow() ? sh.getRange(zeile, 1, 1, kopf.length).getValues()[0] : null;
    if (alt) kopf.forEach(function (c, i) { if (spalten.indexOf(c) === -1) werte[i] = alt[i]; }); // fremde Spalten behalten
    sh.getRange(zeile, 1, 1, kopf.length).setNumberFormat('@').setValues([werte]);
    return rec;
  } finally {
    lock.releaseLock();
  }
}

function loesche_(tabelle, id) {
  schema_(tabelle);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = db_();
    entferne_(ss.getSheetByName(tabelle), 'id', id);
    if (tabelle === 'Regeln') entferne_(ss.getSheetByName('Reflexionen'), 'regelId', id);
    return id;
  } finally {
    lock.releaseLock();
  }
}

/** KI-Helfer über Gemini. Erwartet einen Prompt und liefert das JSON der Antwort. */
function ki_(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 100000) throw new Error('Ungültige Anfrage');
  const props = PropertiesService.getScriptProperties();
  const key = String(props.getProperty('GEMINI_API_KEY') || '').trim();
  if (!key) throw new Error('GEMINI_API_KEY fehlt in den Skript-Eigenschaften');
  const eigen = String(props.getProperty('GEMINI_MODEL') || '').trim();
  const modelle = (eigen ? [eigen] : []).concat(['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])
    .filter(function (m, i, a) { return a.indexOf(m) === i; });
  let letzter = '', ausgelastet = false;
  for (let i = 0; i < modelle.length; i++) {
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelle[i]) + ':generateContent', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    });
    const code = r.getResponseCode();
    const body = r.getContentText();
    if (code === 429) { ausgelastet = true; Utilities.sleep(700); continue; } // Kontingent erschöpft: nächstes Modell versuchen
    if (code === 404) { letzter = 'Modell ' + modelle[i] + ' nicht gefunden'; continue; }
    if (code === 500 || code === 503) { // überlastet: kurz warten, dann das nächste Modell
      letzter = 'Gemini ist gerade überlastet. Versuch es in ein paar Minuten noch einmal.';
      Utilities.sleep(700);
      continue;
    }
    if (code < 200 || code >= 300) {
      let msg = body;
      try { msg = JSON.parse(body).error.message; } catch (err) {}
      throw new Error('Gemini ' + code + ': ' + String(msg).slice(0, 300));
    }
    const j = JSON.parse(body);
    const kand = j.candidates && j.candidates[0];
    const parts = (kand && kand.content && kand.content.parts) || [];
    const text = parts.map(function (p) { return p.text || ''; }).join('').trim();
    if (!text) throw new Error('Gemini hat leer geantwortet' + (kand && kand.finishReason ? ' (' + kand.finishReason + ')' : ''));
    const roh = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(roh); } catch (err) { return { antwort: text }; }
  }
  if (ausgelastet) throw new Error('rate_limited');
  throw new Error(letzter.indexOf('überlastet') > -1 ? letzter : 'Gemini: ' + letzter);
}

/** Im Editor ausführen, um die KI zu prüfen. Das Ergebnis steht im Ausführungsprotokoll. */
function testeKI() {
  if (!istBesitzer_()) throw new Error('Nur im Editor');
  const r = ki_('Antworte nur mit JSON: {"antwort": "Die KI funktioniert."}');
  Logger.log(JSON.stringify(r));
}

/* ---------- Erinnerungen per Mail ---------- */

function speichereErinnerung_(eri) {
  const e = {
    morgen: !!eri.morgen, morgenZeit: zeit_(eri.morgenZeit, '07:30'),
    abend: !!eri.abend, abendZeit: zeit_(eri.abendZeit, '21:00'),
    woche: !!eri.woche, wocheZeit: zeit_(eri.wocheZeit, '18:00'),
    ansp: !!eri.ansp
  };
  PropertiesService.getUserProperties().setProperty('ERINNERUNG', JSON.stringify(e));
  const aktiv = e.morgen || e.abend || e.woche || e.ansp;
  const da = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'erinnerungTick'; });
  if (aktiv && !da.length) ScriptApp.newTrigger('erinnerungTick').timeBased().everyHours(1).create();
  if (!aktiv) da.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  return e;
}

function testErinnerung_() {
  sendeMail_('abend');
  return Session.getEffectiveUser().getEmail();
}

/** Läuft stündlich. Schickt jede Erinnerung höchstens einmal pro Tag. */
function erinnerungTick() {
  const roh = PropertiesService.getUserProperties().getProperty('ERINNERUNG');
  if (!roh) return;
  const e = JSON.parse(roh);
  const tz = Session.getScriptTimeZone() || 'Europe/Berlin';
  const jetzt = new Date();
  const stunde = +Utilities.formatDate(jetzt, tz, 'H');
  const tag = Utilities.formatDate(jetzt, tz, 'yyyy-MM-dd');
  const wochentag = +Utilities.formatDate(jetzt, tz, 'u'); // 7 = Sonntag
  const faellig = [];
  if (e.morgen && stunde === +e.morgenZeit.split(':')[0]) faellig.push('morgen');
  if (e.abend && stunde === +e.abendZeit.split(':')[0]) faellig.push('abend');
  if (e.woche && wochentag === 7 && stunde === +e.wocheZeit.split(':')[0]) faellig.push('woche');
  if (e.ansp && [11, 15, 18].indexOf(stunde) > -1) faellig.push('ansp' + stunde);
  const props = PropertiesService.getUserProperties();
  faellig.forEach(function (art) {
    const k = 'GESENDET_' + art;
    if (props.getProperty(k) === tag) return;
    sendeMail_(art.indexOf('ansp') === 0 ? 'ansp' : art);
    props.setProperty(k, tag);
  });
}

function sendeMail_(art) {
  const url = ScriptApp.getService().getUrl();
  if (!url) throw new Error('Die Web-App ist noch nicht bereitgestellt.');
  // Ist die Hülle eingerichtet, führen die Links dorthin (ohne Banner, mit Schlüssel)
  const basis = PropertiesService.getScriptProperties().getProperty('HUELLE_AKTIV') === 'ja' ? huellenLink_() + '&' : url + '?';
  const link = function (v, p) { return basis + 'v=' + v + (p ? '&p=' + p : ''); };
  const TEXT = {
    morgen: ['Guten Morgen', 'Wie hast du geschlafen, und wie startest du in den Tag?', [['Morgen-Check-in', link('checkin', 'morgen')], ['Anspannung eintragen', link('kompass')]]],
    abend: ['Wie war dein Tag?', 'Guten Abend. Nimm dir eine Minute für dich: Wie geht es dir gerade, wofür bist du heute dankbar, und was hast du gut gemacht?', [['Abend-Check-in', link('checkin', 'abend')], ['Dankbarkeit', link('dank')], ['Gut gemacht', link('gut')], ['Anspannung eintragen', link('kompass')]]],
    woche: ['Dein Wochenrückblick', 'Die Woche ist fast vorbei. Schau mit ruhigem Blick zurück: Was hat dir gutgetan?', [['Wochenrückblick', link('woche')]]],
    ansp: ['Kurz innehalten', 'Wie angespannt bist du gerade, von 0 bis 10?', [['Anspannung eintragen', link('kompass')], ['SOS', link('sos')]]]
  }[art];
  const knoepfe = TEXT[2].map(function (k) {
    return '<a href="' + k[1] + '" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 16px;border-radius:999px;background:#C9A45C;color:#07090E;text-decoration:none;font-weight:600">' + k[0] + '</a>';
  }).join('');
  const html = '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1d1f24;max-width:520px">' +
    '<p style="font-size:20px;margin:0 0 8px">' + TEXT[0] + '</p><p>' + TEXT[1] + '</p><p>' + knoepfe + '</p>' +
    '<p style="font-size:12px;color:#777">Erinnerungen änderst du in der App unter Einstellungen.</p></div>';
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Lebenskompass: ' + TEXT[0],
    htmlBody: html,
    body: TEXT[1] + '\n\n' + TEXT[2].map(function (k) { return k[0] + ': ' + k[1]; }).join('\n'),
    name: 'Lebenskompass'
  });
}

/* ---------- Interne Helfer ---------- */

function zeit_(v, standard) { return /^\d{1,2}:\d{2}$/.test(String(v || '')) ? String(v) : standard; }

function schema_(tabelle) {
  const s = SCHEMA[tabelle];
  if (!s) throw new Error('Unbekannte Tabelle: ' + tabelle);
  return s;
}

function db_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty('SHEET_ID');
  if (id) {
    // Ein bereits verknüpftes Sheet nie still ersetzen: lieber einen Fehler zeigen, die Daten bleiben dort.
    try { ss = SpreadsheetApp.openById(id); } catch (e) {
      throw new Error('Dein Daten-Sheet lässt sich gerade nicht öffnen. Versuch es gleich noch einmal. (' + String(e && e.message || e).slice(0, 200) + ')');
    }
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  }
  if (!ss) ss = SpreadsheetApp.create(APP.sheetName);
  if (props.getProperty('SHEET_ID') !== ss.getId()) props.setProperty('SHEET_ID', ss.getId());
  if (props.getProperty('SCHEMA') !== SCHEMA_VERSION) {
    richteEin_(ss);
    props.setProperty('SCHEMA', SCHEMA_VERSION);
  }
  return ss;
}

function richteEin_(ss) {
  Object.keys(SCHEMA).forEach(function (t) {
    const spalten = SCHEMA[t];
    let sh = ss.getSheetByName(t);
    if (!sh) {
      sh = ss.insertSheet(t);
      sh.getRange(1, 1, 1, spalten.length).setValues([spalten]).setFontWeight('bold');
      sh.getRange(1, 1, sh.getMaxRows(), spalten.length).setNumberFormat('@');
      sh.setFrozenRows(1);
      return;
    }
    // Fehlende Spalten ergänzen
    const kopf = kopf_(sh);
    spalten.forEach(function (c) {
      if (kopf.indexOf(c) === -1) {
        const col = kopf.length + 1;
        if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
        sh.getRange(1, col).setValue(c).setFontWeight('bold');
        sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
        kopf.push(c);
      }
    });
  });
  const leer = ss.getSheetByName('Tabellenblatt1') || ss.getSheetByName('Sheet1');
  if (leer && ss.getSheets().length > 1 && leer.getLastRow() === 0) ss.deleteSheet(leer);
}

function kopf_(sh) {
  const k = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  while (k.length && k[k.length - 1] === '') k.pop();
  return k;
}

function lies_(ss, tabelle) {
  const sh = ss.getSheetByName(tabelle);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const breite = sh.getLastColumn();
  const werte = sh.getRange(1, 1, last, breite).getValues();
  const kopf = werte.shift().map(String);
  return werte
    .filter(function (r) { return r[0] !== '' && r[0] != null; })
    .map(function (r) {
      const o = {};
      SCHEMA[tabelle].forEach(function (c) {
        const i = kopf.indexOf(c);
        let v = i > -1 ? r[i] : '';
        if (v instanceof Date) v = v.toISOString();
        o[c] = v == null ? '' : String(v);
      });
      return o;
    });
}

function findeZeile_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function entferne_(sh, spalte, wert) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const kopf = kopf_(sh);
  const col = kopf.indexOf(spalte) + 1;
  if (!col) return;
  const vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) === String(wert)) sh.deleteRow(i + 2);
  }
}

/** Hängt Zeilen an, deren id es noch nicht gibt. Für die Datenübernahme. */
function fuegeHinzu_(ss, tabelle, objekte) {
  const sh = ss.getSheetByName(tabelle);
  const kopf = kopf_(sh);
  const vorhanden = {};
  lies_(ss, tabelle).forEach(function (o) { vorhanden[o.id] = true; });
  const rows = objekte.filter(function (o) { return !vorhanden[o.id]; }).map(function (o) {
    return kopf.map(function (c) { return o[c] != null ? String(o[c]) : ''; });
  });
  if (!rows.length) return 0;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, kopf.length).setNumberFormat('@').setValues(rows);
  return rows.length;
}

/** Optional: im Editor ausführen, um das Daten-Sheet anzulegen und den Link zu sehen. */
function einrichten() {
  const ss = db_();
  richteEin_(ss);
  Logger.log('Dein Daten-Sheet: ' + ss.getUrl());
}

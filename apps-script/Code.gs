/* ============================================================================
   FANTASY BALLERZ BACKEND (Google Apps Script)
   One copy per site: UAT and Live each have their own Google Sheet with this
   file pasted into Extensions › Apps Script. Deploy › New deployment › Web app
   (Execute as: Me, Who has access: Anyone), then run setupTimers once.

   Storage: tab "docs", one row per document:
     col | id | rev | deleted | season | parts | json part 1 | json part 2 | …
   Text cells start with "~" so Sheets never reads them as numbers, dates or
   formulas. Every write bumps a global revision number (Script property REV);
   the app polls "what changed since revision N" and gets only those rows.

   ESPN: a 1-minute timer pulls box scores while games are on (from 1 hour
   before the first tip to 1 hour after the last final) and does a full pull
   (injuries, news, ESPN ownership, settings) once an hour. It tracks its own
   daily runtime and slows to every 2 minutes near Google's free limit.
   ============================================================================ */

var SEASON = '2026-27', SEASON_END = 160;
var DAY0 = Date.UTC(2026, 9, 19);            // day 0 of the 2026-27 calendar (Mon Oct 19)
var ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
var TAB = 'docs', PART = 45000, HEAD = 6;
var ADMIN_COLS = {league: 1, badges: 1, secret: 1};   // commissioner-only writes
var TZ = 'America/New_York';
var DAILY_CAP = 85 * 60e3, SLOW_AT = 70 * 60e3;       // Google allows ~90 trigger-minutes a day

/* ---------------------------------------------------------------- storage */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.getRange(1, 1, 1, 7).setValues([['col', 'id', 'rev', 'deleted', 'season', 'parts', 'json (split across columns)']]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function s_(v) { v = v == null ? '' : String(v); return v.charAt(0) === '~' ? v.slice(1) : v; }
function err_(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
function props_() { return PropertiesService.getScriptProperties(); }
function rev_() { return +props_().getProperty('REV') || 0; }

function index_(sh) {
  sh = sh || sheet_();
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEAD).getValues().map(function (r, k) {
    return {row: k + 2, c: s_(r[0]), i: s_(r[1]), rev: +r[2] || 0, del: !!+r[3], season: s_(r[4]), n: +r[5] || 0};
  });
}
function find_(idx, c, id) { for (var k = 0; k < idx.length; k++) if (idx[k].c === c && idx[k].i === id) return idx[k]; return null; }

// JSON text of each row, read in one block when there are many rows
function readJson_(sh, rows) {
  var out = {};
  if (!rows.length) return out;
  if (rows.length > 20) {
    var w = sh.getLastColumn(), all = sh.getRange(2, 1, sh.getLastRow() - 1, w).getValues();
    rows.forEach(function (x) { out[x.row] = all[x.row - 2].slice(HEAD, HEAD + x.n).map(s_).join(''); });
  } else rows.forEach(function (x) {
    out[x.row] = x.n ? sh.getRange(x.row, HEAD + 1, 1, x.n).getValues()[0].map(s_).join('') : '';
  });
  return out;
}
function parse_(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }

function getDoc_(c, id) {
  var sh = sheet_(), x = find_(index_(sh), c, id);
  if (!x || x.del) return null;
  return parse_(readJson_(sh, [x])[x.row]);
}
function getCol_(c) {
  var sh = sheet_(), rows = index_(sh).filter(function (x) { return x.c === c && !x.del; }), js = readJson_(sh, rows), out = {};
  rows.forEach(function (x) { var v = parse_(js[x.row]); if (v) out[x.i] = v; });
  return out;
}

// caller holds the lock. data null = delete. opt.ifRev: only write if the doc's
// current revision is exactly that (0 = it must not exist), for claims.
function write_(sh, idx, c, id, data, opt) {
  var cur = find_(idx, c, id);
  if (opt && opt.ifRev != null) { var have = cur && !cur.del ? cur.rev : 0; if (have !== +opt.ifRev) throw err_('taken'); }
  var rev = (opt && opt.rev) || rev_() + 1;
  var json = data == null ? '' : JSON.stringify(data), parts = [];
  for (var k = 0; k < json.length; k += PART) parts.push('~' + json.slice(k, k + PART));
  var row = cur ? cur.row : sh.getLastRow() + 1;
  var vals = ['~' + c, '~' + id, rev, data == null ? 1 : 0, '~' + ((data && data.season) || ''), parts.length].concat(parts);
  var width = Math.max(vals.length, HEAD + (cur ? cur.n : 0));
  while (vals.length < width) vals.push('');
  if (width > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  sh.getRange(row, 1, 1, width).setValues([vals]);
  var ent = {row: row, c: c, i: id, rev: rev, del: data == null, season: (data && data.season) || '', n: parts.length};
  if (cur) idx[idx.indexOf(cur)] = ent; else idx.push(ent);
  return rev;
}
// the REV property moves only after the rows are saved, so a reader that sees
// revision N always finds every row up to N
function commit_(rev) { SpreadsheetApp.flush(); props_().setProperty('REV', String(rev)); }

function locked_(fn) {
  var l = LockService.getScriptLock();
  l.waitLock(25000);
  try { return fn(); } finally { l.releaseLock(); }
}
function merge_(a, b) {
  var o = {}, k;
  for (k in a) o[k] = a[k];
  for (k in b) {
    var v = b[k];
    o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? merge_(o[k], v) : v;
  }
  return o;
}
function same_(a, b) {   // equal apart from the "at" timestamp
  var x = {}, y = {}, k;
  for (k in a) if (k !== 'at') x[k] = a[k];
  for (k in b) if (k !== 'at') y[k] = b[k];
  return JSON.stringify(x) === JSON.stringify(y);
}
// server-side save used by the ESPN pull: skips the write when nothing changed
function putDoc_(c, id, data) {
  return locked_(function () {
    var sh = sheet_(), idx = index_(sh), cur = find_(idx, c, id);
    if (cur && !cur.del) { var old = parse_(readJson_(sh, [cur])[cur.row]); if (old && same_(old, data)) return false; }
    commit_(write_(sh, idx, c, id, data));
    return true;
  });
}

/* ------------------------------------------------------------ access codes */
function hex_(bytes) { return bytes.map(function (b) { return ((b + 256) % 256).toString(16); }).map(function (h) { return h.length < 2 ? '0' + h : h; }).join(''); }
// the app only ever sees sha256(code hash), so the badge list can't be used to log in
function bid_(h) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(h), Utilities.Charset.UTF_8)); }
function badges_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('badges');
  if (hit) return JSON.parse(hit);
  var b = getCol_('badges');
  try { cache.put('badges', JSON.stringify(b), 300); } catch (e) {}
  return b;
}
function who_(h) {
  var B = badges_(), b = h ? B[h] || null : null, any = false;
  for (var k in B) if (B[k].role === 'commish') any = true;
  return {h: h, b: b, commish: !!b && b.role === 'commish', setup: !any};
}
function canWrite_(who, c) {
  if (who.setup) return true;                  // brand-new Sheet: anyone can set it up or import
  if (!who.b) return false;
  return !ADMIN_COLS[c] || who.commish;
}

/* --------------------------------------------------------------------- API */
function doGet() { return out_({ok: true, app: 'Fantasy Ballerz', rev: rev_(), season: SEASON}); }
function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({error: 'bad_request'}); }
  try { return out_(api_(b)); }
  catch (x) { return out_({error: x.code || 'server', message: String(x.message || x)}); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function api_(b) {
  var who = who_(b.h);
  switch (b.op) {
    case 'sync': return sync_(b.cols || {}, who);
    case 'get': return get_(b.c, b.i, who);
    case 'set': case 'update': case 'del': return mutate_(b, who);
    case 'import': return import_(b.docs || [], who);
    case 'pull':
      if (!who.commish) throw err_('denied', 'Only the commissioner can start a pull.');
      return {msg: pullNow_()};
    case 'info': return {rev: rev_(), setup: who.setup, me: who.b ? who.b.role : null, timers: ScriptApp.getProjectTriggers().length};
  }
  throw err_('bad_request', 'Unknown op ' + b.op);
}

// everything in the asked collections newer than the revision the app already has
function sync_(cols, who) {
  var R = rev_(), need = false, c;
  for (c in cols) if ((+cols[c] || 0) < R) need = true;
  if (!need) return {rev: R, docs: []};
  var sh = sheet_(), rows = index_(sh).filter(function (x) {
    return cols.hasOwnProperty(x.c) && x.rev > (+cols[x.c] || 0) && (x.c !== 'secret' || who.commish);
  });
  var js = readJson_(sh, rows.filter(function (x) { return !x.del; })), docs = [];
  rows.forEach(function (x) {
    var v = x.del ? null : parse_(js[x.row]);
    if (!x.del && !v) return;
    docs.push({c: x.c, i: x.c === 'badges' ? bid_(x.i) : x.i, r: x.rev, d: x.del ? 1 : 0, v: v});
  });
  return {rev: R, docs: docs};
}
function get_(c, id, who) {
  if (c === 'secret' && !who.commish) return {v: null, r: 0};
  var sh = sheet_(), x = find_(index_(sh), c, id);
  if (!x || x.del) return {v: null, r: 0};
  return {v: parse_(readJson_(sh, [x])[x.row]), r: x.rev};
}
function mutate_(b, who) {
  var c = String(b.c || ''), id = String(b.i || '');
  if (!c || !id) throw err_('bad_request');
  if (!canWrite_(who, c)) throw err_('denied', ADMIN_COLS[c] ? 'Only the commissioner can change that.' : 'Log in with your team code first.');
  var res = locked_(function () {
    var sh = sheet_(), idx = index_(sh);
    if (c === 'badges' && b.op === 'del') {      // the app deletes badges by their public id
      idx.forEach(function (x) { if (x.c === 'badges' && bid_(x.i) === id) id = x.i; });
    }
    var v = b.v;
    if (b.op === 'update') {
      var cur = find_(idx, c, id), old = cur && !cur.del ? parse_(readJson_(sh, [cur])[cur.row]) : null;
      if (!old) throw err_('not-found', 'No document ' + c + '/' + id);
      v = merge_(old, v || {});
    }
    var r = write_(sh, idx, c, id, b.op === 'del' ? null : v, {ifRev: b.ifRev});
    commit_(r);
    return {r: r, v: b.op === 'update' ? v : undefined, i: c === 'badges' ? bid_(id) : id};
  });
  if (c === 'badges') CacheService.getScriptCache().remove('badges');
  return res;
}
// bulk load from a backup file (setup page). Only on a Sheet with no
// commissioner yet, or by the commissioner.
function import_(docs, who) {
  if (!who.setup && !who.commish) throw err_('denied', 'Only the commissioner can import.');
  var n = locked_(function () {
    var sh = sheet_(), idx = index_(sh), rev = rev_(), fresh = [], width = HEAD;
    docs.forEach(function (d) {
      var c = String(d.c), id = String(d.i);
      if (find_(idx, c, id)) { write_(sh, idx, c, id, d.v, {rev: ++rev}); return; }
      var json = JSON.stringify(d.v), parts = [];
      for (var k = 0; k < json.length; k += PART) parts.push('~' + json.slice(k, k + PART));
      var row = ['~' + c, '~' + id, ++rev, 0, '~' + ((d.v && d.v.season) || ''), parts.length].concat(parts);
      width = Math.max(width, row.length); fresh.push(row);
      idx.push({row: -1, c: c, i: id});
    });
    if (fresh.length) {
      fresh.forEach(function (r) { while (r.length < width) r.push(''); });
      var start = sh.getLastRow() + 1, need = start + fresh.length - 1;
      if (width > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
      if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows() + 100);
      sh.getRange(start, 1, fresh.length, width).setValues(fresh);
    }
    commit_(rev);
    return docs.length;
  });
  CacheService.getScriptCache().remove('badges');
  return {n: n, rev: rev_()};
}

/* ------------------------------------------------------------------ setup */
// Run once from the editor (pick "setup", press Run): loads the league from
// "<this Sheet's name> backup.json.gz" in your Drive if the Sheet is empty,
// starts the 1-minute timer and does a first full ESPN pull.
function setup() {
  var sh = sheet_(), idx = index_(sh), hasPicks = idx.some(function (x) { return x.c === 'picks'; });
  // an empty Sheet, or one with only the blank league the app makes when opened before setup
  if (!hasPicks && idx.length < 20) {
    var name = SpreadsheetApp.getActiveSpreadsheet().getName() + ' backup.json.gz', it = DriveApp.getFilesByName(name);
    if (!it.hasNext()) throw new Error('Put "' + name + '" in your Google Drive first.');
    if (idx.length) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    var blob = it.next().getBlob().setContentType('application/x-gzip');
    var data = JSON.parse(Utilities.ungzip(blob).getDataAsString());
    Logger.log('Imported ' + import_(data.docs, {setup: true}).n + ' league documents.');
  }
  setupTimers();
}
/* ------------------------------------------------------------------ timers */
function setupTimers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(1).create();
  props_().deleteProperty('LAST_FULL');
  Logger.log(runSync_(true, 40) || 'A pull is already running.');
  Logger.log('Timer on. Now Deploy › New deployment › Web app.');
}
function stopTimers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
}
function tick() {
  var P = props_(), now = Date.now(), dk = 'RT_' + etDate_(now), used = +P.getProperty(dk) || 0;
  if (used > DAILY_CAP) return;                                     // out of free runtime: wait for tomorrow
  if (used > SLOW_AT && Math.floor(now / 60e3) % 2) return;          // close to it: every 2 minutes
  var full = now - (+P.getProperty('LAST_FULL') || 0) >= 59.5 * 60e3;
  if (!full && !inWindow_(now)) return;                             // no game on: no ESPN call
  var t0 = Date.now();
  try { runSync_(full); }
  finally { P.setProperty(dk, String((+P.getProperty(dk) || 0) + Date.now() - t0)); }
}
function pullNow_() { return runSync_(true, 8) || 'A pull is already running. New data shows in a minute.'; }
function runSync_(full, maxDays) {
  var P = props_(), busy = +P.getProperty('BUSY') || 0;
  if (Date.now() - busy < 4 * 60e3) return null;                    // one pull at a time
  P.setProperty('BUSY', String(Date.now()));
  try {
    var msg = syncEspn_(full, maxDays);
    if (full) { P.setProperty('LAST_FULL', String(Date.now())); cleanup_(); }
    return msg;
  } finally { P.deleteProperty('BUSY'); }
}
function cleanup_() {
  var P = props_(), keep = 'RT_' + etDate_(Date.now()), all = P.getProperties();
  for (var k in all) if (k.indexOf('RT_') === 0 && k !== keep) P.deleteProperty(k);
}
// game window: 1 hour before the first tip until 1 hour after the last final
function inWindow_(now) {
  var M = meta_(), T = todaySp_();
  for (var sp = T - 1; sp <= T; sp++) {
    var t = M.tips[sp], d = M.days[sp] || {};
    if (!t) continue;
    if (now < t[0] - 60 * 60e3) continue;
    if (!d.final || now <= (d.finalAt || 0) + 60 * 60e3) return true;
  }
  return false;
}
// per-day bookkeeping so the timer doesn't reread every stats doc:
// days[sp] = {final, finalAt, hist}, tips[sp] = [first tip ms, last tip ms]
function meta_() {
  var P = props_(), m = parse_(P.getProperty('META'));
  if (m) return m;
  m = {days: {}, tips: {}};
  var st = getCol_('stats');
  for (var id in st) { var d = st[id]; if (d.sp != null) m.days[d.sp] = {final: !!d.final, finalAt: d.at || 0, hist: !!d.hist}; }
  saveMeta_(m);
  return m;
}
function saveMeta_(m) {
  var T = todaySp_();
  for (var k in m.tips) if (+k < T - 3) delete m.tips[k];
  props_().setProperty('META', JSON.stringify(m));
}

/* -------------------------------------------------------------- ESPN pull */
var PRO = {0: 'FA', 1: 'ATL', 2: 'BOS', 3: 'NO', 4: 'CHI', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GS', 10: 'HOU', 11: 'IND', 12: 'LAC', 13: 'LAL', 14: 'MIA', 15: 'MIL', 16: 'MIN', 17: 'BKN', 18: 'NY', 19: 'ORL', 20: 'PHI', 21: 'PHX', 22: 'POR', 23: 'SAC', 24: 'SA', 25: 'OKC', 26: 'UTAH', 27: 'WSH', 28: 'TOR', 29: 'MEM', 30: 'CHA'};
var ESPN_SLOT = {0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 11: 'UTIL', 12: 'BE', 13: 'IR'};
var SLOT_KEYS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'BE', 'IR'];
var ESPN_CAT = {0: 'PTS', 1: 'BLK', 2: 'STL', 3: 'AST', 6: 'REB', 13: 'FGM', 15: 'FTM', 17: 'TPM', 19: 'FGP', 20: 'FTP'};
var CATDEF = ['FGP', 'FTP', 'TPM', 'REB', 'AST', 'STL', 'BLK', 'PTS', 'FGM', 'FTM'];
var DEFAULT_CATS = ['FGP', 'FTP', 'TPM', 'REB', 'AST', 'STL', 'BLK', 'PTS'];

function etDate_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'yyyy-MM-dd'); }
function spOf_(ymd) { var p = ymd.split('-'); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - DAY0) / 864e5); }
function todaySp_() { return spOf_(etDate_(Date.now())); }
function dayStr_(sp, f) { return Utilities.formatDate(new Date(DAY0 + sp * 864e5), 'UTC', f); }
function etMin_(iso) { var p = Utilities.formatDate(new Date(iso), TZ, 'H:m').split(':'); return +p[0] * 60 + +p[1]; }
function fmtTime_(m) { var h = Math.floor(m / 60), mi = m % 60; return ((h + 11) % 12 + 1) + ':' + (mi < 10 ? '0' : '') + mi + ' ' + (h >= 12 ? 'PM' : 'AM'); }
function g_(o) { for (var k = 1; k < arguments.length; k++) { if (o == null) return undefined; o = o[arguments[k]]; } return o; }

function getJson_(url, headers) {
  var last;
  for (var k = 0; k < 3; k++) {
    var r = UrlFetchApp.fetch(url, {muteHttpExceptions: true, headers: headers || {}});
    if (r.getResponseCode() === 200) return JSON.parse(r.getContentText());
    last = r.getResponseCode();
    Utilities.sleep(800 * (k + 1));
  }
  throw new Error('ESPN ' + last + ' for ' + url);
}
function getAllJson_(urls) {
  if (!urls.length) return [];
  return UrlFetchApp.fetchAll(urls.map(function (u) { return {url: u, muteHttpExceptions: true}; })).map(function (r) {
    if (r.getResponseCode() !== 200) return null;
    try { return JSON.parse(r.getContentText()); } catch (e) { return null; }
  });
}

function syncEspn_(full, maxDays) {
  var L = getDoc_('league', SEASON);
  if (!L) return 'No league yet: import a backup first.';
  var now = Date.now(), TODAY = Math.max(1, Math.min(SEASON_END + 1, todaySp_())), last = Math.min(TODAY, SEASON_END);
  var E = L.espn || {}, LG = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/' + (E.season || 2027) + '/segments/0/leagues/' + (E.league || 234626984);
  var log = [];
  if (full) {
    try { log.push(syncSettings_(L, LG)); } catch (e) { log.push('settings failed: ' + e); }
  }
  // mirroring ESPN: rosters every full pull, and at most every 10 minutes in between
  if (L.source === 'espn') {
    var MR = meta_();
    if (full || now - (MR.rosterAt || 0) >= 10 * 60e3) {
      try { log.push(syncRosters_(LG, last, now, MR.rosterDay)); MR.rosterAt = now; MR.rosterDay = last; saveMeta_(MR); } catch (e) { log.push('rosters failed: ' + e); }
    }
  }
  var M = meta_(), NBA = getDoc_('nba', SEASON) || {}, live = null;
  var frm = 1;
  while (frm < last && M.days[frm] && M.days[frm].final) frm++;
  var days = [];
  for (var sp = frm; sp <= last; sp++) days.push(sp);
  for (sp = 1; sp <= last; sp++) if (M.days[sp] && M.days[sp].final && !M.days[sp].hist && days.indexOf(sp) < 0) days.push(sp);
  // keep each run short: the oldest unfinished days first, and always today
  days.sort(function (a, b) { return a - b; });
  var cap = maxDays || 4;
  if (days.length > cap) days = days.slice(0, cap - 1).concat(days.indexOf(last) >= 0 ? [last] : days.slice(cap - 1, cap));
  days.forEach(function (sp) {
    try {
      var r = syncDay_(sp, TODAY, now, M);
      if (r.live) live = r.live;
      log.push('day ' + sp + ': ' + r.msg);
    } catch (e) { log.push('day ' + sp + ' failed: ' + e); }
  });
  saveMeta_(M);

  var doc = {season: SEASON, inj: NBA.inj || {}, injd: NBA.injd || {}, news: NBA.news || [], live: live || NBA.live || null, own: NBA.own || null, ownAt: NBA.ownAt || null, at: now};
  if (full) {
    try { var ij = injuries_(); doc.inj = ij[0]; doc.injd = ij[1]; } catch (e) { log.push('injuries failed: ' + e); }
    try { doc.news = news_(doc.news, now); } catch (e) { log.push('news failed: ' + e); }
    try { var o = ownership_(LG); if (o) { doc.own = o; doc.ownAt = now; } } catch (e) { log.push('ownership skipped: ' + e); }
  }
  putDoc_('nba', SEASON, doc);
  return (full ? 'Full pull. ' : 'Live pull. ') + log.join('; ');
}

function syncSettings_(L, LG) {
  var from = L.settingsFrom || (L.source === 'espn' ? 'espn' : 'app');
  if (from !== 'espn') return 'settings are set in the app';
  var j = getJson_(LG + '?view=mSettings&view=mTeam&view=mMatchup'), st = j.settings || {};
  var nxt = JSON.parse(JSON.stringify(L)), base = JSON.stringify(L);
  var nm0 = String(st.name || '').trim().replace(/\s+\d{4}\s*[-\/]\s*\d{2,4}$/, '');
  if (nm0) nxt.name = nm0;
  var pt = +(g_(st, 'scheduleSettings', 'playoffTeamCount') || 0);
  if (pt >= 2) nxt.playoffTeams = pt;
  var lc = g_(st, 'rosterSettings', 'lineupSlotCounts');
  if (lc) {
    var sl = {}, any = false, tot = 0;
    SLOT_KEYS.forEach(function (k) { sl[k] = 0; });
    for (var i in lc) if (ESPN_SLOT[+i]) { sl[ESPN_SLOT[+i]] = +lc[i] || 0; if (+lc[i]) any = true; tot += +lc[i] || 0; }
    if (any) { nxt.slots = sl; nxt.maxRoster = tot; }
  }
  var ks = (g_(st, 'scoringSettings', 'scoringItems') || []).map(function (x) { return ESPN_CAT[x.statId]; });
  var cats = CATDEF.filter(function (k) { return ks.indexOf(k) >= 0; });
  if (cats.length) nxt.cats = DEFAULT_CATS.filter(function (k) { return cats.indexOf(k) >= 0; }).concat(cats.filter(function (k) { return DEFAULT_CATS.indexOf(k) < 0; }));
  (j.teams || []).forEach(function (t) {
    var nm = String(t.name || [t.location, t.nickname].filter(Boolean).join(' ')).trim(), tm = null;
    nxt.teams.forEach(function (x) { if (x.id === 't' + t.id) tm = x; });
    if (tm && nm) tm.name = nm;
    else if (!tm && nm && nxt.teams.length < 12) nxt.teams.push({id: 't' + t.id, name: nm});
  });
  var reg = +(g_(st, 'scheduleSettings', 'matchupPeriodCount') || 0), sc = {}, has = false;
  (j.schedule || []).forEach(function (m) {
    var n = m.matchupPeriodId;
    if (!n || (reg && n > reg) || !m.home || !m.away) return;
    (sc[n] = sc[n] || []).push([m.home.teamId, m.away.teamId]); has = true;
  });
  if (has) nxt.schedule = sc;
  if (JSON.stringify(nxt) === base) return 'settings unchanged';
  putDoc_('league', SEASON, nxt);
  return 'settings updated from ESPN';
}

// from the last day already saved (that day again, in case it changed) to today
function syncRosters_(LG, last, now, done) {
  var ids = Object.keys(getCol_('espn')).map(function (k) { return +k.split('_d')[1] || 0; });
  var have = Math.max(done || 0, ids.length ? Math.max.apply(null, ids) : 0);
  var first = Math.max(1, Math.min(have, last)), n = 0;
  for (var sp = first; sp <= last; sp++) {
    var jr = getJson_(LG + '?view=mRoster&scoringPeriodId=' + sp), r = {}, any = false;
    (jr.teams || []).forEach(function (t) {
      var es = g_(t, 'roster', 'entries');
      if (!es || !es.length) return;
      r['t' + t.id] = es.map(function (e) {
        var p = g_(e, 'playerPoolEntry', 'player') || {};
        return p.fullName ? [p.fullName, e.lineupSlotId, PRO[p.proTeamId] || 'FA', (p.eligibleSlots || []).filter(function (s) { return s <= 6 || s === 11; })] : null;
      }).filter(Boolean);
      any = true;
    });
    if (any) { putDoc_('espn', SEASON + '_d' + sp, {season: SEASON, sp: sp, at: now, r: r}); n++; }
  }
  return 'rosters ' + n + ' days';
}

/* box scores for one day. Finished games are cached for 6 hours so each
   minute only re-reads the games still going. */
function syncDay_(sp, TODAY, now, M) {
  var sb = getJson_(ESPN + '/scoreboard?dates=' + dayStr_(sp, 'yyyyMMdd')), evs = sb.events || [];
  var cache = CacheService.getScriptCache(), lines = {}, info = {}, shots = {}, pieces = [], allPost = evs.length > 0, need = [];
  var tips = evs.map(function (ev) { return new Date(ev.date).getTime(); }).filter(function (x) { return x > 0; });
  if (tips.length) M.tips[sp] = [Math.min.apply(null, tips), Math.max.apply(null, tips)];
  evs.forEach(function (ev) {
    var state = stateOf_(ev);
    if (state !== 'post') allPost = false;
    if (state === 'pre') return;
    var hit = state === 'post' ? cache.get('g' + ev.id) : null;
    if (hit) { useGame_(JSON.parse(hit), lines, info, shots, pieces); return; }
    need.push(ev);
  });
  var sums = getAllJson_(need.map(function (ev) { return ESPN + '/summary?event=' + ev.id; }));
  need.forEach(function (ev, k) {
    var s = sums[k];
    if (!s) { allPost = false; return; }
    var G = {lines: {}, info: {}, shots: {}, h: null};
    try {
      parseBox_(s, G.lines, G.info); parseShots_(s, G.shots);
      if (stateOf_(ev) === 'post' && g_(ev, 'competitions', 0, 'type', 'abbreviation') !== 'ALLSTAR') G.h = histGame_(s, ev, dayStr_(sp, 'yyyy-MM-dd'));
    } catch (e) { allPost = false; return; }
    if (stateOf_(ev) === 'post') { try { cache.put('g' + ev.id, JSON.stringify(G), 21600); } catch (e) {} }
    useGame_(G, lines, info, shots, pieces);
  });
  var live = null;
  if (sp === TODAY) {
    var g = {};
    evs.forEach(function (ev) {
      var c = g_(ev, 'competitions', 0);
      if (!c) return;
      var s = (c.status || ev.status || {}).type || {}, tms = c.competitors || [], st = s.state || 'pre';
      tms.forEach(function (me) {
        var ot = tms.filter(function (x) { return x !== me; })[0] || {}, ab = g_(me, 'team', 'abbreviation');
        if (ab) g[ab] = {s: st, d: st === 'pre' ? fmtTime_(etMin_(ev.date)) : (s.shortDetail || ''), sc: (me.score || 0) + '-' + (ot.score || 0)};
      });
    });
    live = {day: TODAY, at: now, g: g};
  }
  var d = M.days[sp] || (M.days[sp] = {}), final = allPost || (!evs.length && sp < TODAY);
  if (final && !d.final) d.finalAt = now;
  d.final = final;
  if (final && !d.hist) {
    var H = mergeHist_(pieces);
    if (H.g.length) putDoc_('hist', SEASON + '_d' + sp, {season: SEASON, sp: sp, at: now, g: H.g, p: H.p, l: H.l, s: H.s});
    d.hist = true;
  }
  var st = {season: SEASON, sp: sp, final: final, at: now, lines: lines, info: info};
  if (d.hist) st.hist = 1;
  putDoc_('stats', SEASON + '_d' + sp, st);
  if (Object.keys(shots).length) putDoc_('shots', SEASON + '_d' + sp, {season: SEASON, sp: sp, at: now, p: shots});
  return {live: live, msg: evs.length + ' games, ' + Object.keys(lines).length + ' lines' + (final ? ', final' : '') + (need.length ? ', ' + need.length + ' read' : '')};
}
function stateOf_(ev) { var c = g_(ev, 'competitions', 0) || {}; return ((c.status || ev.status || {}).type || {}).state || 'pre'; }
function useGame_(G, lines, info, shots, pieces) {
  var k;
  for (k in G.lines) lines[k] = G.lines[k];
  for (k in G.info) info[k] = G.info[k];
  for (k in G.shots) shots[k] = (shots[k] || []).concat(G.shots[k]);
  if (G.h) pieces.push(G.h);
}

function parseBox_(s, lines, info) {
  (g_(s, 'boxscore', 'players') || []).forEach(function (tp) {
    var ab = g_(tp, 'team', 'abbreviation');
    (tp.statistics || []).forEach(function (stt) {
      var lab = (stt.labels || stt.names || []).map(function (x) { return String(x).toUpperCase(); });
      (stt.athletes || []).forEach(function (a) {
        var ath = a.athlete || {}, n = ath.displayName;
        if (!n) return;
        info[n] = [ab, g_(ath, 'position', 'abbreviation') || ''];
        var s2 = a.stats || [];
        if (a.didNotPlay || !s2.length) return;
        var num = function (k) { var i = lab.indexOf(k); if (i < 0) return 0; var v = parseFloat(s2[i]); return isNaN(v) ? 0 : v; };
        var ma = function (k) { var i = lab.indexOf(k); if (i < 0) return [0, 0]; var p = String(s2[i]).split('-'); return p.length === 2 && !isNaN(+p[0]) && !isNaN(+p[1]) ? [+p[0], +p[1]] : [0, 0]; };
        var fg = ma('FG'), t3 = ma('3PT'), ft = ma('FT');
        lines[n] = [num('PTS'), num('BLK'), num('STL'), num('AST'), num('REB'), t3[0], fg[0], fg[1], ft[0], ft[1], Math.round(num('MIN'))];
      });
    });
  });
}
function parseShots_(s, out) {
  var ids = {};
  (g_(s, 'boxscore', 'players') || []).forEach(function (tp) { (tp.statistics || []).forEach(function (stt) { (stt.athletes || []).forEach(function (a) {
    var ath = a.athlete || {}; if (ath.id && ath.displayName) ids[String(ath.id)] = ath.displayName; }); }); });
  (s.plays || []).forEach(function (pl) {
    if (!pl.shootingPlay || (pl.pointsAttempted !== 2 && pl.pointsAttempted !== 3)) return;
    var c = pl.coordinate || {}, x = c.x, y = c.y;
    if (typeof x !== 'number' || typeof y !== 'number' || x < -5 || x > 55 || y < -10 || y > 94) return;
    var n = ids[String(g_(pl, 'participants', 0, 'athlete', 'id'))];
    if (n) (out[n] = out[n] || []).push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, pl.scoringPlay ? 1 : 0, pl.pointsAttempted, g_(pl, 'period', 'number') || 0]);
  });
}
// History rows for one game, with its own player list; mergeHist_ joins a day's games.
// lines: [game, player, team, starter, MIN, PTS, FGM, FGA, 3PM, 3PA, FTM, FTA, OREB, DREB, REB, AST, STL, BLK, TO, PF, +/-]
// shots: [game, player, team, quarter, x, y, code (0 miss 2, 1 make 2, 2 miss 3, 3 make 3), type, feet, assister or -1]
function histGame_(summ, ev, date) {
  var comp = g_(summ, 'header', 'competitions', 0) || {}, cs = {}, tm = {};
  (comp.competitors || []).forEach(function (c) { cs[c.homeAway] = c; if (c.team) tm[String(c.team.id)] = c.team.abbreviation; });
  if (!cs.home || !cs.away) return null;
  var H = {g: [[String(ev.id), date, cs.home.team.abbreviation, cs.away.team.abbreviation, +(cs.home.score || 0), +(cs.away.score || 0), g_(ev, 'season', 'type') || 2]], p: [], l: [], s: []}, pi = {};
  var pidx = function (i, n) { if (!(i in pi)) { pi[i] = H.p.length; H.p.push([i, n]); } return pi[i]; };
  var n2 = function (v) { v = String(v == null ? '' : v); return /^[+-]?\d+$/.test(v) ? parseInt(v.replace('+', ''), 10) : 0; };
  var pr = function (v) { var a = (String(v) + '-0').split('-'); return [n2(a[0]), n2(a[1])]; };
  var names = {};
  (g_(summ, 'boxscore', 'players') || []).forEach(function (tp) {
    var ab = g_(tp, 'team', 'abbreviation');
    (tp.statistics || []).forEach(function (stt) {
      var keys = stt.keys || [];
      (stt.athletes || []).forEach(function (a) {
        var ath = a.athlete || {}, i = String(ath.id || '');
        if (!i) return;
        names[i] = ath.displayName || '';
        if (a.didNotPlay || !a.stats || !a.stats.length) return;
        var v = {}; keys.forEach(function (k, j) { v[k] = a.stats[j]; });
        var fg = pr(v['fieldGoalsMade-fieldGoalsAttempted']), tp3 = pr(v['threePointFieldGoalsMade-threePointFieldGoalsAttempted']), ft = pr(v['freeThrowsMade-freeThrowsAttempted']);
        var mn = n2(v.minutes);
        if (!(mn || fg[1] || ft[1] || n2(v.points) || n2(v.rebounds))) return;
        H.l.push([0, pidx(i, names[i]), ab, a.starter ? 1 : 0, mn, n2(v.points), fg[0], fg[1], tp3[0], tp3[1], ft[0], ft[1],
          n2(v.offensiveRebounds), n2(v.defensiveRebounds), n2(v.rebounds), n2(v.assists), n2(v.steals), n2(v.blocks), n2(v.turnovers), n2(v.fouls), n2(v.plusMinus)]);
      });
    });
  });
  (summ.plays || []).forEach(function (pl) {
    if (!pl.shootingPlay) return;
    var tt = g_(pl, 'type', 'text') || '', tx = String(pl.text || '').toLowerCase();
    if (tt.toLowerCase().indexOf('free throw') >= 0 || tx.indexOf('free throw') >= 0) return;
    var c = pl.coordinate || {}, x = c.x, y = c.y;
    if (typeof x !== 'number' || typeof y !== 'number' || Math.abs(x) > 100 || Math.abs(y) > 100) return;
    var ps = (pl.participants || []).map(function (q) { return g_(q, 'athlete', 'id'); }).filter(Boolean).map(String);
    if (!ps.length || !(ps[0] in names)) return;
    var made = pl.scoringPlay ? 1 : 0;
    var val = pl.pointsAttempted === 2 || pl.pointsAttempted === 3 ? pl.pointsAttempted : (tx.indexOf('three point') >= 0 || pl.scoreValue === 3 ? 3 : 2);
    var m = /(\d+)-foot/.exec(tx), ft = m ? +m[1] : (tx.indexOf('dunk') >= 0 || tx.indexOf('layup') >= 0 ? 0 : null);
    if (val === 2 && !made) {
      var yy = y + 4.25;
      if ((yy <= 14.2 && (x <= 3.1 || x >= 46.9)) || Math.sqrt(Math.pow(x - 25, 2) + Math.pow(yy - 5.25, 2)) >= 23.75 || (ft != null && ft >= 24)) val = 3;
    }
    if (ft == null) ft = Math.round(Math.sqrt(Math.pow(x - 25, 2) + y * y));
    var ast = made && ps.length > 1 && ps[1] in names ? pidx(ps[1], names[ps[1]]) : -1;
    H.s.push([0, pidx(ps[0], names[ps[0]]), tm[String(g_(pl, 'team', 'id'))] || '', g_(pl, 'period', 'number') || 0,
      Math.round(x * 10) / 10, Math.round(y * 10) / 10, made + (val === 3 ? 2 : 0), tt, ft, ast]);
  });
  return H;
}
function mergeHist_(pieces) {
  var D = {g: [], p: [], l: [], s: []}, pi = {};
  pieces.forEach(function (h) {
    var gi = D.g.length, map = h.p.map(function (p) { if (!(p[0] in pi)) { pi[p[0]] = D.p.length; D.p.push(p); } return pi[p[0]]; });
    D.g.push(h.g[0]);
    h.l.forEach(function (r) { var o = r.slice(); o[0] = gi; o[1] = map[r[1]]; D.l.push(o); });
    h.s.forEach(function (r) { var o = r.slice(); o[0] = gi; o[1] = map[r[1]]; if (o[9] >= 0) o[9] = map[r[9]]; D.s.push(o); });
  });
  return D;
}

function injuries_() {
  var ij = getJson_(ESPN + '/injuries'), m = {}, dd = {};
  (ij.injuries || []).forEach(function (t) {
    (t.injuries || []).forEach(function (x) {
      var n = g_(x, 'athlete', 'displayName');
      if (!n) return;
      var raw = String(x.status || g_(x, 'type', 'description') || ''), s = raw.toLowerCase();
      m[n] = s.indexOf('out') >= 0 ? 'OUT' : /day|question|doubt/.test(s) ? 'DAY_TO_DAY' : 'ACTIVE';
      var d = x.details || {}, at = new Date(x.date).getTime() || Date.now();
      dd[n] = {s: raw, t: [d.side && d.side !== 'Not Specified' ? d.side : '', d.type || '', d.detail || ''].filter(Boolean).join(' ').slice(0, 60),
        r: String(d.returnDate || '').slice(0, 10), c: String(x.shortComment || x.longComment || '').slice(0, 400), at: at};
    });
  });
  return [m, dd];
}
function news_(old, now) {
  var nw = getJson_(ESPN + '/news?limit=50'), seen = {}, out = [];
  (nw.articles || []).forEach(function (a) {
    var i = String(a.id || a.dataSourceIdentifier || a.headline || '');
    if (!a.headline || seen[i]) return;
    seen[i] = 1;
    out.push({id: i, h: String(a.headline).slice(0, 200), d: String(a.description || '').slice(0, 300), u: g_(a, 'links', 'web', 'href') || '',
      at: new Date(a.published || a.lastModified).getTime() || now,
      p: (a.categories || []).filter(function (c) { return c.type === 'athlete'; }).map(function (c) { return c.description || g_(c, 'athlete', 'description') || ''; }).slice(0, 6)});
  });
  (old || []).forEach(function (a) { if (!seen[a.id] && now - a.at < 7 * 864e5) { seen[a.id] = 1; out.push(a); } });
  return out.sort(function (a, b) { return b.at - a.at; }).slice(0, 120);
}
function ownership_(LG) {
  var o = {}, any = false;
  [{limit: 400, sortPercOwned: {sortAsc: false, sortPriority: 1}}, {limit: 120, sortPercChanged: {sortAsc: false, sortPriority: 1}}, {limit: 120, sortPercChanged: {sortAsc: true, sortPriority: 1}}].forEach(function (flt) {
    var j = getJson_(LG + '?view=kona_player_info', {'x-fantasy-filter': JSON.stringify({players: flt})});
    (j.players || []).forEach(function (x) {
      var p = x.player || {}, ow = p.ownership || {};
      if (p.fullName && ow.percentOwned != null) {
        o[p.fullName] = [Math.round(ow.percentOwned * 10) / 10, Math.round((ow.percentChange || 0) * 100) / 100, Math.round((ow.percentStarted || 0) * 10) / 10];
        any = true;
      }
    });
  });
  return any ? o : null;
}

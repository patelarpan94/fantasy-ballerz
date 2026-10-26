// Minimal Google Apps Script emulator for testing Code.gs locally.
const vm = require('vm'), fs = require('fs'), crypto = require('crypto'), {execFileSync} = require('child_process');

function makeSheet(name) {
  const rows = []; let maxR = 1000, maxC = 26, frozen = 0;
  const coerce = v => {
    if (typeof v !== 'string') return v;
    if (v.startsWith('=')) throw new Error('formula written: ' + v.slice(0, 40));
    if (v.length > 50000) throw new Error('cell over 50000 chars: ' + v.length);
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);           // Sheets turns number-like text into numbers
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v);      // and date-like text into dates
    return v;
  };
  const sh = {
    getName: () => name,
    getLastRow: () => { for (let r = rows.length; r > 0; r--) if (rows[r - 1] && rows[r - 1].some(x => x !== '' && x != null)) return r; return 0; },
    getLastColumn: () => rows.reduce((m, r) => { if (!r) return m; let k = r.length; while (k > 0 && (r[k - 1] === '' || r[k - 1] == null)) k--; return Math.max(m, k); }, 0),
    getMaxRows: () => maxR, getMaxColumns: () => maxC,
    insertRowsAfter: (a, n) => { maxR += n; }, insertColumnsAfter: (a, n) => { maxC += n; },
    setFrozenRows: n => { frozen = n; },
    getRange(r, c, nr = 1, nc = 1) {
      if (r < 1 || c < 1 || r + nr - 1 > maxR || c + nc - 1 > maxC) throw new Error(`range out of bounds ${r},${c},${nr},${nc} max ${maxR}x${maxC}`);
      return {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) { const v = row[c - 1 + j]; o.push(v == null ? '' : v); } out.push(o); } return out; },
        clearContent() { for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; } return this; },
        setValues(vals) {
          if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error('setValues size mismatch');
          vals.forEach((v, i) => { const row = rows[r - 1 + i] || (rows[r - 1 + i] = []); v.forEach((x, j) => { row[c - 1 + j] = coerce(x); }); });
        }
      };
    },
    _rows: rows
  };
  return sh;
}

function makeEnv(state) {
  const sheets = state.sheets || (state.sheets = {});
  const props = state.props || (state.props = {});
  const cache = {};
  const fmt = (d, tz, f) => {
    const p = {}; new Intl.DateTimeFormat('en-US', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(d).forEach(x => p[x.type] = x.value);
    return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('H', String(+p.hour)).replace('m', String(+p.minute));
  };
  const G = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({getName: () => state.name || 'Fantasy Ballerz UAT', getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet(n))}),
      flush: () => {}
    },
    PropertiesService: {getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => ({...props})})},
    LockService: {getScriptLock: () => ({waitLock() {}, tryLock() { return true; }, releaseLock() {}})},
    CacheService: {getScriptCache: () => ({
      get: k => (cache[k] && cache[k].exp > Date.now() ? cache[k].v : null),
      put: (k, v, s) => { if (v.length > 100000) throw new Error('cache value too big'); cache[k] = {v, exp: Date.now() + (s || 600) * 1000}; },
      remove: k => { delete cache[k]; }})},
    Utilities: {
      formatDate: fmt, sleep: () => {}, ungzip: b => ({getDataAsString: () => require('zlib').gunzipSync(b.bytes).toString('utf8')}),
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      computeDigest: (alg, s) => [...crypto.createHash(alg).update(s, 'utf8').digest()].map(b => (b > 127 ? b - 256 : b))
    },
    UrlFetchApp: {
      fetch(url, o = {}) {
        state.fetches = (state.fetches || 0) + 1;
        if (state.fakeFetch) return state.fakeFetch(url, o);
        const args = ['-s', '--max-time', '60', '-w', '\n%{http_code}'];
        for (const [k, v] of Object.entries(o.headers || {})) args.push('-H', `${k}: ${v}`);
        args.push(url);
        const out = execFileSync('curl', args, {maxBuffer: 64 << 20}).toString(), i = out.lastIndexOf('\n');
        const body = out.slice(0, i), code = +out.slice(i + 1);
        return {getResponseCode: () => code, getContentText: () => body};
      },
      fetchAll(reqs) { return reqs.map(r => G.UrlFetchApp.fetch(r.url, r)); }
    },
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: s => ({content: s, setMimeType() { return this; }})},
    ScriptApp: {getProjectTriggers: () => state.triggers || [], deleteTrigger() {}, newTrigger: h => ({timeBased: () => ({everyMinutes: () => ({create: () => { (state.triggers = state.triggers || []).push({getHandlerFunction: () => h}); }})})})},
    DriveApp: {getFilesByName: n => { const f = __dirname + '/drive/' + n, ok = fs.existsSync(f); let used = false;
      return {hasNext: () => ok && !used, next: () => { used = true; const bytes = fs.readFileSync(f); return {getBlob: () => ({bytes, setContentType() { return this; }})}; }}; }},
    Logger: {log: (...a) => console.log('[Logger]', ...a)},
    console
  };
  vm.createContext(G);
  vm.runInContext(fs.readFileSync(__dirname + '/../../apps-script/Code.gs', 'utf8'), G, {filename: 'Code.gs'});
  return G;
}
module.exports = {makeEnv};

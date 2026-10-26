"""Build the GitHub Pages app from the artifact source.

python3 tools/build_gh.py <artifact src dir> <baseline-week-board.html>

Writes index.html (Live) and uat/index.html (UAT). The artifact's Store (Claude
artifact database) is swapped for web/store_gas.js (Google Apps Script backend),
badges are looked up by sha256 of the code hash, and Refresh asks the backend.
Backend addresses come from config.json.
"""
import json, os, re, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, BASE = sys.argv[1], sys.argv[2]
r = lambda f: open(os.path.join(SRC, f), encoding="utf-8").read()
w = lambda f: open(os.path.join(ROOT, "web", f), encoding="utf-8").read()
CFG = json.load(open(os.path.join(ROOT, "config.json")))
BUILD = time.strftime("%Y%m%d%H%M%S")

def sub(text, old, new, name, count=1):
    n = text.count(old)
    if n != count:
        sys.exit(f"patch '{name}': expected {count} match, found {n}")
    return text.replace(old, new)

b = open(BASE, encoding="utf-8").read().split("\n")
data = json.loads(b[490][len("const DATA="):].rstrip(";"))
sched = json.dumps(data["S"], separators=(",", ":"))
pool = r("pool_compact.json")
css = "\n".join(b[2:352]); svg = "\n".join(b[394:403])

# ---- the store: Google Sheet behind Apps Script instead of the artifact database
a = r("a_core.js").replace("/*SCHED*/", sched).replace("/*POOL*/", pool)
i0, i1 = a.index("const Store={"), a.index("function merge(a,b)")
a = a[:i0] + w("store_gas.js") + "\n" + a[i1:]

d = r("d_app.js")
d = sub(d, "const b=SESSION&&BADGES?.[SESSION.h];", "const b=SESSION&&BADGES?.[bid(SESSION.h)];", "sessionValid")
d = sub(d, "BADGES={...BADGES,[h]:{role:\"commish\",team:null}};", "BADGES={...BADGES,[bid(h)]:{role:\"commish\",team:null}};", "setup badge")
d = sub(d, "const b=BADGES?.[h];GATE.busy=false;", "const b=BADGES?.[bid(h)];GATE.busy=false;", "login badge")
i = d.rindex("</script>")
gs = open(os.path.join(ROOT, "apps-script", "Code.gs"), encoding="utf-8").read()
tail = sub(w("gas_tail.js"), '/*FEED_SRC*/""', json.dumps(gs).replace("</", "<\\/"), "feed source")
d = d[:i] + tail + "\n" + d[i:]

c = r("c_views.js")
c = sub(c, "const b=BADGES?.[h];\n", "const b=BADGES?.[bid(h)];\n", "codes badge")
c = sub(c, "BADGES={...BADGES,[H.commish]:{role:\"commish\",team:null}}", "BADGES={...BADGES,[bid(H.commish)]:{role:\"commish\",team:null}}", "codes commish")
# switch the commissioner's session to a new code right after its badge is written, so the rest of the save still has rights
c = sub(c, "await Store.set(\"badges\",h,{...want,at:Date.now()});}",
        "await Store.set(\"badges\",h,{...want,at:Date.now()});if(k===\"commish\"&&isCommish()&&SESSION.h!==h){BADGES={...BADGES,[bid(h)]:{role:\"commish\",team:null}};saveSession({...SESSION,h});}}", "codes session")
c = sub(c, "const keep=new Set(Object.values(H));", "const keep=new Set(Object.values(H).map(bid));", "codes keep")

# past seasons' History files sit once at the site root, shared by Live and UAT
oh = sub(r("o_hist.js"), "fetch(`hist/${s}.json`)", "fetch(`${DF_ASSETS}hist/${s}.json`)", "hist path")
ps = sub(r("p_shots.js"), "fetch(`hist/shots/${s}/${t}.json`)", "fetch(`${DF_ASSETS}hist/shots/${s}/${t}.json`)", "shots path")

hp = r("help.html")
hp = sub(hp, "<li><b>Refresh</b>: for the commissioner it starts a pull in Claude's cloud. New data shows on everyone's devices a few minutes later. After pressing it, wait about 10 minutes before pressing again.</li>",
         "<li>Data updates on its own: every minute while NBA games are on (from an hour before the first tip to an hour after the last final) and every hour otherwise. The app checks for new data every 15 seconds while it's open.</li>", "help refresh")
hp = sub(hp, "<li>For everyone else, new data appears on its own whenever the commissioner refreshes. In the Claude desktop app, Refresh can also read ESPN directly.</li>",
         "<li><b>Refresh</b> checks for new data right away. For the commissioner it also starts a full ESPN pull.</li>"
         "<li>On iPhone, open the app in Safari, tap Share, then <b>Add to Home Screen</b> to get the app icon. On Android, use Chrome's menu, then <b>Add to Home screen</b>.</li>", "help others")

body = (a + r("b_board.js") + r("b2_tracker.js") + c + r("e_ui.js") + r("f_feat.js") + r("g_anim.js") + r("h_shots.js") + r("i_rel.js")
        + r("j_prefs.js") + r("n_colors.js") + r("k_waivers.js") + r("l_trades.js") + r("m_wow.js") + oh + ps + r("q_compare.js")
        + r("r_duo.js") + r("s_ptable.js") + r("t_hfun.js") + r("u_fun.js") + r("v_legal.js") + r("w_audit.js") + d)

# the touch layout for wider screens: copy every phone-width rule under body.fold (same as the artifact build)
def fold(css):
    out = []; i = 0; key = "@media (max-width:640px){"
    while True:
        j = css.find(key, i)
        if j < 0: break
        k = j + len(key); dd = 1; m = k
        while dd:
            if css[m] == "{": dd += 1
            elif css[m] == "}": dd -= 1
            m += 1
        blk = css[k:m - 1]; i = m
        for sel, decl in re.findall(r"([^{}@]+)\{([^{}]*)\}", blk):
            sels = []
            for x in sel.split(","):
                x = x.strip()
                if not x: continue
                if x.startswith("body"): sels.append("body.fold" + x[4:])
                elif x.startswith("html") and " " in x: h, rest = x.split(" ", 1); sels.append(h + " body.fold " + rest)
                elif x.startswith(("html", ":root")): sels.append(x)
                else: sels.append("body.fold " + x)
            out.append(",".join(sels) + "{" + decl + "}")
    return "\n".join(out)
fcss = "<style>\n@media (min-width:641px){\n" + fold(css + r("shell.html")) + "\n}\n</style>\n"

def page(env):
    e = CFG[env]
    head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<title>{e['title']}</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="{e['assets']}icon-192.png">
<link rel="apple-touch-icon" href="{e['assets']}icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="{e['short']}">
<meta name="theme-color" content="#17202c">
<style>html{{touch-action:manipulation;-webkit-text-size-adjust:100%;background:var(--bg)}}body{{margin:0;min-height:100vh;min-height:100dvh}}button,.key{{touch-action:manipulation}}@media (max-width:640px){{input,select,textarea{{font-size:16px!important}}}}</style>
<script>window.DF_CONFIG={json.dumps({'backend': e['backend'], 'env': env, 'build': BUILD})};var DF_ASSETS={json.dumps(e['assets'])};</script>
"""
    return head + css + "\n" + r("shell.html") + "\n" + fcss + svg + "\n" + hp + "\n" + body

def manifest(env):
    e = CFG[env]
    return json.dumps({"name": e["title"], "short_name": e["short"], "start_url": "./", "scope": "./", "display": "standalone",
                       "background_color": "#f2f4f8", "theme_color": "#17202c",
                       "icons": [{"src": e["assets"] + "icon-192.png", "sizes": "192x192", "type": "image/png"},
                                 {"src": e["assets"] + "icon-512.png", "sizes": "512x512", "type": "image/png"},
                                 {"src": e["assets"] + "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1)

for env, path in (("live", ""), ("uat", "uat/")):
    os.makedirs(os.path.join(ROOT, path or "."), exist_ok=True)
    open(os.path.join(ROOT, path, "index.html"), "w", encoding="utf-8").write(page(env))
    open(os.path.join(ROOT, path, "manifest.webmanifest"), "w").write(manifest(env))
json.dump({"v": BUILD}, open(os.path.join(ROOT, "version.json"), "w"))
print("built index.html and uat/index.html", BUILD)

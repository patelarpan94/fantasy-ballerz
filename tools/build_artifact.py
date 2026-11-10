"""Build the Claude artifact version of the app (Store = artifact database, Refresh = cloud trigger).

    python3 tools/build_artifact.py OUT.html

Same source as the GitHub build (src/), without the Apps Script store or GitHub-only parts.
Publish OUT.html as index.html of the "Draft Fantasy App" artifact (hist/ files stay as published).
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
r = lambda f: open(os.path.join(SRC, f), encoding="utf-8").read()
src_build = open(os.path.join(ROOT, "tools", "build_gh.py"), encoding="utf-8").read()
# the JS parts in the same order as tools/build_gh.py's body (variables there: c, oh, ps, zs, d)
seg = src_build[src_build.index("body = ("):]; seg = seg[:seg.index("\n\n")]
names = {"c": "c_views.js", "oh": "o_hist.js", "ps": "p_shots.js", "zs": "z_style.js", "d": "d_app.js"}
files = [m.group(1) or names[m.group(2)] for m in re.finditer(r'r\("([a-z0-9_]+\.js)"\)|\b(c|oh|ps|zs|d)\b(?=\s*[+)])', seg)]
b = r("baseline-week-board.html").split("\n")
data = json.loads(b[490][len("const DATA="):].rstrip(";"))
css = "\n".join(b[2:352]); svg = "\n".join(b[394:403])
a = r("a_core.js").replace("/*SCHED*/", json.dumps(data["S"], separators=(",", ":"))).replace("/*POOL*/", r("pool_compact.json"))
ids = {}
for f in sorted(os.listdir(os.path.join(ROOT, "hist"))):
    if f.endswith(".json"):
        for pid, nm in json.load(open(os.path.join(ROOT, "hist", f))).get("p", []): ids[nm] = int(pid)
part = {"o_hist.js": r("o_hist.js"), "p_shots.js": r("p_shots.js"), "z_style.js": r("z_style.js").replace("/*ARPIDS*/{}", json.dumps(ids, separators=(",", ":"), ensure_ascii=False))}
js = a + "".join(part.get(f) or r(f) for f in files)
def fold(css):
    out = []; i = 0; key = "@media (max-width:640px){"
    while True:
        j = css.find(key, i)
        if j < 0: break
        k = j + len(key); d = 1; m = k
        while d:
            if css[m] == "{": d += 1
            elif css[m] == "}": d -= 1
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
out = "<title>Draft Fantasy App</title>\n" + css + "\n" + r("shell.html") + "\n" + fcss + svg + "\n" + r("help.html") + "\n" + js
open(sys.argv[1], "w", encoding="utf-8").write(out)
print("built", sys.argv[1], len(out), "bytes;", len(files), "js parts")

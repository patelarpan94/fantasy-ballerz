# Fantasy Ballerz

The Indian Ballerz fantasy basketball app, as a free iPhone/Android home-screen app.

- **Live:** https://patelarpan94.github.io/fantasy-ballerz/
- **UAT (test copy):** https://patelarpan94.github.io/fantasy-ballerz/uat/

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| The app | `index.html`, `uat/index.html` (GitHub Pages) | Everything you see. Built from the artifact source by `tools/build_gh.py`. |
| League data | A Google Sheet per site (Drive folder "Fantasy Ballerz") | Rosters, lineups, trades, chat, waivers, stats. One row per document. |
| Backend | `apps-script/Code.gs`, pasted into each Sheet's Extensions › Apps Script | Reads/writes the Sheet for the app, checks team codes, pulls ESPN. |
| ESPN feed | In the app (`web/gas_tail.js`), runs `Code.gs`'s pull in a background worker | ESPN's box-score feed refuses Google's servers but allows browsers, so one open device at a time (2.5-min lease in `refresh/feed`) pulls: every minute from 1 h before the first tip to 1 h after the last final, full pull (injuries, news, ownership) hourly. The Apps Script timer still tries hourly and handles ESPN fantasy data, which Google can reach. |
| History | `hist/` | Past seasons' box scores and shots (static files shared by Live and UAT). |

Team codes, chat and league data live only in the private Sheets, never in this repo.

## Setting up a backend (once per Sheet)

1. Open the Sheet › **Extensions › Apps Script**. Replace `Code.gs` with `apps-script/Code.gs` and save.
2. Pick **setup** in the function list and press **Run**. Allow the permissions. It loads `"<Sheet name> backup.json.gz"` from Drive if the Sheet is empty, turns on the timer and does a first ESPN pull.
3. **Deploy › New deployment › Web app**, Execute as **Me**, Who has access **Anyone**. Copy the `/exec` URL into `config.json` and rebuild.

When `Code.gs` changes: paste it again, then **Deploy › Manage deployments › Edit › Version: New version › Deploy** (keeps the same URL).

## Building

```
python3 tools/build_gh.py <artifact src dir> <baseline-week-board.html>
```

Local test with an emulated Apps Script backend: `SEED=backup.json node tools/mock/server.js`, then open `http://localhost:8080/?backend=http://localhost:8080/exec`.

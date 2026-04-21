# Vardania Host — Simple Property Manager

This is a small static web app to view bookings and expenses for a couple of apartments.

Quick overview

- HTML: `vardania_host.html`
- JS: `js/app.js` (loads data and renders the React UI)
- CSS: `css/styles.css`
- Data: `data/bookings.json`, `data/expenses.json`, `data/apartments.json`
- Data: `server/data/bookings.json`, `server/data/expenses.json`, `server/data/apartments.json`
  Run locally

1. Serve the folder over HTTP (browsers block `fetch()` for local files). From PowerShell:

```powershell
cd "c:\Users\ilias\OneDrive\Εκπαίδευση\Εργασία\Apartments\web_app"
py -3 -m http.server 8000
# open http://localhost:8000/vardania_host.html
```

Data files

- The canonical JSON data files are stored under `server/data/` (e.g. `server/data/bookings.json`).

File-only usage

- You can open `vardania_host.html` directly, but some browsers may block fetching local JSON files. For reliable loading and to persist edits to disk, run the included Node server (see "Persistent edits (API)").

Notes

- The UI includes category filter tiles above the expenses table (including a "Total" tile).
- Clicking a category shows only that category's expenses; "Total" and the default selection show all expenses.
- To add or edit data, update the JSON files in `data/`.
- To add or edit data, update the JSON files in `server/data/`.
  Persistent edits (API)

- A small Node/Express server is provided under `server/` to persist edits to the JSON files.
- Run it from the project root:

```powershell
cd "c:\Users\ilias\OneDrive\Εκπαίδευση\Εργασία\Apartments\web_app\server"
npm install
npm start
# open http://localhost:3001/vardania_host.html
```

The server exposes `PUT /api/bookings/:id` and `PUT /api/expenses/:id` to update the corresponding JSON files.

Note: GitHub sync and GitHub Pages instructions removed. Run the included local Node server to persist edits to `server/data/*.json` (see "Persistent edits (API)" above).

# Vardania Host — Simple Property Manager

This is a small static web app to view bookings and expenses for a couple of apartments.

Quick overview

- HTML: `vardania_host.html`
- JS: `js/app.js` (loads data and renders the React UI)
- CSS: `css/styles.css`
- Data: `data/bookings.json`, `data/expenses.json`, `data/apartments.json`

Run locally

1. Serve the folder over HTTP (browsers block `fetch()` for local files). From PowerShell:

```powershell
cd "c:\Users\ilias\OneDrive\Εκπαίδευση\Εργασία\Apartments\web_app"
py -3 -m http.server 8000
# open http://localhost:8000/vardania_host.html
```

Notes

- The UI includes category filter tiles above the expenses table (including a "Total" tile).
- Clicking a category shows only that category's expenses; "Total" and the default selection show all expenses.
- To add or edit data, update the JSON files in `data/`.

Persistent edits (API)

- A small Node/Express server is provided under `server/` to persist edits to the JSON files.
- Run it from the project root:

```powershell
cd "c:\Users\ilias\OneDrive\Εκπαίδευση\Εργασία\Apartments\web_app\server"
npm install
npm start
# open http://localhost:3000/vardania_host.html
```

The server exposes `PUT /api/bookings/:id` and `PUT /api/expenses/:id` to update the corresponding JSON files.

Hosted on GitHub Pages

- GitHub Pages is static hosting, so it cannot write `data/*.json` files by itself.
- In offline mode, the dashboard now supports two options:
  - Download updated JSON files and commit them manually.
  - Configure GitHub sync (owner/repo/branch + token) and let the app write `data/*.json` via the GitHub Contents API.

GitHub sync token requirements

- Use a token that can write repository contents for this repo.
- Suggested minimum scope: repository contents write access.
- The token is stored in browser `localStorage` for this site.

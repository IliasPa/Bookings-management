# Apartment Manager v1.0

Short-rental property management app for two apartments in Lefkada, Greece.

**Live app:** https://iliaspa.github.io/Bookings-management/

---

## Features

### Overview

- Stats row 1: Gross Revenue · Net Revenue · Net Profit (gross/commission hidden when toggle off)
- Stats row 2: Total Expenses · Consumables Cost · Cleaning Cost
- Per-apartment breakdown: bookings, nights, net revenue, expenses, profit
- Charts:
  - Net Revenue by Apartment (pie)
  - Expenses by Room or Category (pie, filterable by apartment)
  - Revenue by Platform (bar, filterable by apartment)
  - Daily Gains (line chart, one point per booking night per apartment)
- Occupancy Calendar: 3-month view with continuous booking bars, prev/next navigation
- Upcoming Bookings: all future bookings sorted by check-in
- Upcoming Cleanings: all future cleaning events, toggle to show/hide self-cleaned items

### Bookings

- Add, edit, delete bookings
- Fields: apartment, check-in, check-out, nights (auto), platform, reservation, commission, net income (auto), notes
- Filter: All / Upcoming / Past — with a visual divider between past and upcoming in All view
- Per-apartment tabs or all-apartments view
- Toggle to show/hide gross & commission columns (Settings → Display)

### Expenses

- Add, edit, delete expenses
- Fields: apartment, room (categoryI), sub-category (categoryII), item, supplier, quantity, cost/unit, total cost (auto-fill both ways), notes
- Status toggle: ✅ = happened, included in totals · ⬜ = pending, excluded from totals
- Filters: apartment, room, category, keyword search, sort by date/cost
- Summary cards per apartment + grand total (pending expenses excluded)
- Categories customisable in Settings and synced to GitHub

### Owners

- Add/remove owners per apartment
- Set ownership percentage (validates 100% per apartment)
- Income distribution table showing each owner's share

### Consumables

- Track stock purchases: name, apartment, cost model, quantity, total cost, notes
- Cost models:
  - **Per stay** — fixed amount used each stay (e.g. welcome kit: 1 per stay)
  - **Per guest** — consumed per guest (e.g. shampoo sachets: 2 per guest, default 4 guests)
- Auto-calculates stays since purchase, units consumed, units remaining
- Stock bar: green >50% · amber ≤20% · red 0%
- Low stock alert card (≤20% remaining, excludes retired items)
- Retire flag: marks an item as discontinued — excluded from Low Stock alerts, costs still counted in net profit
- Filter by apartment or show retired items

### Cleaning

- Full clean scheduled **before each booking** (on the previous guest's checkout date)
- Bedding change events during long stays — interval configurable (default 4 days)
- Smart scheduling: bedding change skipped if only 1 night remains after it
- Timing suggestion: Preferred (weekend slot) · Flexible (weekday evening) · Compromise (back-to-back 11:00–15:00)
- Self-clean toggle: click the cost amount to mark as done yourself (greyed out, excluded from cost totals and net profit)
- Filter: Charged only / All
- Preferences: full clean cost, bedding change cost, bedding interval — stored in `cleaning.json` on GitHub

### Settings

- **GitHub Integration** — owner, repo, branch, personal access token (token stored only in browser localStorage, never synced)
- **Display** — toggle to show/hide gross & commission in Bookings and Overview
- **Apartments** — add, rename, delete, add notes; changes synced to GitHub
- **Expense Categories** — add/delete rooms and sub-categories, reset to defaults; synced to GitHub via `expenses.json`

---

## Data

All data is stored as JSON files in the GitHub repo under `data/`, read and written via the GitHub Git Data API (single commit per push):

| File | Contents |
|---|---|
| `data/bookings.json` | Booking records |
| `data/expenses.json` | `{ expenses: [...], categories: {...} }` |
| `data/apartments.json` | Apartment definitions |
| `data/consumables.json` | Consumable stock entries |
| `data/cleaning.json` | `{ hiddenCosts: [...], rates: {...} }` |

**localStorage** (browser only, not synced to GitHub):
- `gh_token` — GitHub Personal Access Token
- `gh_config` — repo owner / name / branch
- `show_booking_financials` — display toggle
- `data_cache` — last fetched data snapshot (offline fallback)

---

## Stack

- **React 18 + Vite 5** — static SPA, no server
- **Tailwind CSS 3** — styling
- **Recharts** — BarChart, PieChart, LineChart
- **React Router v6** (HashRouter) — required for GitHub Pages
- **GitHub Git Data API** — atomic single-commit writes for all data files

---

## Develop

```bash
npm install
npm run dev     # http://localhost:5173/Bookings-management/
npm run build   # outputs to docs/ for GitHub Pages
```

## Deploy

GitHub Pages serves from the `docs/` folder on the `main` branch. After `npm run build`, commit and push the `docs/` changes.

## Setup

1. Open the live app URL
2. Go to **Settings → GitHub Integration**
3. Enter your GitHub Personal Access Token (needs `repo` scope)
4. Click **Save** — the token is stored only in your browser's localStorage

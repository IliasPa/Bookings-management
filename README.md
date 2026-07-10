# Apartment Manager v1.6

Short-rental property management app for two apartments in Lefkada, Greece.
Works on desktop and phone: on small screens the sidebar becomes a slide-in menu (☰), stat cards stack, and wide tables scroll horizontally.

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
- Fields: apartment, check-in, check-out, nights (auto), platform, reservation, commission, net income (auto), guest name, guest ID, tax number, notes
- Guest personal data (name, ID, tax number) stored but not shown in the bookings table
- Filter: All / Upcoming / Past — with a visual divider between past and upcoming in All view
- Per-apartment tabs or all-apartments view
- Toggle to show/hide gross & commission columns (Settings → Display)
- **Email by Month** dropdown — generates formatted emails with monthly booking details:
  - Includes guest information, reservation amounts, payment method, dates, and platform
  - Sends to the accountant's email with pre-filled subject and body

### Expenses

- Add, edit, delete expenses
- Fields: apartment, room (categoryI), sub-category (categoryII), item, supplier, **who purchased** (owner or manager, default manager), quantity, cost/unit, total cost (auto-fill both ways), notes
- Depreciating asset flag: ✅ = amortized asset (shown in the Depr. column)
- **Who** column — color-coded badge per person showing who paid; ⚠️ when the stored payer doesn't match any current person (those entries count as the manager's in the income distribution)
- Filters: apartment, room, category, keyword search, sort by date/cost
- Summary cards per apartment + grand total
- Categories customisable in Settings and synced to GitHub

### Owners

- **Apartment Management** — add/remove apartments, manage owner info
  - Owner name and phone per apartment
  - ΑΜΑ number (Greek tax registration number) per apartment
- **Accountant Card** — manage accountant contact information
  - Name, phone, email for communicating booking details
- **Ownership Shares** — set ownership percentage per apartment (validates 100% per apartment)
- **Income Distribution** — table showing each person's share per apartment, plus two summary columns:
  - **Apartment columns / Net** — share of net profit (booking income minus that apartment's expenses, consumables & cleaning; "General" costs are spread across apartments in proportion to their booking income)
  - **Total** — net plus reimbursement of everything that person paid out of pocket in Expenses & Consumables (missing payers default to the manager), plus the whole charged cleaning bill for the manager (who pays the cleaner)
  - The sum of all Totals equals the total booking income — owners never receive more than the revenue

### Consumables

- Track stock purchases: name, apartment, cost model, quantity, total cost, who purchased (owner or manager, default manager), notes
- Cost models:
  - **Per stay** — fixed amount used each stay (e.g. welcome kit: 1 per stay)
  - **Per guest** — consumed per guest (e.g. shampoo sachets: 2 per guest, default 4 guests)
- Auto-calculates stays since purchase, units consumed, units remaining
- **Who** column — same color-coded payer badge as in Expenses (⚠️ for unknown payers)
- Stock bar: green >50% · amber ≤20% · red 0%
- Low stock alert card (≤20% remaining, excludes retired items)
- Retire flag: marks an item as discontinued — excluded from Low Stock alerts, costs still counted in net profit
- Filter by apartment or show retired items

### Cleaning

- Full clean scheduled **before each booking** (on the previous guest's checkout date)
- Bedding change events during long stays — interval configurable (default 4 days)
- Smart scheduling: bedding change skipped if only 1 night remains after it
- Timing suggestion: Preferred (weekend slot) · Flexible (weekday evening) · Compromise (back-to-back 11:00–15:00)
- Each job card shows, at a glance: apartment • job · suggested date, time slot and flexibility · the timing window · and the related stay (check-in → check-out • nights)
- A cleaning stays **upcoming until the guest it prepares for checks in** — a job whose ideal date has passed but whose booking hasn't started yet is not treated as past
- **Copy schedule for cleaner** — one button copies the upcoming schedule as plain **Greek** text (no prices, self-cleaned jobs excluded), ready to paste into a chat; compromise (tight same-day) jobs are flagged
- Self-clean toggle: click the cost amount to mark as done yourself (greyed out, excluded from cost totals and net profit)
- Summary cards: upcoming full cleans · bedding changes · **Total cost** — everything owed to the cleaner across all charged jobs, past and future
- Filter: apartment · Charged only · Upcoming / All
- Preferences: full clean cost, bedding change cost, bedding interval — stored in `cleaning.json` on GitHub

### Notes

- Free-form notes tab for reminders and contacts (e.g. pest-control certificate details), synced to GitHub inside `apartments.json`

### Settings

- **GitHub Integration** — owner, repo, branch, personal access token (token stored only in browser localStorage, never synced)
- **Display** — toggle to show/hide gross & commission in Bookings and Overview
- **Apartments** — add, rename, delete, add notes; changes synced to GitHub
- **Expense Categories** — add/delete rooms and sub-categories, reset to defaults; synced to GitHub via `expenses.json`

---

## Data

All data is stored as JSON files in the GitHub repo under `data/`, read and written **at runtime** via the GitHub Git Data API (single commit per push). The app is the source of truth for these files — the local `data/` folder is git-ignored so working-copy snapshots are never committed on top of the live data:

| File | Contents |
|---|---|
| `data/bookings.json` | Booking records (includes guest personal data) |
| `data/expenses.json` | `{ expenses: [...], categories: {...} }` |
| `data/apartments.json` | Apartment definitions + accountant contact info |
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

const { useState, useMemo, useEffect } = React;

const PLT = {
  Booking: "#1a3f6f",
  Airbnb: "#c0392b",
  Friends: "#2d7a5a",
  "Face-Face": "#8c6d20",
};
const fmt = (n) =>
  `€${parseFloat(n).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtD = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
const today = new Date().toISOString().slice(0, 10);
// API base (Node server)
// Note: server defaults to port 3001 to avoid conflicts with VS Code Live Preview
const API_BASE = "http://localhost:3001";

function BookingForm({
  initial = null,
  apartments = [],
  onSave,
  onCancel,
  onDelete,
}) {
  const defaults = {
    apt: apartments.length ? apartments[0].id : "Rebekka",
    checkIn: "",
    checkOut: "",
    platform: "Booking",
    gross: "",
    commission: "",
  };
  const [f, setF] = useState(initial ? { ...initial } : { ...defaults });
  useEffect(
    () => setF(initial ? { ...initial } : { ...defaults }),
    [initial, apartments],
  );
  const mode = initial && initial.id ? "edit" : "new";
  const save = () => {
    const gross = parseFloat(f.gross) || 0;
    const commission = parseFloat(f.commission) || 0;
    const payload = {
      ...f,
      gross,
      commission,
      nights:
        f.checkIn && f.checkOut
          ? Math.round((new Date(f.checkOut) - new Date(f.checkIn)) / 86400000)
          : f.nights || 0,
      net: gross - commission,
    };
    if (initial && initial.id) payload.id = initial.id;
    onSave(payload, mode);
  };
  return (
    <div className="form-panel">
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 14,
          color: "var(--text-primary)",
        }}
      >
        {mode === "edit" ? "Edit booking" : "New booking"}
      </div>
      <div className="form-grid">
        <div className="fg full">
          <label className="fl">Property</label>
          <select
            value={f.apt}
            onChange={(e) => setF((p) => ({ ...p, apt: e.target.value }))}
          >
            {apartments.length ? (
              apartments.map((a) => <option key={a.id}>{a.id}</option>)
            ) : (
              <>
                <option>Rebekka</option>
                <option>Back</option>
              </>
            )}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Check-in</label>
          <input
            type="date"
            value={f.checkIn}
            onChange={(e) => setF((p) => ({ ...p, checkIn: e.target.value }))}
          />
        </div>
        <div className="fg">
          <label className="fl">Check-out</label>
          <input
            type="date"
            value={f.checkOut}
            onChange={(e) => setF((p) => ({ ...p, checkOut: e.target.value }))}
          />
        </div>
        <div className="fg">
          <label className="fl">Platform</label>
          <select
            value={f.platform}
            onChange={(e) => setF((p) => ({ ...p, platform: e.target.value }))}
          >
            <option>Booking</option>
            <option>Airbnb</option>
            <option>Friends</option>
            <option>Face-Face</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Gross (€)</label>
          <input
            type="number"
            placeholder="0.00"
            value={f.gross}
            onChange={(e) => setF((p) => ({ ...p, gross: e.target.value }))}
          />
        </div>
        <div className="fg full">
          <label className="fl">Commission (€)</label>
          <input
            type="number"
            placeholder="0.00"
            value={f.commission}
            onChange={(e) =>
              setF((p) => ({ ...p, commission: e.target.value }))
            }
          />
        </div>
        <div className="factions">
          {mode === "edit" && (
            <button
              type="button"
              className="delbtn"
              onClick={() => {
                if (!confirm("Delete this booking?")) return;
                onDelete && onDelete(initial.id);
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="addbtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="addbtn"
            onClick={save}
            style={{ fontWeight: 500 }}
          >
            Save booking
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseForm({
  initial = null,
  apartments = [],
  onSave,
  onCancel,
  onDelete,
}) {
  const defaults = {
    apt: apartments.length ? apartments[0].id : "Rebekka",
    room: "Kitchen",
    cat: "Appliances",
    item: "",
    qty: 1,
    cost: "",
    paid: false,
  };
  const [f, setF] = useState(initial ? { ...initial } : { ...defaults });
  useEffect(
    () => setF(initial ? { ...initial } : { ...defaults }),
    [initial, apartments],
  );
  const mode = initial && initial.id ? "edit" : "new";
  const save = () => {
    const qty = parseInt(f.qty) || 1;
    const cost = parseFloat(f.cost) || 0;
    const payload = { ...f, qty, cost, total: qty * cost };
    if (initial && initial.id) payload.id = initial.id;
    onSave(payload, mode);
  };
  return (
    <div className="form-panel">
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 14,
          color: "var(--text-primary)",
        }}
      >
        {mode === "edit" ? "Edit expense" : "New expense"}
      </div>
      <div className="form-grid">
        <div className="fg">
          <label className="fl">Property</label>
          <select
            value={f.apt}
            onChange={(e) => setF((p) => ({ ...p, apt: e.target.value }))}
          >
            {apartments.length ? (
              apartments.map((a) => <option key={a.id}>{a.id}</option>)
            ) : (
              <>
                <option>Rebekka</option>
                <option>Back</option>
                <option>General</option>
              </>
            )}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Room</label>
          <select
            value={f.room}
            onChange={(e) => setF((p) => ({ ...p, room: e.target.value }))}
          >
            {["Kitchen", "Bathroom", "Bedroom", "Livingroom", "Outside"].map(
              (r) => (
                <option key={r}>{r}</option>
              ),
            )}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Category</label>
          <select
            value={f.cat}
            onChange={(e) => setF((p) => ({ ...p, cat: e.target.value }))}
          >
            {["Appliances", "Furniture", "Linens", "Utilities", "Internet"].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Item name</label>
          <input
            type="text"
            placeholder="e.g. Iron"
            value={f.item}
            onChange={(e) => setF((p) => ({ ...p, item: e.target.value }))}
          />
        </div>
        <div className="fg">
          <label className="fl">Quantity</label>
          <input
            type="number"
            min="1"
            value={f.qty}
            onChange={(e) => setF((p) => ({ ...p, qty: e.target.value }))}
          />
        </div>
        <div className="fg">
          <label className="fl">Cost / unit (€)</label>
          <input
            type="number"
            placeholder="0.00"
            value={f.cost}
            onChange={(e) => setF((p) => ({ ...p, cost: e.target.value }))}
          />
        </div>
        <div
          className="fg full"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <input
            type="checkbox"
            id="pc2"
            checked={f.paid}
            onChange={(e) => setF((p) => ({ ...p, paid: e.target.checked }))}
          />
          <label
            htmlFor="pc2"
            style={{
              fontSize: 13,
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            Already paid
          </label>
        </div>
        <div className="factions">
          {mode === "edit" && (
            <button
              type="button"
              className="delbtn"
              onClick={() => {
                if (!confirm("Delete this expense?")) return;
                onDelete && onDelete(initial.id);
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="addbtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="addbtn"
            onClick={save}
            style={{ fontWeight: 500 }}
          >
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
}

function App({ initialBookings = [], initialExpenses = [], initialApts = [] }) {
  const [tab, setTab] = useState(
    () => localStorage.getItem("activeTab") || "dashboard",
  );
  const [bookings, setBookings] = useState(initialBookings);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [apt, setApt] = useState("All");
  const [formType, setFormType] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deletedBookings, setDeletedBookings] = useState([]);
  const [deletedExpenses, setDeletedExpenses] = useState([]);
  const [showBin, setShowBin] = useState(null);
  const [catFilter, setCatFilter] = useState("All");
  const [showSync, setShowSync] = useState(false);
  const [syncCfg, setSyncCfg] = useState({
    owner: "IliasPa",
    repo: "Bookings-management",
    branch: "main",
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vardania.githubSync");
      if (raw) {
        const parsed = JSON.parse(raw || "{}");
        setSyncCfg({
          owner: parsed.owner || "IliasPa",
          repo: parsed.repo || "Bookings-management",
          branch: parsed.branch || "main",
        });
      }
    } catch (e) {}
  }, []);

  const saveGitHubSync = () => {
    try {
      // Persist only non-sensitive fields (owner, repo, branch)
      const toSave = { owner: syncCfg.owner, repo: syncCfg.repo, branch: syncCfg.branch };
      localStorage.setItem("vardania.githubSync", JSON.stringify(toSave));
      alert("GitHub sync config saved to localStorage.");
      setShowSync(false);
    } catch (e) {
      alert("Failed to save GitHub sync config");
    }
  };

  const clearGitHubSync = () => {
    try {
      localStorage.removeItem("vardania.githubSync");
      setSyncCfg({
        owner: "IliasPa",
        repo: "Bookings-management",
        branch: "main",
      });
      alert("GitHub sync config cleared.");
    } catch (e) {
      alert("Failed to clear GitHub sync config");
    }
  };
  useEffect(() => {
    try {
      localStorage.setItem("activeTab", tab);
    } catch (e) {}
  }, [tab]);

  useEffect(() => {
    async function loadDeleted() {
      try {
        const [dbRes, deRes] = await Promise.all([
          fetch(`${API_BASE}/api/deleted/bookings`),
          fetch(`${API_BASE}/api/deleted/expenses`),
        ]);
        const [DB, DE] = await Promise.all([
          dbRes.ok ? dbRes.json() : [],
          deRes.ok ? deRes.json() : [],
        ]);
        setDeletedBookings(DB || []);
        setDeletedExpenses(DE || []);
      } catch (err) {
        console.warn("Failed to load deleted items", err);
      }
    }
    loadDeleted();
  }, []);

  const stats = useMemo(() => {
    const c = (a) => {
      const bk = bookings.filter((b) => b.apt === a);
      const ex = expenses.filter((e) => e.apt === a);
      return {
        revenue: bk.reduce((s, b) => s + (parseFloat(b.net) || 0), 0),
        expenses: ex.reduce((s, e) => s + (parseFloat(e.total) || 0), 0),
        nights: bk.reduce((s, b) => s + (parseInt(b.nights) || 0), 0),
        count: bk.length,
        get profit() {
          return this.revenue - this.expenses;
        },
      };
    };
    return { R: c("Rebekka"), B: c("Back") };
  }, [bookings, expenses]);

  const totalRev = stats.R.revenue + stats.B.revenue;
  const totalProfit = stats.R.profit + stats.B.profit;
  const totalNights = stats.R.nights + stats.B.nights;
  const filteredExpenses = expenses.filter(
    (e) =>
      (apt === "All" || e.apt === apt) &&
      (catFilter === "All" || catFilter === "Total" || e.cat === catFilter),
  );

  const addBooking = async (payload) => {
    if (!payload.checkIn || !payload.checkOut || !payload.gross) return;
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert("Failed to create booking");
        return;
      }
      const created = await res.json();
      setBookings((p) => [...p, created]);
      setFormType(null);
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert("Error creating booking");
    }
  };

  const addExpense = async (payload) => {
    if (!payload.item) return;
    try {
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert("Failed to create expense");
        return;
      }
      const created = await res.json();
      setExpenses((p) => [...p, created]);
      setFormType(null);
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert("Error creating expense");
    }
  };

  const handleSaveBooking = async (payload, mode) => {
    const currentTab = tab;
    if (mode === "edit") {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${payload.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          alert("Failed to save booking");
          return;
        }
        const updated = await res.json();
        // Use string comparison for ids to avoid type issues
        setBookings((p) =>
          p.map((b) => (String(b.id) === String(updated.id) ? updated : b)),
        );
        setFormType(null);
        setEditItem(null);
        setTab(currentTab);
      } catch (err) {
        console.error(err);
        alert("Error saving booking");
      }
    } else {
      await addBooking(payload);
    }
  };

  const handleSaveExpense = async (payload, mode) => {
    const currentTab = tab;
    if (mode === "edit") {
      try {
        const res = await fetch(`${API_BASE}/api/expenses/${payload.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          alert("Failed to save expense");
          return;
        }
        const updated = await res.json();
        // Use string comparison for ids to avoid type issues
        setExpenses((p) =>
          p.map((e) => (String(e.id) === String(updated.id) ? updated : e)),
        );
        setFormType(null);
        setEditItem(null);
        setTab(currentTab);
      } catch (err) {
        console.error(err);
        alert("Error saving expense");
      }
    } else {
      await addExpense(payload);
    }
  };

  const handleDeleteBooking = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Failed to delete booking");
        return;
      }
      const removed = await res.json();
      setBookings((p) => p.filter((b) => String(b.id) !== String(id)));
      setDeletedBookings((p) => [...p, removed]);
      setFormType(null);
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting booking");
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Failed to delete expense");
        return;
      }
      const removed = await res.json();
      setExpenses((p) => p.filter((e) => String(e.id) !== String(id)));
      setDeletedExpenses((p) => [...p, removed]);
      setFormType(null);
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting expense");
    }
  };

  const handleRestoreBooking = async (id) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/deleted/bookings/${id}/restore`,
        { method: "POST" },
      );
      if (!res.ok) {
        alert("Failed to restore booking");
        return;
      }
      const restored = await res.json();
      setBookings((p) => [...p, restored]);
      setDeletedBookings((p) => p.filter((d) => String(d.id) !== String(id)));
    } catch (err) {
      console.error(err);
      alert("Error restoring booking");
    }
  };

  const handleRestoreExpense = async (id) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/deleted/expenses/${id}/restore`,
        { method: "POST" },
      );
      if (!res.ok) {
        alert("Failed to restore expense");
        return;
      }
      const restored = await res.json();
      setExpenses((p) => [...p, restored]);
      setDeletedExpenses((p) => p.filter((d) => String(d.id) !== String(id)));
    } catch (err) {
      console.error(err);
      alert("Error restoring expense");
    }
  };
  const nav = (t) => {
    setTab(t);
    setFormType(null);
    setApt("All");
  };

  const AptBadge = ({ a }) => (
    <span
      className="badge"
      style={{
        background:
          a === "Rebekka" ? "#1a3f6f" : a === "Back" ? "#3B6D11" : "#5f5e5a",
        color: "#fff",
      }}
    >
      {a}
    </span>
  );
  const PlatBadge = ({ p }) => (
    <span
      className="badge"
      style={{ background: PLT[p] || "#888", color: "#fff" }}
    >
      {p}
    </span>
  );

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-name">Vardania Host</div>
          <div className="logo-sub">Property Manager</div>
        </div>
        {[
          ["dashboard", "Dashboard"],
          ["bookings", "Bookings"],
          ["expenses", "Expenses"],
        ].map(([k, l]) => (
          <div
            key={k}
            className={`nav-item${tab === k ? " active" : ""}`}
            onClick={() => nav(k)}
          >
            {l}
          </div>
        ))}
        <div style={{ padding: 10, paddingTop: 6 }}>
          {showSync && (
            <div style={{ marginTop: 8 }}>
              <label className="fl">Owner</label>
              <input
                value={syncCfg.owner}
                onChange={(e) =>
                  setSyncCfg((s) => ({ ...s, owner: e.target.value }))
                }
              />
              <label className="fl">Repo</label>
              <input
                value={syncCfg.repo}
                onChange={(e) =>
                  setSyncCfg((s) => ({ ...s, repo: e.target.value }))
                }
              />
              <label className="fl">Branch</label>
              <input
                value={syncCfg.branch}
                onChange={(e) =>
                  setSyncCfg((s) => ({ ...s, branch: e.target.value }))
                }
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="addbtn"
                  onClick={saveGitHubSync}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="delbtn"
                  onClick={clearGitHubSync}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="sidebar-foot">2 properties · 2026</div>
      </div>

      <div className="main">
        {tab === "dashboard" && (
          <>
            <div className="page-title">Overview</div>
            <div className="page-sub">Season 2026 · both properties</div>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Total revenue</div>
                <div className="kpi-value">{fmt(totalRev)}</div>
                <div className="kpi-sub">net after commissions</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Net profit</div>
                <div
                  className={`kpi-value ${totalProfit >= 0 ? "profit-pos" : "profit-neg"}`}
                >
                  {fmt(totalProfit)}
                </div>
                <div className="kpi-sub">revenue – expenses</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Total nights</div>
                <div className="kpi-value">{totalNights}</div>
                <div className="kpi-sub">{bookings.length} bookings total</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Avg / night</div>
                <div className="kpi-value">
                  {totalNights ? fmt(totalRev / totalNights) : "€0"}
                </div>
                <div className="kpi-sub">blended net rate</div>
              </div>
            </div>
            <div className="apt-grid">
              {[
                ["Rebekka", "Rebekka's apartment", stats.R],
                ["Back", "Back's apartment", stats.B],
              ].map(([a, label, s]) => (
                <div key={a} className="card">
                  <div className="card-header">
                    <div className="card-title">{label}</div>
                    <div className="card-meta">
                      {s.count} stays · {s.nights} nights
                    </div>
                  </div>
                  <div className="apt-stats">
                    {[
                      ["Revenue", s.revenue, ""],
                      ["Expenses", s.expenses, ""],
                      [
                        "Profit",
                        s.profit,
                        s.profit >= 0 ? "profit-pos" : "profit-neg",
                      ],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <div className="stat-label">{l}</div>
                        <div className={`stat-val ${c}`}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {typeof Charts !== "undefined" ? (
              <Charts bookings={bookings} expenses={expenses} />
            ) : (
              <div className="card">
                <div className="section-title">Charts</div>
                <div style={{ padding: 12, color: "#c0392b" }}>
                  Charts failed to load — refresh or check Recharts inclusion.
                </div>
              </div>
            )}
          </>
        )}

        {tab === "bookings" && (
          <>
            <div className="hrow">
              <div>
                <div className="page-title">Bookings</div>
                <div className="page-sub">All reservations · season 2026</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className={`fbtn${showBin === "bookings" ? " active" : ""}`}
                  onClick={() =>
                    setShowBin(showBin === "bookings" ? null : "bookings")
                  }
                >
                  Bin
                </button>
                <button
                  type="button"
                  className="addbtn"
                  onClick={() => {
                    if (formType === "booking") {
                      setFormType(null);
                      setEditItem(null);
                    } else {
                      setFormType("booking");
                      setEditItem(null);
                      setShowBin(null);
                    }
                  }}
                >
                  + Add booking
                </button>
              </div>
            </div>
            {showBin === "bookings" && (
              <div className="card">
                <div className="section-title">Recycle Bin — Bookings</div>
                <table>
                  <thead>
                    <tr>
                      {[
                        "Property",
                        "Check-in",
                        "Check-out",
                        "Nights",
                        "Platform",
                        "Net",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {deletedBookings.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <AptBadge a={d.apt} />
                        </td>
                        <td>{d.checkIn}</td>
                        <td>{d.checkOut}</td>
                        <td>{d.nights}</td>
                        <td>
                          <PlatBadge p={d.platform} />
                        </td>
                        <td style={{ fontWeight: 500 }}>{fmt(d.net)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="addbtn"
                            onClick={() => handleRestoreBooking(d.id)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {formType === "booking" && (
              <BookingForm
                initial={formType === "booking" ? editItem : null}
                apartments={initialApts}
                onSave={handleSaveBooking}
                onDelete={handleDeleteBooking}
                onCancel={() => {
                  setFormType(null);
                  setEditItem(null);
                }}
              />
            )}
            <div className="frow">
              {["All", "Rebekka", "Back"].map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`fbtn${apt === a ? " active" : ""}`}
                  onClick={() => setApt(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    {[
                      "Property",
                      "Check-in",
                      "Check-out",
                      "Nights",
                      "Platform",
                      "Gross",
                      "Commission",
                      "Net",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter((b) => apt === "All" || b.apt === apt)
                    .sort((a, b) => {
                      const aPast = (a.checkOut || "") < today;
                      const bPast = (b.checkOut || "") < today;
                      if (aPast !== bPast) return aPast ? 1 : -1;
                      return (a.checkIn || "").localeCompare(b.checkIn || "");
                    })
                    .map((b) => (
                      <tr
                        key={b.id}
                        className={b.checkOut < today ? "dim" : ""}
                      >
                        <td>
                          <AptBadge a={b.apt} />
                        </td>
                        <td>{fmtD(b.checkIn)}</td>
                        <td>{fmtD(b.checkOut)}</td>
                        <td>{b.nights}</td>
                        <td>
                          <PlatBadge p={b.platform} />
                        </td>
                        <td>{fmt(b.gross)}</td>
                        <td style={{ color: "#c0392b" }}>
                          {b.commission > 0 ? `-${fmt(b.commission)}` : "—"}
                        </td>
                        <td style={{ fontWeight: 500 }}>{fmt(b.net)}</td>
                        <td className="row-edit" style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => {
                              setFormType("booking");
                              setEditItem(b);
                              setTimeout(() => {
                                const el =
                                  document.querySelector(".form-panel");
                                if (el)
                                  el.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }, 80);
                            }}
                          >
                            ✎
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "expenses" && (
          <>
            <div className="hrow">
              <div>
                <div className="page-title">Expenses</div>
                <div className="page-sub">
                  Equipment & purchases per property
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className={`fbtn${showBin === "expenses" ? " active" : ""}`}
                  onClick={() =>
                    setShowBin(showBin === "expenses" ? null : "expenses")
                  }
                >
                  Bin
                </button>
                <button
                  type="button"
                  className="addbtn"
                  onClick={() => {
                    if (formType === "expense") {
                      setFormType(null);
                      setEditItem(null);
                    } else {
                      setFormType("expense");
                      setEditItem(null);
                      setShowBin(null);
                    }
                  }}
                >
                  + Add expense
                </button>
              </div>
            </div>
            {showBin === "expenses" && (
              <div className="card">
                <div className="section-title">Recycle Bin — Expenses</div>
                <table>
                  <thead>
                    <tr>
                      {[
                        "Property",
                        "Room",
                        "Category",
                        "Item",
                        "Qty",
                        "Total",
                        "Paid",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {deletedExpenses.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <AptBadge a={d.apt} />
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {d.room}
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {d.cat}
                        </td>
                        <td style={{ fontWeight: 500 }}>{d.item}</td>
                        <td>{d.qty}</td>
                        <td style={{ fontWeight: 500 }}>
                          {d.total > 0 ? fmt(d.total) : "—"}
                        </td>
                        <td>
                          <span
                            className="dot"
                            style={{
                              background: d.paid ? "#2d7a5a" : "#D85A30",
                            }}
                          />
                          {d.paid ? "Paid" : "Pending"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="addbtn"
                            onClick={() => handleRestoreExpense(d.id)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {formType === "expense" && (
              <ExpenseForm
                initial={formType === "expense" ? editItem : null}
                apartments={initialApts}
                onSave={handleSaveExpense}
                onDelete={handleDeleteExpense}
                onCancel={() => {
                  setFormType(null);
                  setEditItem(null);
                }}
              />
            )}
            <div className="frow">
              {["All", "Rebekka", "Back", "General"].map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`fbtn${apt === a ? " active" : ""}`}
                  onClick={() => {
                    setApt(a);
                    setCatFilter("All");
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="cat-row">
              {[
                "Total",
                "Furniture",
                "Appliances",
                "Linens",
                "Utilities",
                "Internet",
              ].map((cat) => {
                const total =
                  cat === "Total"
                    ? expenses
                        .filter((e) => apt === "All" || e.apt === apt)
                        .reduce((s, e) => s + (parseFloat(e.total) || 0), 0)
                    : expenses
                        .filter(
                          (e) =>
                            (apt === "All" || e.apt === apt) && e.cat === cat,
                        )
                        .reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
                if (cat !== "Total" && total <= 0) return null;
                const cls = `kpi filter${catFilter === cat ? " active" : ""}`;
                return (
                  <div
                    key={cat}
                    className={cls}
                    style={{ flex: "0 0 auto", minWidth: 110 }}
                    onClick={() => setCatFilter(cat)}
                  >
                    <div className="kpi-label">{cat}</div>
                    <div className="kpi-value" style={{ fontSize: 15 }}>
                      {fmt(total)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <table>
                <thead>
                  <tr>
                    {[
                      "Property",
                      "Room",
                      "Category",
                      "Item",
                      "Qty",
                      "Cost/unit",
                      "Total",
                      "Paid",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <AptBadge a={e.apt} />
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {e.room}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {e.cat}
                      </td>
                      <td style={{ fontWeight: 500 }}>{e.item}</td>
                      <td>{e.qty}</td>
                      <td>{e.cost > 0 ? fmt(e.cost) : "—"}</td>
                      <td style={{ fontWeight: 500 }}>
                        {e.total > 0 ? fmt(e.total) : "—"}
                      </td>
                      <td>
                        <span
                          className="dot"
                          style={{ background: e.paid ? "#2d7a5a" : "#D85A30" }}
                        />
                        {e.paid ? "Paid" : "Pending"}
                      </td>
                      <td className="row-edit" style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() => {
                            setFormType("expense");
                            setEditItem(e);
                            setTimeout(() => {
                              const el = document.querySelector(".form-panel");
                              if (el)
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }, 80);
                          }}
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

(async function init() {
  try {
    const [bRes, eRes, aRes] = await Promise.all([
      fetch(`${API_BASE}/api/bookings`),
      fetch(`${API_BASE}/api/expenses`),
      fetch(`${API_BASE}/api/apartments`),
    ]);
    const [BOOKINGS, EXPENSES, APARTMENTS] = await Promise.all([
      bRes.json(),
      eRes.json(),
      aRes.json(),
    ]);
    ReactDOM.createRoot(document.getElementById("root")).render(
      <App
        initialBookings={BOOKINGS}
        initialExpenses={EXPENSES}
        initialApts={APARTMENTS}
      />,
    );
  } catch (err) {
    console.error(err);
    document.getElementById("root").innerHTML =
      '<div style="padding:20px;color:#c0392b">Error loading data. Serve the folder over HTTP (e.g. python -m http.server).</div>';
  }
})();

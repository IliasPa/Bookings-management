const { useState, useEffect, useMemo } = React;

function Charts({ bookings: propBookings = null, expenses: propExpenses = null }) {
  const [bookings, setBookings] = useState(propBookings || []);
  const [expenses, setExpenses] = useState(propExpenses || []);
  const [expAptFilter, setExpAptFilter] = useState("All");

  useEffect(() => {
    if (propBookings) setBookings(propBookings);
  }, [propBookings]);
  useEffect(() => {
    if (propExpenses) setExpenses(propExpenses);
  }, [propExpenses]);

  // If props are not provided, fall back to fetching from API
  useEffect(() => {
    if (propBookings !== null && propExpenses !== null) return;
    async function load() {
      try {
        const [bRes, eRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/expenses"),
        ]);
        const [B, E] = await Promise.all([
          bRes.ok ? bRes.json() : [],
          eRes.ok ? eRes.json() : [],
        ]);
        setBookings(B || []);
        setExpenses(E || []);
      } catch (err) {
        console.warn("Failed to load chart data", err);
      }
    }
    load();
  }, [propBookings, propExpenses]);

  const monthly = useMemo(() => window.chartUtils.monthlyRevenue(bookings), [bookings]);
  const platform = useMemo(() => window.chartUtils.revenueByPlatform(bookings), [bookings]);
  const expensesByCat = useMemo(() => window.chartUtils.expensesByCategory(expenses, expAptFilter), [expenses, expAptFilter]);
  const calendar = useMemo(() => window.chartUtils.bookingsCalendar(bookings), [bookings]);
  const avgNR = useMemo(() => window.chartUtils.avgNightlyRateOverBookings(bookings), [bookings]);

  const COLORS = { Rebekka: "#1a3f6f", Back: "#3B6D11", Total: "#d85a30", Other: "#5f5e5a" };

  // Ensure Recharts is loaded before using its components
  const RechartsLib = typeof Recharts !== "undefined" ? Recharts : null;
  if (!RechartsLib || !RechartsLib.LineChart) {
    // Fallback renderer using plain SVG and CSS so dashboard still shows charts offline
    const monthsArr = monthly;
    const chartW = 600;
    const chartH = 200;
    const pad = 30;
    const innerW = chartW - pad * 2;
    const innerH = chartH - pad * 2;
    const maxVal = Math.max(
      1,
      ...monthsArr.map((m) => Math.max(m.Rebekka || 0, m.Back || 0, m.Total || 0)),
    );

    const pointsFor = (key) =>
      monthsArr
        .map((m, i) => {
          const x = pad + (i * innerW) / Math.max(1, monthsArr.length - 1);
          const v = m[key] || 0;
          const y = pad + (1 - v / maxVal) * innerH;
          return `${x},${y}`;
        })
        .join(" ");

    const makeConic = (data, colorsMap) => {
      const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
      let acc = 0;
      const parts = data.map((d, i) => {
        const start = (acc / total) * 100;
        acc += d.value;
        const end = (acc / total) * 100;
        const color = colorsMap && colorsMap[d.name] ? colorsMap[d.name] : ["#f39c12", "#f1c40f", "#d35400", "#16a085", "#8e44ad"][i % 5];
        return `${color} ${start}% ${end}%`;
      });
      return parts.length ? `conic-gradient(${parts.join(",")})` : "transparent";
    };

    const platformColors = {
      Booking: COLORS.Total,
      Airbnb: "#c0392b",
      Friends: COLORS.Back,
      "Face-Face": "#8c6d20",
    };

    const pieStylePlatform = { background: makeConic(platform, platformColors) };
    const pieStyleExpenses = { background: makeConic(expensesByCat) };

    return (
      <div className="charts-root">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly revenue</div>
              <div className="card-meta">Net revenue by check-in month · current year</div>
            </div>
          </div>
          <div style={{ width: "100%", overflow: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: 260 }}>
              <g>
                {/* horizontal grid + y axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                  const val = Math.round(t * maxVal);
                  const y = pad + (1 - t) * innerH;
                  return (
                    <g key={`grid-${i}`}>
                      <line x1={pad} x2={pad + innerW} y1={y} y2={y} stroke="#eee" strokeWidth={1} />
                      <text x={6} y={y - 4} fontSize={10} fill="#666">{formatEuro(val)}</text>
                    </g>
                  );
                })}

                <polyline points={pointsFor("Rebekka")} fill="none" stroke={COLORS.Rebekka} strokeWidth={2} />
                <polyline points={pointsFor("Back")} fill="none" stroke={COLORS.Back} strokeWidth={2} />
                <polyline points={pointsFor("Total")} fill="none" stroke={COLORS.Total} strokeWidth={2} strokeDasharray="4 2" />
                {monthsArr.map((m, i) => {
                  const x = pad + (i * innerW) / Math.max(1, monthsArr.length - 1);
                  const yR = pad + (1 - (m.Rebekka || 0) / maxVal) * innerH;
                  const yB = pad + (1 - (m.Back || 0) / maxVal) * innerH;
                  const yT = pad + (1 - (m.Total || 0) / maxVal) * innerH;
                  return (
                    <g key={m.month}>
                      <circle cx={x} cy={yR} r={3} fill={COLORS.Rebekka}><title>{`${m.month} Rebekka: €${(m.Rebekka||0).toFixed(2)}`}</title></circle>
                      <circle cx={x} cy={yB} r={3} fill={COLORS.Back}><title>{`${m.month} Back: €${(m.Back||0).toFixed(2)}`}</title></circle>
                      <circle cx={x} cy={yT} r={3} fill={COLORS.Total}><title>{`${m.month} Total: €${(m.Total||0).toFixed(2)}`}</title></circle>
                      <text x={x} y={chartH - 6} fontSize={10} textAnchor="middle" fill="#666">{m.month}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
            {/* Legend for fallback chart */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="legend-swatch sw-rebekka" /> Rebekka</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="legend-swatch sw-back" /> Back</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="legend-swatch sw-total" /> Total</div>
            </div>
          </div>
        </div>

        <div className="donut-grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Revenue by platform</div>
                <div className="card-meta">Share of total net revenue by platform</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 160 }}>
                <div className="pie" style={{ width: 150, height: 150, borderRadius: '50%', ...pieStylePlatform }}>
                  <div className="pie-inner" style={{ width: 74, height: 74, borderRadius: '50%', margin: '38px auto', background: 'var(--bg-primary)', border: '0.5px solid var(--border-light)' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {platform.map((p, i) => {
                  const total = platform.reduce((s, x) => s + x.value, 0) || 1;
                  const pct = ((p.value / total) * 100).toFixed(1);
                  const col = platformColors[p.name] || ['#f39c12','#f1c40f','#d35400','#16a085','#8e44ad'][i%5];
                  return (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 12, height: 12, background: col, display: 'inline-block', borderRadius: 4 }} />
                        <div style={{ fontSize: 13 }}>{p.name}</div>
                      </div>
                      <div style={{ fontWeight: 600 }}>{formatEuro(p.value)} · {pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Expenses breakdown</div>
                <div className="card-meta">Total expenses by category</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['All','Rebekka','Back'].map(a => (
                  <button key={a} className={`fbtn${expAptFilter===a? ' active':''}`} onClick={() => setExpAptFilter(a)}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 160 }}>
                <div className="pie" style={{ width: 150, height: 150, borderRadius: '50%', ...pieStyleExpenses }}>
                  <div className="pie-inner" style={{ width: 74, height: 74, borderRadius: '50%', margin: '38px auto', background: 'var(--bg-primary)', border: '0.5px solid var(--border-light)' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {expensesByCat.map((e, i) => (
                  <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 12, height: 12, background: ['#f39c12','#f1c40f','#d35400','#16a085','#8e44ad'][i%5], display: 'inline-block', borderRadius: 4 }} />
                      <div style={{ fontSize: 13 }}>{e.name}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>{formatEuro(e.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Bookings calendar heatmap</div>
              <div className="card-meta">Year view — one row per month, days 1–31</div>
            </div>
          </div>
          <div className="calendar-heatmap">
            {calendar.map((m) => (
              <div key={m.label} className="heat-row">
                <div className="month-label">{m.label}</div>
                <div className="days-grid">
                  {m.days.map((d) => {
                    const cls = d.status === 'Missing' ? 'cell-missing' : d.status === 'Available' ? 'cell-available' : d.status === 'Rebekka' ? 'cell-rebekka' : d.status === 'Back' ? 'cell-back' : d.status === 'Both' ? 'cell-both' : 'cell-other';
                    return <div key={d.day} className={`day-cell ${cls}`} title={`${m.label} ${d.day}: ${d.status}`} />;
                  })}
                </div>
              </div>
            ))}
            <div className="heat-legend">
              <div><span className="legend-swatch sw-rebekka" /> Rebekka</div>
              <div><span className="legend-swatch sw-back" /> Back</div>
              <div><span className="legend-swatch sw-both" /> Both</div>
              <div><span className="legend-swatch sw-available" /> Available</div>
              <div><span className="legend-swatch sw-other" /> Other</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Avg nightly rate</div>
              <div className="card-meta">Net per night for each booking (chronological)</div>
            </div>
          </div>
          <div style={{ width: '100%', overflow: 'auto' }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 300 }}>
              {(() => {
                const len = avgNR.length || 1;
                const maxAvg = Math.max(1, ...(avgNR.map(x => x.netPerNight || 0)));
                const ptsReb = avgNR
                  .map((a, i) => {
                    const x = pad + (i * innerW) / Math.max(1, len - 1);
                    if (a.apt !== 'Rebekka') return null;
                    const y = pad + (1 - (a.netPerNight || 0) / maxAvg) * innerH;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ');
                const ptsBack = avgNR
                  .map((a, i) => {
                    const x = pad + (i * innerW) / Math.max(1, len - 1);
                    if (a.apt !== 'Back') return null;
                    const y = pad + (1 - (a.netPerNight || 0) / maxAvg) * innerH;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ');

                const ticks = [0, 0.25, 0.5, 0.75, 1];
                const step = Math.max(1, Math.floor(len / 6));
                const fmtX = (d) => (d ? d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2') : '');

                return (
                  <g>
                    {/* y grid + labels */}
                    {ticks.map((t, i) => {
                      const y = pad + (1 - t) * innerH;
                      const val = Math.round(t * maxAvg);
                      return (
                        <g key={`yt-${i}`}>
                          <line x1={pad} x2={pad + innerW} y1={y} y2={y} stroke="#eee" strokeWidth={1} />
                          <text x={6} y={y - 4} fontSize={10} fill="#666">{formatEuro(val)}</text>
                        </g>
                      );
                    })}

                    {/* x axis */}
                    <line x1={pad} x2={pad + innerW} y1={pad + innerH} y2={pad + innerH} stroke="#ddd" />
                    {/* x ticks */}
                    {avgNR.map((a, i) => {
                      if (i % step !== 0 && i !== len - 1) return null;
                      const x = pad + (i * innerW) / Math.max(1, len - 1);
                      return (
                        <text key={`xt-${i}`} x={x} y={pad + innerH + 16} fontSize={10} textAnchor="middle" fill="#666">
                          {fmtX(a.label)}
                        </text>
                      );
                    })}

                    <polyline points={ptsReb} fill="none" stroke={COLORS.Rebekka} strokeWidth={2} />
                    <polyline points={ptsBack} fill="none" stroke={COLORS.Back} strokeWidth={2} />

                    {avgNR.map((a, i) => {
                      const x = pad + (i * innerW) / Math.max(1, len - 1);
                      const y = pad + (1 - (a.netPerNight || 0) / maxAvg) * innerH;
                      if (!a.netPerNight) return null;
                      const col = a.apt === 'Rebekka' ? COLORS.Rebekka : a.apt === 'Back' ? COLORS.Back : COLORS.Other;
                      return <circle key={`${a.label}-${i}`} cx={x} cy={y} r={3} fill={col}><title>{`${a.label} ${a.apt}: ${formatEuro(a.netPerNight)}`}</title></circle>;
                    })}
                  </g>
                );
              })()}
            </svg>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="legend-swatch sw-rebekka" /> Rebekka</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="legend-swatch sw-back" /> Back</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
  } = RechartsLib;

  function formatEuro(v) {
    try {
      return `€${parseFloat(v || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (e) {
      return `€0.00`;
    }
  }

  const chart1Data = monthly.map((m) => ({ month: m.month, Rebekka: m.Rebekka, Back: m.Back, Total: m.Total }));

  const totalPlatform = platform.reduce((s, p) => s + p.value, 0);

  return (
    <div className="charts-root">
      {/* Chart 1 — Monthly revenue line chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Monthly revenue</div>
            <div className="card-meta">Net revenue by check-in month · current year</div>
          </div>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chart1Data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `€${v}`} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: '#fff', padding: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>{label}</div>
                    {payload.map(p => (
                      <div key={p.name} style={{ color: p.stroke }}>{p.name}: {formatEuro(p.value)}</div>
                    ))}
                  </div>
                );
              }} />
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="Rebekka" stroke={COLORS.Rebekka} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Back" stroke={COLORS.Back} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Total" stroke={COLORS.Total} dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 2 + 3 — two donuts side by side */}
      <div className="donut-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue by platform</div>
              <div className="card-meta">Share of total net revenue by platform</div>
            </div>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0];
                  const percent = totalPlatform ? ((p.value / totalPlatform) * 100).toFixed(1) : '0.0';
                  return (
                    <div style={{ background: '#fff', padding: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontWeight: 600 }}>{formatEuro(p.value)} · {percent}%</div>
                    </div>
                  );
                }} />
                <Pie data={platform} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label={(entry) => entry.name}>
                  {platform.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Booking' ? COLORS.Total : (entry.name === 'Airbnb' ? '#c0392b' : (entry.name === 'Friends' ? COLORS.Back : '#8c6d20'))} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Expenses breakdown</div>
              <div className="card-meta">Total expenses by category</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All','Rebekka','Back'].map(a => (
                <button key={a} className={`fbtn${expAptFilter===a? ' active':''}`} onClick={() => setExpAptFilter(a)}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0];
                  return (
                    <div style={{ background: '#fff', padding: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontWeight: 600 }}>{formatEuro(p.value)}</div>
                    </div>
                  );
                }} />
                <Pie data={expensesByCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label={(entry) => entry.name}>
                  {expensesByCat.map((entry, index) => (
                    <Cell key={`cell-exp-${index}`} fill={['#f39c12','#f1c40f','#d35400','#16a085','#8e44ad'][index % 5]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 4 — Calendar heatmap */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Bookings calendar heatmap</div>
            <div className="card-meta">Year view — one row per month, days 1–31</div>
          </div>
        </div>
        <div className="calendar-heatmap">
          {calendar.map((m) => (
            <div key={m.label} className="heat-row">
              <div className="month-label">{m.label}</div>
              <div className="days-grid">
                {m.days.map((d) => {
                  const cls = d.status === 'Missing' ? 'cell-missing' : d.status === 'Available' ? 'cell-available' : d.status === 'Rebekka' ? 'cell-rebekka' : d.status === 'Back' ? 'cell-back' : d.status === 'Both' ? 'cell-both' : 'cell-other';
                  return <div key={d.day} className={`day-cell ${cls}`} title={`${m.label} ${d.day}: ${d.status}`} />;
                })}
              </div>
            </div>
          ))}
          <div className="heat-legend">
            <div><span className="legend-swatch sw-rebekka" /> Rebekka</div>
            <div><span className="legend-swatch sw-back" /> Back</div>
            <div><span className="legend-swatch sw-both" /> Both</div>
            <div><span className="legend-swatch sw-available" /> Available</div>
            <div><span className="legend-swatch sw-other" /> Other</div>
          </div>
        </div>
      </div>

      {/* Chart 5 — Avg nightly rate over time */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Avg nightly rate</div>
            <div className="card-meta">Net per night for each booking (chronological)</div>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={avgNR} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickFormatter={(d) => d ? d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2') : ''} />
              <YAxis tickFormatter={(v) => `€${Math.round(v)}`} domain={[0, 'dataMax']} />
              <Tooltip formatter={(v) => formatEuro(v)} labelFormatter={(l) => `Check-in: ${l}`} />
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="Rebekka" name="Rebekka" stroke={COLORS.Rebekka} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Back" name="Back" stroke={COLORS.Back} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import { computeCleaningEvents, fmtCleanShort } from '../cleaningUtils.js';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const PLATFORM_COLORS = {
  Booking: '#0070f3', Airbnb: '#ff385c', Friends: '#7c3aed', Direct: '#059669', Other: '#94a3b8',
};
const APT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#a3e635'];

function fmt(n) { return `€${Math.round(n).toLocaleString('en-EU')}`; }

function StatCard({ label, value, sub, color = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const BAR_H = 8;

function MonthGrid({ year, month, bookings, apartments, aptColorMap, now }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const getBookingsForDay = (date) =>
    bookings.filter(b => {
      const ci = new Date(b.checkIn); const co = new Date(b.checkOut);
      return date >= ci && date < co;
    });

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2 text-center">{monthName} {year}</p>
      <div className="grid grid-cols-7">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 pb-1 font-medium">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ minHeight: 36 }} />;
          const dayDate = new Date(year, month, day);
          const isToday = dayDate.toDateString() === now.toDateString();
          const dayOfWeek = (dayDate.getDay() + 6) % 7;
          const dayBookings = getBookingsForDay(dayDate);
          return (
            <div key={i} style={{ minHeight: 36 }} className="flex flex-col pt-0.5 pb-0.5">
              <span className={`text-center text-xs leading-tight ${isToday ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                {day}
              </span>
              {dayBookings.map(b => {
                const lastNight = new Date(new Date(b.checkOut).getTime() - 86400000);
                const isStart = dayDate.getTime() === new Date(b.checkIn).getTime();
                const isLastNight = dayDate.getTime() === lastNight.getTime();
                const startOfRow = dayOfWeek === 0 || day === 1;
                const endOfRow = dayOfWeek === 6 || day === daysInMonth;
                const roundLeft = isStart || startOfRow;
                const roundRight = isLastNight || endOfRow;
                const apt = apartments.find(a => a.id === b.apartment);
                return (
                  <div key={b.id}
                    title={`${apt?.name || b.apartment} · ${b.platform} · ${b.nights}n`}
                    style={{
                      backgroundColor: aptColorMap[b.apartment] || '#94a3b8',
                      height: BAR_H,
                      marginTop: 2,
                      marginLeft: roundLeft ? 3 : 0,
                      marginRight: roundRight ? 3 : 0,
                      borderRadius: `${roundLeft ? 9999 : 0}px ${roundRight ? 9999 : 0}px ${roundRight ? 9999 : 0}px ${roundLeft ? 9999 : 0}px`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OccupancyCalendar({ bookings, apartments }) {
  const aptColorMap = {};
  apartments.forEach((a, i) => { aptColorMap[a.id] = APT_COLORS[i % APT_COLORS.length]; });

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const visibleMonths = [0, 1, 2].map(offset => {
    let m = viewMonth + offset;
    let y = viewYear;
    while (m > 11) { m -= 12; y++; }
    return { year: y, month: m };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 flex-wrap">
          {apartments.map((a, i) => (
            <div key={a.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: APT_COLORS[i % APT_COLORS.length] }} />
              {a.name}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleMonths.map(({ year, month }) => (
          <MonthGrid key={`${year}-${month}`} year={year} month={month}
            bookings={bookings} apartments={apartments} aptColorMap={aptColorMap} now={now} />
        ))}
      </div>
    </div>
  );
}

const PIE_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Overview() {
  const { bookings, expenses, apartments, expenseCategories, consumables, cleaning, showBookingFinancials } = useData();
  const [expPieFilter, setExpPieFilter] = useState('all');
  const [expPieMode, setExpPieMode] = useState('room');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showSelfClean, setShowSelfClean] = useState(true);

  const statusExpenses = expenses;

  const totalGross = bookings.reduce((s, b) => s + b.reservation, 0);
  const totalNet = bookings.reduce((s, b) => s + b.netIncome, 0);
  const totalCommission = bookings.reduce((s, b) => s + b.commission, 0);
  const totalExpenses = statusExpenses.reduce((s, e) => s + e.totalCost, 0);
  const totalConsumableCost = consumables.reduce((s, c) => s + (c.totalCost || 0), 0);

  const cleaningRates = cleaning?.rates || { fullClean: 60, beddingChange: 60, beddingInterval: 4 };
  const allCleaningEvents = computeCleaningEvents(bookings, apartments, cleaningRates);
  const hiddenSet = new Set(cleaning?.hiddenCosts || []);
  const totalCleaningCost = allCleaningEvents
    .filter(e => !hiddenSet.has(e.id))
    .reduce((s, e) => s + e.cost, 0);

  const netProfit = totalNet - totalExpenses - totalConsumableCost - totalCleaningCost;

  const platformBookings = platformFilter === 'all' ? bookings : bookings.filter(b => b.apartment === platformFilter);
  const byPlatform = platformBookings.reduce((acc, b) => {
    acc[b.platform] = (acc[b.platform] || 0) + b.netIncome; return acc;
  }, {});
  const platformData = Object.entries(byPlatform)
    .map(([platform, revenue]) => ({ platform, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  const aptStats = apartments.map((apt, i) => {
    const ab = bookings.filter(b => b.apartment === apt.id);
    const ae = statusExpenses.filter(e => e.apartment === apt.name || e.apartment === apt.id);
    const nights = ab.reduce((s, b) => s + b.nights, 0);
    const net = ab.reduce((s, b) => s + b.netIncome, 0);
    const exp = ae.reduce((s, e) => s + e.totalCost, 0);
    const cons = consumables.filter(c => c.apartment === apt.id).reduce((s, c) => s + (c.totalCost || 0), 0);
    return { ...apt, count: ab.length, nights, net, expenses: exp + cons, color: APT_COLORS[i] };
  });

  // Pie: gains per apartment
  const gainsPieData = aptStats
    .filter(a => a.net > 0)
    .map((a, i) => ({ name: a.name, value: Math.round(a.net), fill: APT_COLORS[i] }));

  // Pie: expenses by room or category
  const filteredExpenses = expPieFilter === 'all'
    ? statusExpenses
    : statusExpenses.filter(e => e.apartment === expPieFilter || e.apartment === apartments.find(a => a.id === expPieFilter)?.name);

  const expByKey = filteredExpenses.reduce((acc, e) => {
    const key = expPieMode === 'room' ? e.categoryI : e.categoryII;
    acc[key] = (acc[key] || 0) + e.totalCost;
    return acc;
  }, {});
  const expPieData = Object.entries(expByKey)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value: Math.round(value), fill: PIE_COLORS[i % PIE_COLORS.length] }));

  // One data point per night of each booking, spread netIncome evenly
  const dailyMap = {};
  bookings.forEach(b => {
    const nightly = b.netIncome / Math.max(b.nights, 1);
    for (let i = 0; i < b.nights; i++) {
      const d = new Date(b.checkIn);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { date: key };
      dailyMap[key][b.apartment] = Math.round((dailyMap[key][b.apartment] || 0) + nightly);
    }
  });
  const dailyGains = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  const fmtChartDate = d => {
    const [y, m, day] = d.split('-');
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('default', { month: 'short', day: 'numeric' });
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = bookings
    .filter(b => new Date(b.checkIn) >= today)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const upcomingCleanings = allCleaningEvents
    .filter(e => e.sortDate >= today);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className={`grid gap-4 ${showBookingFinancials ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {showBookingFinancials && <StatCard label="Gross Revenue" value={fmt(totalGross)} sub={`${bookings.length} bookings`} />}
        <StatCard label="Net Revenue" value={fmt(totalNet)} sub={showBookingFinancials ? `after €${Math.round(totalCommission)} commission` : `${bookings.length} bookings`} color="text-green-700" />
        <StatCard label="Net Profit" value={fmt(netProfit)} sub="net − expenses − consumables − cleaning" color={netProfit >= 0 ? 'text-green-700' : 'text-red-600'} />
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Expenses" value={fmt(totalExpenses)} sub={`${statusExpenses.length} items`} color="text-red-600" />
        <StatCard label="Consumables Cost" value={fmt(totalConsumableCost)} sub={`${consumables.length} items tracked`} color="text-red-600" />
        <StatCard label="Cleaning Cost" value={fmt(totalCleaningCost)} sub={`${allCleaningEvents.length} events`} color="text-red-600" />
      </div>

      {/* Per-apartment cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {aptStats.map(apt => (
          <div key={apt.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: apt.color }} />
              <h3 className="font-semibold text-slate-800">{apt.name}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-xs text-slate-500 mb-0.5">Bookings</p><p className="text-xl font-bold text-slate-800">{apt.count}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Nights booked</p><p className="text-xl font-bold text-slate-800">{apt.nights}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Net/night avg</p>
                <p className="text-xl font-bold text-slate-800">{apt.nights > 0 ? `€${Math.round(apt.net / apt.nights)}` : '—'}</p>
              </div>
              <div><p className="text-xs text-slate-500 mb-0.5">Net revenue</p><p className="text-lg font-semibold text-green-700">{fmt(apt.net)}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Expenses</p><p className="text-lg font-semibold text-red-600">{fmt(apt.expenses)}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Profit</p>
                <p className={`text-lg font-semibold ${apt.net - apt.expenses >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(apt.net - apt.expenses)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gains pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Net Revenue by Apartment</h3>
          {gainsPieData.length === 0 ? (
            <p className="text-sm text-slate-400">No revenue data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gainsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={85} labelLine={false} label={PIE_LABEL}>
                  {gainsPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v), 'Net revenue']} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Expenses by {expPieMode === 'room' ? 'Room' : 'Category'}</h3>
            <div className="flex items-center gap-2">
              <select value={expPieFilter} onChange={e => setExpPieFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="all">All apartments</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="flex bg-slate-100 rounded p-0.5">
                {[['room', 'Room'], ['cat', 'Category']].map(([v, l]) => (
                  <button key={v} onClick={() => setExpPieMode(v)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${expPieMode === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {expPieData.length === 0 ? (
            <p className="text-sm text-slate-400">No expense data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={85} labelLine={false} label={PIE_LABEL}>
                  {expPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v), 'Expenses']} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue by platform + Cumulative gains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Revenue by Platform (net)</h3>
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="all">All apartments</option>
              {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {platformData.length === 0 ? (
            <p className="text-sm text-slate-400">No booking data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={platformData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
                <Tooltip formatter={v => [`€${v}`, 'Net revenue']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {platformData.map(e => <Cell key={e.platform} fill={PLATFORM_COLORS[e.platform] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Daily Gains (€/night)</h3>
          {dailyGains.length === 0 ? (
            <p className="text-sm text-slate-400">No booking data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyGains} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtChartDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                <Tooltip labelFormatter={fmtChartDate} formatter={(v, name) => {
                  const apt = apartments.find(a => a.id === name);
                  return [fmt(v), apt?.name || name];
                }} />
                <Legend formatter={name => apartments.find(a => a.id === name)?.name || name} iconType="circle" iconSize={10} />
                {apartments.map((apt, i) => (
                  <Line key={apt.id} type="monotone" dataKey={apt.id}
                    stroke={APT_COLORS[i % APT_COLORS.length]} strokeWidth={2}
                    dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Upcoming bookings + Upcoming cleanings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Upcoming Bookings</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming bookings.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(b => {
                const apt = apartments.find(a => a.id === b.apartment);
                const aptIdx = apartments.findIndex(a => a.id === b.apartment);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: APT_COLORS[aptIdx] || '#94a3b8' }} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{apt?.name || b.apartment} · {b.platform}</p>
                        <p className="text-xs text-slate-500">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} ({b.nights}n)</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-green-700">{fmt(b.netIncome)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Upcoming Cleanings</h3>
            <button onClick={() => setShowSelfClean(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showSelfClean ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-slate-700 border-slate-700 text-white'}`}>
              {showSelfClean ? 'All' : 'Charged only'}
            </button>
          </div>
          {upcomingCleanings.filter(e => showSelfClean || !hiddenSet.has(e.id)).length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming cleanings.</p>
          ) : (
            <div className="space-y-2">
              {upcomingCleanings.filter(e => showSelfClean || !hiddenSet.has(e.id)).map(e => {
                const isHidden = hiddenSet.has(e.id);
                const suggColors = { preferred: 'text-green-600', flexible: 'text-blue-600', compromise: 'text-amber-600' };
                return (
                  <div key={e.id} className={`flex items-center justify-between py-2 border-b border-slate-50 last:border-0 ${isHidden ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.aptColor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {e.aptName} · <span className="font-normal text-slate-600">{e.label}</span>
                        </p>
                        <p className={`text-xs ${suggColors[e.suggestion.type]}`}>{e.suggestion.label}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold flex-shrink-0 ml-2 ${isHidden ? 'text-slate-400 line-through' : 'text-red-600'}`}>€{e.cost}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Occupancy Calendar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Occupancy Calendar</h3>
        <OccupancyCalendar bookings={bookings} apartments={apartments} />
      </div>
    </div>
  );
}

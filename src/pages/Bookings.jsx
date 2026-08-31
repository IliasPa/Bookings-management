import React, { useState } from 'react';
import { useData } from '../DataContext.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const fmtShort = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const PLATFORM_COLORS = {
  Booking: 'bg-blue-100 text-blue-700',
  Airbnb: 'bg-rose-100 text-rose-700',
  Friends: 'bg-violet-100 text-violet-700',
  Direct: 'bg-emerald-100 text-emerald-700',
  Other: 'bg-slate-100 text-slate-600',
};

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMoney = n => `€${(n || 0).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Bookings() {
  const { bookings, setBookings, apartments, markDirty, showBookingFinancials, accountant } = useData();
  const [activeApt, setActiveApt] = useState('all');
  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const scopeBookings = activeApt === 'all' ? bookings : bookings.filter(b => b.apartment === activeApt);

  const aptBookings = scopeBookings
    .filter(b => {
      if (filter === 'upcoming') return new Date(b.checkIn) >= today;
      if (filter === 'past') return new Date(b.checkOut) <= today;
      return true;
    })
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  const totalNights = scopeBookings.reduce((s, b) => s + b.nights, 0);
  const totalNet = scopeBookings.reduce((s, b) => s + b.netIncome, 0);
  const totalGross = scopeBookings.reduce((s, b) => s + b.reservation, 0);
  const totalCommission = scopeBookings.reduce((s, b) => s + b.commission, 0);
  const totalEnvFee = scopeBookings.reduce((s, b) => s + (b.envFee || 0), 0);

  const handleSave = (data) => {
    if (modal === 'add') {
      const booking = { id: `bk_${Date.now()}`, ...data };
      setBookings(prev => [...prev, booking]);
    } else {
      setBookings(prev => prev.map(b => b.id === modal.id ? { ...b, ...data } : b));
    }
    markDirty();
    setModal(null);
  };

  const togglePaid = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, paid: !b.paid } : b));
    markDirty();
  };

  const handleDelete = () => {
    setBookings(prev => prev.filter(b => b.id !== delTarget.id));
    markDirty();
    setDelTarget(null);
  };

  const getMonthsWithBookings = () => {
    const months = new Map();
    bookings.forEach(b => {
      const date = new Date(b.checkIn);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) {
        months.set(key, { year: date.getFullYear(), month: date.getMonth() + 1 });
      }
    });
    return Array.from(months.values())
      .sort((a, b) => b.year === a.year ? b.month - a.month : b.year - a.year);
  };

  const formatMonthName = (year, month) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  };

  const generateEmailForMonth = (year, month) => {
    const monthBookings = bookings.filter(b => {
      const date = new Date(b.checkIn);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    if (monthBookings.length === 0) return null;

    let emailBody = '';
    monthBookings.forEach((b, idx) => {
      const apt = apartments.find(a => a.id === b.apartment);
      const ama = apt?.ama || '';
      const checkInDate = new Date(b.checkIn).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
      const checkOutDate = new Date(b.checkOut).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });

      emailBody += `${ama}\n`;
      emailBody += `1) ${b.guestName || '—'}\n`;
      emailBody += `2) ${b.guestTaxNumber || '—'}\n`;
      emailBody += `3) ${b.guestId || '—'}\n`;
      emailBody += `4) ${b.reservation.toFixed(2)}€\n`;
      emailBody += `5) card\n`;
      emailBody += `6) ${checkInDate} - ${checkOutDate}\n`;
      emailBody += `7) ${b.platform}\n`;
      if (idx < monthBookings.length - 1) emailBody += '\n';
    });

    const subject = `Bookings of month ${formatMonthName(year, month)}`;
    const to = accountant.email || '';

    return { to, subject, body: emailBody };
  };

  const handleEmailMonth = (year, month) => {
    const email = generateEmailForMonth(year, month);
    if (!email) return;

    const mailtoLink = `mailto:${encodeURIComponent(email.to)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = mailtoLink;
    setShowMonthDropdown(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveApt('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeApt === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >All</button>
          {apartments.map(apt => (
            <button key={apt.id} onClick={() => setActiveApt(apt.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeApt === apt.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >{apt.name}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Booking
          </button>
          {getMonthsWithBookings().length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                </svg>
                Email by Month
              </button>
              {showMonthDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-40">
                  {getMonthsWithBookings().map(({ year, month }) => (
                    <button
                      key={`${year}-${month}`}
                      onClick={() => handleEmailMonth(year, month)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 border-b border-slate-100 last:border-0"
                    >
                      {formatMonthName(year, month)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-3 ${showBookingFinancials ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {[
          { label: 'Bookings', value: scopeBookings.length },
          { label: 'Nights booked', value: totalNights },
          ...(showBookingFinancials ? [
            { label: 'Gross revenue', value: `€${Math.round(totalGross)}` },
            { label: 'Net revenue', value: `€${Math.round(totalNet)}`, sub: `−€${Math.round(totalCommission)} comm. · −€${Math.round(totalEnvFee)} env` },
          ] : [
            { label: 'Net revenue', value: `€${Math.round(totalNet)}` },
          ]),
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
            {s.sub && <p className="text-xs text-slate-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === v ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {aptBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                {activeApt === 'all' && <th className="px-4 py-3 text-left font-medium">Apartment</th>}
                <th className="px-4 py-3 text-left font-medium">Check-in</th>
                <th className="px-4 py-3 text-left font-medium">Check-out</th>
                <th className="px-4 py-3 text-center font-medium">Nights</th>
                <th className="px-4 py-3 text-left font-medium">Platform</th>
                {showBookingFinancials && <th className="px-4 py-3 text-right font-medium">Gross</th>}
                {showBookingFinancials && <th className="px-4 py-3 text-right font-medium">Commission</th>}
                {showBookingFinancials && <th className="px-4 py-3 text-right font-medium">Env. fee</th>}
                <th className="px-4 py-3 text-right font-medium">Net</th>
                <th className="px-4 py-3 text-right font-medium">€/night</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {aptBookings.map((b, idx) => {
                const isPast = new Date(b.checkOut) <= today;
                const isActive = new Date(b.checkIn) <= today && new Date(b.checkOut) > today;
                const nextB = aptBookings[idx + 1];
                const showDivider = filter === 'all' && isPast && nextB && new Date(nextB.checkOut) > today;
                const colSpan = 7 + (activeApt === 'all' ? 1 : 0) + (showBookingFinancials ? 3 : 0);
                return (
                  <React.Fragment key={b.id}>
                  <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isPast ? 'opacity-60' : ''}`}>
                    {activeApt === 'all' && (
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {apartments.find(a => a.id === b.apartment)?.name || b.apartment}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      <div className="flex items-center gap-2">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                        {fmtDate(b.checkIn)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(b.checkOut)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{b.nights}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[b.platform] || PLATFORM_COLORS.Other}`}>
                        {b.platform}
                      </span>
                    </td>
                    {showBookingFinancials && <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(b.reservation)}</td>}
                    {showBookingFinancials && <td className="px-4 py-3 text-right text-red-500">{b.commission > 0 ? `−${fmtMoney(b.commission)}` : '—'}</td>}
                    {showBookingFinancials && <td className="px-4 py-3 text-right text-red-500">{b.envFee > 0 ? `−${fmtMoney(b.envFee)}` : '—'}</td>}
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtMoney(b.netIncome)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{b.nights > 0 ? `€${Math.round(b.netIncome / b.nights)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => togglePaid(b.id)}
                          className={`p-1.5 rounded transition-colors ${b.paid ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                          title={b.paid ? 'Paid by platform — click to unmark' : 'Mark as paid by platform'}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={b.paid ? 2.5 : 1.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={() => setModal(b)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDelTarget(b)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {showDivider && (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-1.5 bg-blue-50">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-blue-300" />
                          <span className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Upcoming</span>
                          <div className="flex-1 h-px bg-blue-300" />
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modal && (
        <BookingModal
          booking={modal === 'add' ? null : modal}
          apartments={apartments}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {delTarget && (
        <ConfirmModal
          message={`Delete booking for ${fmtDate(delTarget.checkIn)} → ${fmtDate(delTarget.checkOut)}?`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

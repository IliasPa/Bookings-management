import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import { computeCleaningEvents, fmtCleanShort, formatCleaningSchedule } from '../cleaningUtils.js';

const DEFAULT_RATES = { fullClean: 60, beddingChange: 60, beddingInterval: 4 };

const TYPE_LABELS = {
  preferred: { bg: 'bg-green-100', text: 'text-green-700', label: 'Preferred' },
  flexible:  { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Flexible'  },
  compromise:{ bg: 'bg-amber-100', text: 'text-amber-700', label: 'Compromise'},
};

const TIME_LABELS = {
  evening: 'Evening',
  anytime: 'Anytime',
  before: 'Before check-in',
  window: '11:00–15:00',
};

export default function Cleaning() {
  const { bookings, apartments, cleaning, setCleaning, markDirty } = useData();

  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState(DEFAULT_RATES);
  const [showAll, setShowAll] = useState(false);
  const [filterApt, setFilterApt] = useState('all');
  const [onlyCharged, setOnlyCharged] = useState(false);
  const [copied, setCopied] = useState(false);

  const rates = cleaning?.rates || DEFAULT_RATES;
  const hidden = new Set(cleaning?.hiddenCosts || []);

  const saveRates = () => {
    setCleaning({ ...cleaning, rates: rateForm });
    markDirty();
    setEditingRates(false);
  };

  const toggleHidden = (id) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCleaning({ ...cleaning, hiddenCosts: [...next] });
    markDirty();
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const allEvents = computeCleaningEvents(bookings, apartments, rates);

  // A cleaning is only "past" once the guest it prepares for has checked in
  // (refDate = that booking's check-in), not when its suggested clean date passes.
  const isPast = (e) => e.refDate < today;

  const upcoming = allEvents.filter(e => !isPast(e));
  const upcomingCharged = upcoming.filter(e => !hidden.has(e.id));
  const totalCost = upcomingCharged.reduce((s, e) => s + e.cost, 0);

  const visible = allEvents
    .filter(e => showAll || !isPast(e))
    .filter(e => filterApt === 'all' || e.aptId === filterApt)
    .filter(e => !onlyCharged || !hidden.has(e.id));

  // For the cleaner: same on-screen scope, but always drop the "I'll do it myself" jobs.
  const copyList = visible.filter(e => !hidden.has(e.id));

  const copySchedule = async () => {
    const text = formatCleaningSchedule(copyList, { showAll, today });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Upcoming full cleans</p>
          <p className="text-2xl font-bold text-slate-800">{upcoming.filter(e => e.type === 'full').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Bedding changes</p>
          <p className="text-2xl font-bold text-slate-800">{upcoming.filter(e => e.type === 'bedding').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Upcoming cost</p>
          <p className="text-2xl font-bold text-red-600">€{totalCost}</p>
        </div>
      </div>

      {/* Cleaning preference / settings */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-600">Cleaning preference</p>
          <button
            onClick={() => { setRateForm(rates); setEditingRates(v => !v); }}
            className="text-xs text-blue-600 hover:underline"
          >
            {editingRates ? 'Cancel' : 'Edit charges'}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs mb-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Preferred — weekend or evening slot</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Flexible — weekday evening</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Compromise — back-to-back weekday 11:00–15:00</span>
        </div>

        {editingRates ? (
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Full clean (€)</label>
                <input type="number" min="0" step="1"
                  value={rateForm.fullClean}
                  onChange={e => setRateForm(f => ({ ...f, fullClean: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Bedding change (€)</label>
                <input type="number" min="0" step="1"
                  value={rateForm.beddingChange}
                  onChange={e => setRateForm(f => ({ ...f, beddingChange: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Bedding every (days)</label>
                <input type="number" min="1" step="1"
                  value={rateForm.beddingInterval}
                  onChange={e => setRateForm(f => ({ ...f, beddingInterval: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button onClick={saveRates}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Save charges
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
            Full clean: <span className="text-slate-600 font-medium">€{rates.fullClean}</span>
            &ensp;·&ensp;Bedding change: <span className="text-slate-600 font-medium">€{rates.beddingChange}</span>
            &ensp;·&ensp;Bedding every <span className="text-slate-600 font-medium">{rates.beddingInterval}</span> days
            &ensp;·&ensp;Check-out 11:00 · Check-in 15:00
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterApt} onChange={e => setFilterApt(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All apartments</option>
            {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => setOnlyCharged(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${onlyCharged ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            Charged only
          </button>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[[false, 'Upcoming'], [true, 'All']].map(([val, label]) => (
            <button key={label} onClick={() => setShowAll(val)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${showAll === val ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Copy for cleaner */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={copySchedule} disabled={copyList.length === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {copied ? '✓ Copied' : 'Copy schedule for cleaner'}
        </button>
        <span className="text-xs text-slate-400">{copyList.length} job{copyList.length === 1 ? '' : 's'} · Greek · no prices</span>
      </div>

      {/* Events list */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
          No cleaning events found.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(e => {
            const typeStyle = TYPE_LABELS[e.suggestion.type];
            const past = isPast(e);
            const isHidden = hidden.has(e.id);
            return (
              <div key={e.id} className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 transition-opacity ${past || isHidden ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.aptColor }} />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Apartment • Job */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{e.aptName}</span>
                        <span className="text-slate-300">•</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${e.type === 'full' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'}`}>
                          {e.label}
                        </span>
                      </div>
                      {/* 🕒 Date • Time • Category */}
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-700">
                        <span>🕒</span>
                        <span className="font-medium">{fmtCleanShort(e.suggestion.date)}</span>
                        <span className="text-slate-300">•</span>
                        <span>{TIME_LABELS[e.suggestion.timeKey] || e.suggestion.timeKey}</span>
                        <span className="text-slate-300">•</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                          {typeStyle.label}
                        </span>
                      </div>
                      {/* 🔄 Possible timing / flexibility */}
                      <div className="text-xs text-slate-500">🔄 {e.flexWindow}</div>
                      {/* 🚪 Check-in → Check-out • nights */}
                      <div className="text-xs text-slate-500">
                        🚪 {fmtCleanShort(e.stay.checkIn)} → {fmtCleanShort(e.stay.checkOut)} • {e.stay.nights} night{e.stay.nights === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => toggleHidden(e.id)}
                      title={isHidden ? 'Mark as charged' : 'I\'ll do it myself — remove charge'}
                      className={`text-sm font-bold px-2 py-0.5 rounded transition-colors ${isHidden ? 'text-slate-400 line-through hover:text-slate-600' : 'text-slate-800 hover:text-slate-500'}`}>
                      €{e.cost}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import { computeCleaningEvents, fmtCleanShort } from '../cleaningUtils.js';

const DEFAULT_RATES = { fullClean: 60, beddingChange: 60, beddingInterval: 4 };

const TYPE_LABELS = {
  preferred: { bg: 'bg-green-100', text: 'text-green-700', label: 'Preferred' },
  flexible:  { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Flexible'  },
  compromise:{ bg: 'bg-amber-100', text: 'text-amber-700', label: 'Compromise'},
};

export default function Cleaning() {
  const { bookings, apartments, cleaning, setCleaning, markDirty } = useData();

  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState(DEFAULT_RATES);
  const [showAll, setShowAll] = useState(false);
  const [filterApt, setFilterApt] = useState('all');
  const [onlyCharged, setOnlyCharged] = useState(false);

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

  const upcoming = allEvents.filter(e => e.sortDate >= today);
  const upcomingCharged = upcoming.filter(e => !hidden.has(e.id));
  const totalCost = upcomingCharged.reduce((s, e) => s + e.cost, 0);

  const visible = allEvents
    .filter(e => showAll || e.sortDate >= today)
    .filter(e => filterApt === 'all' || e.aptId === filterApt)
    .filter(e => !onlyCharged || !hidden.has(e.id));

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

      {/* Events list */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
          No cleaning events found.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(e => {
            const typeStyle = TYPE_LABELS[e.suggestion.type];
            const isPast = e.sortDate < today;
            const isHidden = hidden.has(e.id);
            return (
              <div key={e.id} className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 transition-opacity ${isPast || isHidden ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.aptColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-slate-800 text-sm">{e.aptName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${e.type === 'full' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'}`}>
                          {e.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                          {typeStyle.label}
                        </span>
                        {e.backToBack && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Back-to-back</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{e.detail}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-700">
                        <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{e.suggestion.label}</span>
                        <span className="text-slate-400">— {e.suggestion.note}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <button
                      onClick={() => toggleHidden(e.id)}
                      title={isHidden ? 'Mark as charged' : 'I\'ll do it myself — remove charge'}
                      className={`text-sm font-bold px-2 py-0.5 rounded transition-colors ${isHidden ? 'text-slate-400 line-through hover:text-slate-600' : 'text-slate-800 hover:text-slate-500'}`}>
                      €{e.cost}
                    </button>
                    <p className="text-xs text-slate-400">{fmtCleanShort(e.sortDate)}</p>
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

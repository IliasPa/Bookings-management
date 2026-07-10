import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import ConsumableModal from '../components/ConsumableModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMoney = n => n > 0 ? `€${n.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function StockBar({ remaining, total }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct > 50 ? 'text-green-700' : pct > 20 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{Math.round(pct)}%</span>
    </div>
  );
}

function computeConsumed(cons, bookings) {
  const relevant = cons.apartment === 'general'
    ? bookings
    : bookings.filter(b => b.apartment === cons.apartment);
  const since = relevant.filter(b => new Date(b.checkIn) >= new Date(cons.dateBought));
  const consumed = since.reduce((sum, _b) =>
    sum + (cons.costModel === 'perGuest'
      ? cons.quantityPerUse * (cons.guestsDefault || 4)
      : cons.quantityPerUse),
    0);
  return { consumed, staysCount: since.length };
}

export default function Consumables() {
  const { consumables, setConsumables, apartments, bookings, markDirty } = useData();
  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [filterApt, setFilterApt] = useState('all');
  const [showRetired, setShowRetired] = useState(false);

  const withStats = consumables.map(cons => {
    const { consumed, staysCount } = computeConsumed(cons, bookings);
    const remaining = cons.quantity - consumed;
    const apt = apartments.find(a => a.id === cons.apartment);
    const aptName = apt?.name ?? (cons.apartment === 'general' ? 'General' : cons.apartment);
    const totalCost = cons.totalCost || 0;
    return { ...cons, consumed, remaining, staysCount, aptName, totalCost };
  });

  const filtered = (filterApt === 'all' ? withStats : withStats.filter(c => c.apartment === filterApt))
    .filter(c => showRetired ? true : !c.retired);

  const lowStock = withStats.filter(c => !c.retired && c.quantity > 0 && c.remaining / c.quantity <= 0.2).length;
  const totalSpent = withStats.reduce((s, c) => s + c.totalCost, 0);

  const handleSave = (raw) => {
    // strip computed/legacy fields before storing
    const { consumed, remaining, staysCount, aptName, unit, costPerUnit, ...data } = raw;
    if (modal === 'add') {
      setConsumables(prev => [...prev, { id: `cons_${Date.now()}`, ...data }]);
    } else {
      setConsumables(prev => prev.map(c => c.id === modal.id ? { ...c, ...data } : c));
    }
    markDirty();
    setModal(null);
  };

  const handleDelete = () => {
    setConsumables(prev => prev.filter(c => c.id !== delTarget.id));
    markDirty();
    setDelTarget(null);
  };

  const handleRetire = (id) => {
    setConsumables(prev => prev.map(c => c.id === id ? { ...c, retired: !c.retired } : c));
    markDirty();
  };

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Items tracked</p>
          <p className="text-xl font-bold text-slate-800">{consumables.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Low stock (≤20%)</p>
          <p className={`text-xl font-bold ${lowStock > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{lowStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Total spent</p>
          <p className="text-xl font-bold text-slate-800">{totalSpent > 0 ? `€${Math.round(totalSpent)}` : '—'}</p>
        </div>
      </div>

      {/* Filter bar + add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap items-center">
          {[['all', 'All'], ...apartments.map(a => [a.id, a.name]), ['general', 'General']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterApt(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterApt === v ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
          <button onClick={() => setShowRetired(r => !r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showRetired ? 'bg-slate-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
            Retired
          </button>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Stock
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No consumables yet. Add a stock entry to start tracking usage.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Apartment</th>
                <th className="px-4 py-3 text-left font-medium">Model</th>
                <th className="px-4 py-3 text-right font-medium">Qty/use</th>
                <th className="px-4 py-3 text-left font-medium">Date bought</th>
                <th className="px-4 py-3 text-right font-medium">Bought</th>
                <th className="px-4 py-3 text-right font-medium">Stays</th>
                <th className="px-4 py-3 text-right font-medium">Used</th>
                <th className="px-4 py-3 text-right font-medium">Left</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const pct = c.quantity > 0 ? c.remaining / c.quantity : 0;
                const leftColor = c.remaining <= 0 ? 'text-red-600' : pct <= 0.2 ? 'text-amber-600' : 'text-green-700';
                return (
                  <tr key={c.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${c.retired ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      {c.notes && <p className="text-xs text-slate-400 italic">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.aptName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${c.costModel === 'perGuest' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.costModel === 'perGuest' ? `per guest ×${c.guestsDefault}` : 'per stay'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.quantityPerUse}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(c.dateBought)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.staysCount}</td>
                    <td className="px-4 py-3 text-right text-red-500">{Math.round(c.consumed)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${leftColor}`}>
                      {Math.round(c.remaining)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {c.costPerUnit > 0 ? fmtMoney(c.totalCost) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StockBar remaining={c.remaining} total={c.quantity} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleRetire(c.id)}
                          className={`p-1.5 rounded transition-colors ${c.retired ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                          title={c.retired ? 'Unretire' : 'Retire (exclude from stock alerts)'}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={() => setModal(c)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDelTarget(c)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modal && (
        <ConsumableModal
          consumable={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {delTarget && (
        <ConfirmModal
          message={`Delete "${delTarget.name}" stock entry?`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

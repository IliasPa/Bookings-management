import { useState } from 'react';
import { useData } from '../DataContext.jsx';

const fmt = n => `€${Math.round(n).toLocaleString('en-EU')}`;

function getOwners() {
  try { return JSON.parse(localStorage.getItem('owners') || '[]'); } catch { return []; }
}
function getShares() {
  try { return JSON.parse(localStorage.getItem('owner_shares') || '{}'); } catch { return {}; }
}

export default function Owners() {
  const { bookings, apartments } = useData();
  const [owners, setOwners] = useState(getOwners);
  const [shares, setShares] = useState(getShares);
  const [newName, setNewName] = useState('');

  const save = (o, s) => {
    localStorage.setItem('owners', JSON.stringify(o));
    localStorage.setItem('owner_shares', JSON.stringify(s));
    setOwners(o);
    setShares(s);
  };

  const addOwner = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `owner_${Date.now()}`;
    save([...owners, { id, name }], shares);
    setNewName('');
  };

  const removeOwner = (id) => {
    const newShares = { ...shares };
    Object.keys(newShares).forEach(apt => { delete newShares[apt][id]; });
    save(owners.filter(o => o.id !== id), newShares);
  };

  const setShare = (aptId, ownerId, val) => {
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    const newShares = {
      ...shares,
      [aptId]: { ...(shares[aptId] || {}), [ownerId]: pct },
    };
    save(owners, newShares);
  };

  // Net income per apartment
  const aptNet = {};
  apartments.forEach(apt => {
    aptNet[apt.id] = bookings
      .filter(b => b.apartment === apt.id)
      .reduce((s, b) => s + b.netIncome, 0);
  });

  // Per-owner totals
  const ownerTotals = owners.map(owner => {
    const byApt = {};
    let total = 0;
    apartments.forEach(apt => {
      const pct = (shares[apt.id]?.[owner.id] || 0) / 100;
      const amount = aptNet[apt.id] * pct;
      byApt[apt.id] = amount;
      total += amount;
    });
    return { ...owner, byApt, total };
  });

  // Per-apartment share totals (for validation)
  const aptShareTotals = {};
  apartments.forEach(apt => {
    aptShareTotals[apt.id] = owners.reduce((s, o) => s + (shares[apt.id]?.[o.id] || 0), 0);
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Owners list */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Owners</h3>
        <div className="space-y-2 mb-4">
          {owners.map(o => (
            <div key={o.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
              <span className="flex-1 text-sm font-medium text-slate-800">{o.name}</span>
              <button onClick={() => removeOwner(o.id)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
            </div>
          ))}
          {owners.length === 0 && <p className="text-sm text-slate-400">No owners added yet.</p>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOwner()}
            placeholder="Owner name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addOwner} disabled={!newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Add
          </button>
        </div>
      </div>

      {/* Share percentages per apartment */}
      {owners.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Ownership shares (%)</h3>
          <p className="text-xs text-slate-400 mb-4">Set each owner's percentage per apartment. Shares should add up to 100%.</p>
          <div className="space-y-4">
            {apartments.map(apt => {
              const total = aptShareTotals[apt.id] || 0;
              const ok = Math.abs(total - 100) < 0.1;
              return (
                <div key={apt.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-slate-700">{apt.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {Math.round(total)}% allocated
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {owners.map(owner => (
                      <div key={owner.id} className="flex items-center gap-2">
                        <label className="text-xs text-slate-600 w-20 truncate">{owner.name}</label>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={shares[apt.id]?.[owner.id] ?? ''}
                          onChange={e => setShare(apt.id, owner.id, e.target.value)}
                          placeholder="0"
                          className="w-20 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribution summary */}
      {owners.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Income Distribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="py-2 text-left font-medium">Owner</th>
                  {apartments.map(apt => (
                    <th key={apt.id} className="py-2 text-right font-medium px-3">
                      {apt.name}
                      <span className="block text-slate-400 normal-case font-normal">{fmt(aptNet[apt.id] || 0)}</span>
                    </th>
                  ))}
                  <th className="py-2 text-right font-medium px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {ownerTotals.map(owner => (
                  <tr key={owner.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{owner.name}</td>
                    {apartments.map(apt => (
                      <td key={apt.id} className="py-3 text-right text-slate-600 px-3">
                        <span className="font-medium">{fmt(owner.byApt[apt.id] || 0)}</span>
                        <span className="block text-xs text-slate-400">
                          {shares[apt.id]?.[owner.id] || 0}%
                        </span>
                      </td>
                    ))}
                    <td className="py-3 text-right font-bold text-green-700 px-3">{fmt(owner.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

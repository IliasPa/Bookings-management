import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const fmt = n => `€${Math.round(n).toLocaleString('en-EU')}`;

/** Format a phone number with spaces as you type.
 *  +30 694 123 4567  /  694 123 4567  /  +44 7700 900 123 */
const fmtPhone = (raw) => {
  const s = raw.replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) {
    const prefix = s.slice(0, 3);   // e.g. +30
    const digits = s.slice(3);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 3));
    if (digits.length > 3) parts.push(digits.slice(3, 6));
    if (digits.length > 6) parts.push(digits.slice(6, 10));
    return prefix + (parts.length ? ' ' + parts.join(' ') : '');
  }
  const parts = [];
  if (s.length > 0) parts.push(s.slice(0, 3));
  if (s.length > 3) parts.push(s.slice(3, 6));
  if (s.length > 6) parts.push(s.slice(6, 10));
  return parts.join(' ');
};

export default function Owners() {
  const { bookings, apartments, setApartments, manager, setManager, markDirty } = useData();

  // ── Apartments management ─────────────────────────────────────────────────
  const [newAptName, setNewAptName] = useState('');
  const [editApt,    setEditApt]    = useState(null);
  const [delApt,     setDelApt]     = useState(null);

  const addApartment = () => {
    const name = newAptName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (apartments.find(a => a.id === id)) return;
    setApartments(prev => [...prev, { id, name, notes: '', owner: '', ownerPhone: '' }]);
    markDirty();
    setNewAptName('');
  };

  const saveApartment = () => {
    if (!editApt?.name.trim()) return;
    setApartments(prev => prev.map(a => a.id === editApt.id ? { ...editApt } : a));
    markDirty();
    setEditApt(null);
  };

  const deleteApartment = () => {
    setApartments(prev => prev.filter(a => a.id !== delApt.id));
    markDirty();
    setDelApt(null);
  };

  // ── Manager ───────────────────────────────────────────────────────────────
  const [managerDraft, setManagerDraft] = useState(null); // null = view mode

  const saveManager = () => {
    setManager(managerDraft);
    markDirty();
    setManagerDraft(null);
  };

  // ── Ownership shares — stored inside each apartment object ───────────────
  // Derive a flat { aptId: { personId: pct } } map from apartments for easy lookup
  const shares = Object.fromEntries(apartments.map(a => [a.id, a.shares || {}]));

  const setShare = (aptId, personId, val) => {
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setApartments(prev => prev.map(a =>
      a.id === aptId ? { ...a, shares: { ...(a.shares || {}), [personId]: pct } } : a
    ));
    markDirty();
  };

  // ── Derived people list: unique apt owners + manager ──────────────────────
  // Owner ID = their name; Manager ID = 'manager' (stable)
  const ownerNames = [...new Set(apartments.map(a => a.owner).filter(Boolean))];
  const people = [
    ...ownerNames.map(name => ({ id: name, name, role: 'owner' })),
    ...(manager.name ? [{ id: 'manager', name: manager.name, role: 'manager' }] : []),
  ];

  // ── Income distribution ───────────────────────────────────────────────────
  const aptNet = {};
  apartments.forEach(apt => {
    aptNet[apt.id] = bookings
      .filter(b => b.apartment === apt.id)
      .reduce((s, b) => s + b.netIncome, 0);
  });

  const personTotals = people.map(person => {
    const byApt = {};
    let total = 0;
    apartments.forEach(apt => {
      const pct    = (shares[apt.id]?.[person.id] || 0) / 100;
      const amount = (aptNet[apt.id] || 0) * pct;
      byApt[apt.id] = amount;
      total += amount;
    });
    return { ...person, byApt, total };
  });

  const aptShareTotals = {};
  apartments.forEach(apt => {
    aptShareTotals[apt.id] = people.reduce((s, p) => s + (shares[apt.id]?.[p.id] || 0), 0);
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Apartments & Owners ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Apartments &amp; Owners</h3>

        <div className="space-y-2 mb-4">
          {apartments.map(apt => (
            <div key={apt.id} className="border border-slate-100 rounded-lg p-3">
              {editApt?.id === apt.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                      <input
                        type="text" value={editApt.name} autoFocus
                        onChange={e => setEditApt(a => ({ ...a, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Escape') setEditApt(null); }}
                        className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Owner</label>
                      <input
                        type="text" value={editApt.owner ?? ''}
                        onChange={e => setEditApt(a => ({ ...a, owner: e.target.value }))}
                        placeholder="Owner name"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
                      <input
                        type="text" value={editApt.ownerPhone ?? ''}
                        onChange={e => setEditApt(a => ({ ...a, ownerPhone: fmtPhone(e.target.value) }))}
                        placeholder="+30 694 123 4567"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                      <input
                        type="text" value={editApt.notes ?? ''}
                        onChange={e => setEditApt(a => ({ ...a, notes: e.target.value }))}
                        placeholder="e.g. 93 m²"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveApartment}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditApt(null)}
                      className="px-3 py-1 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{apt.name}</p>
                    {apt.notes && <p className="text-xs text-slate-400 mt-0.5">{apt.notes}</p>}
                    {apt.owner ? (
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-xs text-slate-600">👤 {apt.owner}</span>
                        {apt.ownerPhone && <span className="text-xs text-slate-400">📞 {apt.ownerPhone}</span>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 italic">No owner set</p>
                    )}
                  </div>
                  <button onClick={() => setEditApt({ ...apt })} className="text-xs text-slate-400 hover:text-blue-600">Edit</button>
                  <button onClick={() => setDelApt(apt)}         className="text-xs text-slate-400 hover:text-red-600">Delete</button>
                </div>
              )}
            </div>
          ))}
          {apartments.length === 0 && <p className="text-sm text-slate-400">No apartments added yet.</p>}
        </div>

        <div className="flex gap-2">
          <input
            type="text" value={newAptName} onChange={e => setNewAptName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addApartment(); }}
            placeholder="New apartment name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={addApartment} disabled={!newAptName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Add
          </button>
        </div>
      </div>

      {/* ── Manager ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Manager</h3>

        {managerDraft ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                <input
                  type="text" value={managerDraft.name} autoFocus
                  onChange={e => setManagerDraft(m => ({ ...m, name: e.target.value }))}
                  placeholder="Manager name"
                  className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
                <input
                  type="text" value={managerDraft.phone ?? ''}
                  onChange={e => setManagerDraft(m => ({ ...m, phone: fmtPhone(e.target.value) }))}
                  placeholder="+30 694 123 4567"
                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveManager}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
              <button onClick={() => setManagerDraft(null)}
                className="px-3 py-1 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {manager.name ? (
                <>
                  <span className="text-sm font-medium text-slate-800">👤 {manager.name}</span>
                  {manager.phone && <span className="text-xs text-slate-400">📞 {manager.phone}</span>}
                </>
              ) : (
                <span className="text-sm text-slate-400 italic">No manager set</span>
              )}
            </div>
            <button onClick={() => setManagerDraft({ ...manager })}
              className="text-xs text-slate-400 hover:text-blue-600">Edit</button>
          </div>
        )}
      </div>

      {/* ── Ownership shares (%) ──────────────────────────────────────────── */}
      {people.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Ownership shares (%)</h3>
          <p className="text-xs text-slate-400 mb-4">
            Set each person's percentage per apartment. Shares should add up to 100%.
          </p>
          <div className="space-y-4">
            {apartments.map(apt => {
              const total = aptShareTotals[apt.id] || 0;
              const ok    = Math.abs(total - 100) < 0.1;
              return (
                <div key={apt.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-slate-700">{apt.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {Math.round(total)}% allocated
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {people.map(person => (
                      <div key={person.id} className="flex items-center gap-2">
                        <label className="text-xs text-slate-600 w-28 truncate">
                          {person.name}
                          {person.role === 'manager' && (
                            <span className="ml-1 text-slate-400">(mgr)</span>
                          )}
                        </label>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={shares[apt.id]?.[person.id] ?? ''}
                          onChange={e => setShare(apt.id, person.id, e.target.value)}
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

      {/* ── Income Distribution ───────────────────────────────────────────── */}
      {people.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Income Distribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="py-2 text-left font-medium">Person</th>
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
                {personTotals.map(person => (
                  <tr key={person.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 text-slate-800">
                      <span className="font-medium">{person.name}</span>
                      {person.role === 'manager' && (
                        <span className="ml-1.5 text-xs text-slate-400">(mgr)</span>
                      )}
                    </td>
                    {apartments.map(apt => (
                      <td key={apt.id} className="py-3 text-right text-slate-600 px-3">
                        <span className="font-medium">{fmt(person.byApt[apt.id] || 0)}</span>
                        <span className="block text-xs text-slate-400">
                          {shares[apt.id]?.[person.id] || 0}%
                        </span>
                      </td>
                    ))}
                    <td className="py-3 text-right font-bold text-green-700 px-3">{fmt(person.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {delApt && (
        <ConfirmModal
          message={`Delete apartment "${delApt.name}"? Bookings/expenses referencing it are kept.`}
          onConfirm={deleteApartment}
          onCancel={() => setDelApt(null)}
        />
      )}
    </div>
  );
}

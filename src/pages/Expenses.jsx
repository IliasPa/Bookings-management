import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import ExpenseModal from '../components/ExpenseModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const fmtMoney = n => n === 0 ? '—' : `€${(n || 0).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CAT_COLORS = {
  Bathroom: 'bg-blue-100 text-blue-700',
  Bedroom: 'bg-purple-100 text-purple-700',
  Kitchen: 'bg-amber-100 text-amber-700',
  Livingroom: 'bg-emerald-100 text-emerald-700',
  Outside: 'bg-sky-100 text-sky-700',
  General: 'bg-slate-100 text-slate-600',
};

export default function Expenses() {
  const { expenses, setExpenses, apartments, markDirty, expenseCategories } = useData();
  const { rooms, categories } = expenseCategories;

  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [filterApt, setFilterApt] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('apartment');

  const filtered = expenses
    .filter(e => filterApt === 'all' || e.apartment === filterApt)
    .filter(e => filterRoom === 'all' || e.categoryI === filterRoom)
    .filter(e => filterCat === 'all' || e.categoryII === filterCat)
    .filter(e => !search || e.item.toLowerCase().includes(search.toLowerCase()) || (e.where || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'apartment') return a.apartment.localeCompare(b.apartment);
      if (sortBy === 'room') return a.categoryI.localeCompare(b.categoryI);
      if (sortBy === 'category') return a.categoryII.localeCompare(b.categoryII);
      if (sortBy === 'total') return b.totalCost - a.totalCost;
      if (sortBy === 'item') return a.item.localeCompare(b.item);
      return 0;
    });

  const byApt = {};
  expenses.forEach(e => { byApt[e.apartment] = (byApt[e.apartment] || 0) + e.totalCost; });
  const aptOrder = [...apartments.map(a => a.name), 'General'];
  const grandTotal = Object.values(byApt).reduce((s, v) => s + v, 0);

  const subCats = filterRoom === 'all' ? [] : (categories[filterRoom] || []);

  const handleSave = (data) => {
    if (modal === 'add') {
      const expense = { id: `ex_${Date.now()}`, ...data };
      setExpenses(prev => [...prev, expense]);
    } else {
      setExpenses(prev => prev.map(e => e.id === modal.id ? { ...e, ...data } : e));
    }
    markDirty();
    setModal(null);
  };

  const handleDelete = () => {
    setExpenses(prev => prev.filter(e => e.id !== delTarget.id));
    markDirty();
    setDelTarget(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {aptOrder.map(apt => (
          <div key={apt} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-0.5">{apt}</p>
            <p className="text-xl font-bold text-red-600">€{Math.round(byApt[apt] || 0)}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 mb-0.5">Total</p>
          <p className="text-xl font-bold text-slate-800">€{Math.round(grandTotal)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
          <select value={filterApt} onChange={e => setFilterApt(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All apartments</option>
            {apartments.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            <option value="General">General</option>
          </select>
          <select value={filterRoom} onChange={e => { setFilterRoom(e.target.value); setFilterCat('all'); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All rooms</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {filterRoom !== 'all' && subCats.length > 0 && (
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All categories</option>
              {subCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="apartment">Sort: Apartment</option>
            <option value="room">Sort: Room</option>
            <option value="category">Sort: Category</option>
            <option value="item">Sort: Item</option>
            <option value="total">Sort: Cost ↓</option>
          </select>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No expenses found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Apartment</th>
                  <th className="px-4 py-3 text-left font-medium">Room</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Where</th>
                  <th className="px-4 py-3 text-center font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Cost/unit</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Depr.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{e.apartment}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[e.categoryI] || 'bg-slate-100 text-slate-600'}`}>
                        {e.categoryI}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.categoryII}</td>
                    <td className="px-4 py-3 text-slate-800">{e.item}</td>
                    <td className="px-4 py-3 text-slate-500">{e.where || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{e.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{e.costPerUnit ? `€${e.costPerUnit}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtMoney(e.totalCost)}</td>
                    <td className="px-4 py-3 text-center">
                      {e.depreciation ? (
                        <span title="Depreciating asset" className="text-base leading-none">✅</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(e)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDelTarget(e)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ExpenseModal expense={modal === 'add' ? null : modal} apartments={apartments} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {delTarget && (
        <ConfirmModal message={`Delete "${delTarget.item}" (${delTarget.apartment})?`} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}

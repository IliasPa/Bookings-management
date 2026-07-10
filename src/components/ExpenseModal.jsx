import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import { buildPeople, resolvePersonId } from '../people.js';

export default function ExpenseModal({ expense, apartments, onSave, onClose }) {
  const { expenseCategories, manager } = useData();
  const { rooms, categories } = expenseCategories;

  const isNew = !expense;
  const defaultApt = apartments[0]?.name || 'General';
  const defaultRoom = rooms[0] || 'General';

  // Who could have paid: the manager plus every distinct apartment owner.
  const people = buildPeople(apartments, manager);

  const [form, setForm] = useState({
    apartment: defaultApt,
    categoryI: defaultRoom,
    categoryII: (categories[defaultRoom] || ['Other'])[0],
    item: '',
    where: '',
    quantity: 1,
    costPerUnit: '',
    totalCost: '',
    status: true,
    depreciation: false,
    notes: '',
    ...expense,
    paidBy: resolvePersonId(people, expense?.paidBy) || 'manager',
  });

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'categoryI') updated.categoryII = (categories[v] || ['Other'])[0];
    if (k === 'quantity' || k === 'costPerUnit') {
      const qty = parseFloat(k === 'quantity' ? v : updated.quantity);
      const cpu = parseFloat(k === 'costPerUnit' ? v : updated.costPerUnit);
      if (!isNaN(qty) && !isNaN(cpu)) updated.totalCost = (qty * cpu).toFixed(2);
    }
    if (k === 'totalCost') {
      const total = parseFloat(v);
      const qty = parseFloat(updated.quantity);
      if (!isNaN(total) && !isNaN(qty) && qty > 0) updated.costPerUnit = (total / qty).toFixed(2);
    }
    return updated;
  });

  const aptOptions = [
    ...apartments.map(a => ({ id: a.name, name: a.name })),
    { id: 'General', name: 'General' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      costPerUnit: parseFloat(form.costPerUnit) || 0,
      totalCost: parseFloat(form.totalCost) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isNew ? 'Add Expense' : 'Edit Expense'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Apartment</label>
              <select value={form.apartment} onChange={e => set('apartment', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {aptOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Room</label>
              <select value={form.categoryI} onChange={e => set('categoryI', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {rooms.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <select value={form.categoryII} onChange={e => set('categoryII', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(categories[form.categoryI] || ['Other']).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Item</label>
              <input type="text" value={form.item} onChange={e => set('item', e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Where purchased</label>
              <input type="text" value={form.where} onChange={e => set('where', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Who purchased</label>
              <select value={form.paidBy} onChange={e => set('paidBy', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.role === 'manager' ? ' (mgr)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Quantity</label>
              <input type="number" min="0" step="1" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cost/unit (€)</label>
              <input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={e => set('costPerUnit', e.target.value)}
                placeholder="auto"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Total (€)</label>
              <input type="number" min="0" step="0.01" value={form.totalCost} onChange={e => set('totalCost', e.target.value)}
                placeholder="auto"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.depreciation} onChange={e => set('depreciation', e.target.checked)} className="rounded" />
              Depreciating asset
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
            <input type="text" value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {isNew ? 'Add Expense' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

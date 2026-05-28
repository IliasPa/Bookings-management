import { useState } from 'react';
import { useData } from '../DataContext.jsx';

export default function ConsumableModal({ consumable, onSave, onClose }) {
  const { apartments } = useData();
  const isNew = !consumable;
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    apartment: apartments[0]?.id || 'general',
    name: '',
    costModel: 'perStay',
    quantityPerUse: 1,
    guestsDefault: 4,
    dateBought: today,
    quantity: 1,
    notes: '',
    ...consumable,
    totalCost: consumable
      ? (consumable.totalCost !== undefined ? consumable.totalCost : (consumable.costPerUnit ? consumable.costPerUnit * consumable.quantity : ''))
      : '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      quantityPerUse: parseFloat(form.quantityPerUse) || 1,
      guestsDefault: parseInt(form.guestsDefault) || 4,
      quantity: parseFloat(form.quantity) || 0,
      totalCost: parseFloat(form.totalCost) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isNew ? 'Add Consumable Stock' : 'Edit Consumable'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Item name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
                placeholder="e.g. Shampoo sachets"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Apartment</label>
              <select value={form.apartment} onChange={e => set('apartment', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                <option value="general">General (all)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">Cost model</label>
            <div className="flex bg-slate-100 rounded-lg p-1 w-fit gap-1">
              {[['perStay', 'Per stay'], ['perGuest', 'Per guest']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('costModel', v)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${form.costModel === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {form.costModel === 'perGuest'
                ? 'Consumed amount × guests per stay (e.g. sachets: 2 per guest)'
                : 'Fixed amount used each stay regardless of guests (e.g. welcome kit: 1 per stay)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Qty per {form.costModel === 'perGuest' ? 'guest' : 'stay'}
              </label>
              <input type="number" min="0" step="0.01" value={form.quantityPerUse}
                onChange={e => set('quantityPerUse', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {form.costModel === 'perGuest' && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Default guests / stay</label>
                <input type="number" min="1" step="1" value={form.guestsDefault}
                  onChange={e => set('guestsDefault', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Date bought</label>
              <input type="date" value={form.dateBought} onChange={e => set('dateBought', e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Qty bought</label>
              <input type="number" min="0" step="1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Total cost (€)</label>
              <input type="number" min="0" step="0.01" value={form.totalCost}
                onChange={e => set('totalCost', e.target.value)}
                placeholder="optional"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
            <input type="text" value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Any notes…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {isNew ? 'Add Stock' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

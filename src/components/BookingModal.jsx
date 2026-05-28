import { useState, useEffect } from 'react';

const PLATFORMS = ['Booking', 'Airbnb', 'Direct', 'Friends', 'Other'];

const dateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export default function BookingModal({ booking, apartments, onSave, onClose }) {
  const isNew = !booking;
  const [form, setForm] = useState({
    apartment: apartments[0]?.id || '',
    checkIn: isNew ? dateStr(0) : '',
    checkOut: isNew ? dateStr(1) : '',
    platform: 'Booking',
    reservation: '',
    commission: '',
    notes: '',
    ...booking,
  });

  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : (booking?.nights || 0);
  const netIncome = (parseFloat(form.reservation) || 0) - (parseFloat(form.commission) || 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      nights,
      netIncome: parseFloat(netIncome.toFixed(2)),
      reservation: parseFloat(form.reservation) || 0,
      commission: parseFloat(form.commission) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isNew ? 'Add Booking' : 'Edit Booking'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Apartment</label>
              <select
                value={form.apartment}
                onChange={e => set('apartment', e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Platform</label>
              <select
                value={form.platform}
                onChange={e => set('platform', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={e => set('checkIn', e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                onChange={e => set('checkOut', e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Reservation (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.reservation}
                onChange={e => set('reservation', e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Commission (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.commission}
                onChange={e => set('commission', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Net Income</label>
              <div className="border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium">
                €{netIncome.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <span>{nights} night{nights !== 1 ? 's' : ''}</span>
            {nights > 0 && <span>· €{(netIncome / nights).toFixed(0)}/night</span>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Guest name, special notes…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {isNew ? 'Add Booking' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

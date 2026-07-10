import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { DEFAULT_CONFIG } from '../github.js';
import { DEFAULT_CATEGORIES } from '../categories.js';

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

export default function Settings() {
  const {
    apartments, setApartments, markDirty,
    token, config, saveToken, saveConfig, reload,
    showBookingFinancials, saveShowBookingFinancials,
    expenseCategories, saveExpenseCategories,
  } = useData();

  const [newAptName, setNewAptName] = useState('');
  const [editApt, setEditApt] = useState(null);
  const [delApt, setDelApt] = useState(null);
  const [ghForm, setGhForm] = useState({ ...config, token: '' });
  const [ghSaved, setGhSaved] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [reloadStatus, setReloadStatus] = useState('');

  // Categories editing
  const [newRoom, setNewRoom] = useState('');
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [newCat, setNewCat] = useState('');

  const addApartment = () => {
    if (!newAptName.trim()) return;
    const id = newAptName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (apartments.find(a => a.id === id)) return;
    setApartments(prev => [...prev, { id, name: newAptName.trim(), notes: '' }]);
    markDirty();
    setNewAptName('');
  };

  const renameApartment = () => {
    if (!editApt?.name.trim()) return;
    setApartments(prev => prev.map(a => a.id === editApt.id ? { ...a, name: editApt.name, notes: editApt.notes ?? '' } : a));
    markDirty();
    setEditApt(null);
  };

  const deleteApartment = () => {
    setApartments(prev => prev.filter(a => a.id !== delApt.id));
    markDirty();
    setDelApt(null);
  };

  const saveGitHub = () => {
    const newConfig = { owner: ghForm.owner, repo: ghForm.repo, branch: ghForm.branch || 'main' };
    saveConfig(newConfig);
    if (ghForm.token) saveToken(ghForm.token);
    setGhSaved(true);
    setTimeout(() => setGhSaved(false), 3000);
  };

  const handleReload = async () => {
    setReloadStatus('loading');
    try {
      await reload();
      setReloadStatus('done');
      setTimeout(() => setReloadStatus(''), 2000);
    } catch {
      setReloadStatus('error');
      setTimeout(() => setReloadStatus(''), 3000);
    }
  };

  // Category helpers
  const addRoom = () => {
    const name = newRoom.trim();
    if (!name || expenseCategories.rooms.includes(name)) return;
    saveExpenseCategories({
      rooms: [...expenseCategories.rooms, name],
      categories: { ...expenseCategories.categories, [name]: ['Other'] },
    });
    setNewRoom('');
    setExpandedRoom(name);
  };

  const deleteRoom = (room) => {
    const rooms = expenseCategories.rooms.filter(r => r !== room);
    const categories = { ...expenseCategories.categories };
    delete categories[room];
    saveExpenseCategories({ rooms, categories });
    if (expandedRoom === room) setExpandedRoom(null);
  };

  const addCategory = (room) => {
    const name = newCat.trim();
    if (!name) return;
    const existing = expenseCategories.categories[room] || [];
    if (existing.includes(name)) return;
    saveExpenseCategories({
      ...expenseCategories,
      categories: { ...expenseCategories.categories, [room]: [...existing, name] },
    });
    setNewCat('');
  };

  const deleteCategory = (room, cat) => {
    const existing = expenseCategories.categories[room] || [];
    saveExpenseCategories({
      ...expenseCategories,
      categories: { ...expenseCategories.categories, [room]: existing.filter(c => c !== cat) },
    });
  };

  const resetCategories = () => saveExpenseCategories(DEFAULT_CATEGORIES);

  return (
    <div className="space-y-5 max-w-2xl">
      <Section title="GitHub Integration">
        <p className="text-sm text-slate-500 mb-4">
          Data is stored in <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">data/</code> in your GitHub repo.
          The token is saved only in your browser's localStorage.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">GitHub owner</label>
              <input type="text" value={ghForm.owner} onChange={e => setGhForm(f => ({ ...f, owner: e.target.value }))}
                placeholder={DEFAULT_CONFIG.owner}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Repository</label>
              <input type="text" value={ghForm.repo} onChange={e => setGhForm(f => ({ ...f, repo: e.target.value }))}
                placeholder={DEFAULT_CONFIG.repo}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Branch</label>
              <input type="text" value={ghForm.branch} onChange={e => setGhForm(f => ({ ...f, branch: e.target.value }))}
                placeholder="main"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Token <span className="text-green-600 font-normal">{token ? '● active' : '○ not set'}</span>
              </label>
              <div className="flex gap-1">
                <input type={tokenVisible ? 'text' : 'password'} value={ghForm.token}
                  onChange={e => setGhForm(f => ({ ...f, token: e.target.value }))}
                  placeholder={token ? '(leave blank to keep current)' : 'ghp_…'}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => setTokenVisible(v => !v)} className="px-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {tokenVisible
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    }
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={saveGitHub}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${ghSaved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {ghSaved ? 'Saved!' : 'Save Settings'}
            </button>
            <button onClick={handleReload}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
              {reloadStatus === 'loading' ? 'Loading…' : reloadStatus === 'done' ? 'Refreshed!' : 'Reload from GitHub'}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Display">
        <div className="space-y-4">
          <Toggle
            label="Show gross & commission in Bookings"
            description="Toggle off to show only net income in the bookings table."
            checked={showBookingFinancials}
            onChange={saveShowBookingFinancials}
          />
        </div>
      </Section>

      <Section title="Apartments">
        <div className="space-y-2 mb-4">
          {apartments.map(apt => (
            <div key={apt.id} className="border border-slate-100 rounded-lg p-3">
              {editApt?.id === apt.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={editApt.name} onChange={e => setEditApt(a => ({ ...a, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Escape') setEditApt(null); }}
                      autoFocus className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={renameApartment} className="text-sm text-blue-600 hover:underline">Save</button>
                    <button onClick={() => setEditApt(null)} className="text-sm text-slate-400 hover:underline">Cancel</button>
                  </div>
                  <textarea value={editApt.notes ?? ''} onChange={e => setEditApt(a => ({ ...a, notes: e.target.value }))}
                    placeholder="Notes…" rows={2}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 font-medium">{apt.name}</p>
                    {apt.notes && <p className="text-xs text-slate-400 mt-0.5">{apt.notes}</p>}
                  </div>
                  <button onClick={() => setEditApt({ ...apt })} className="text-xs text-slate-400 hover:text-blue-600">Edit</button>
                  <button onClick={() => setDelApt(apt)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newAptName} onChange={e => setNewAptName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addApartment(); }}
            placeholder="New apartment name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addApartment} disabled={!newAptName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Add
          </button>
        </div>
      </Section>

      <Section title="Expense Categories">
        <p className="text-xs text-slate-400 mb-4">Manage rooms and their sub-categories used in expense entries.</p>
        <div className="space-y-2 mb-4">
          {expenseCategories.rooms.map(room => (
            <div key={room} className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
                <button
                  onClick={() => setExpandedRoom(expandedRoom === room ? null : room)}
                  className="flex-1 text-left text-sm font-medium text-slate-800 flex items-center gap-2"
                >
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedRoom === room ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {room}
                  <span className="text-xs text-slate-400 font-normal">
                    ({(expenseCategories.categories[room] || []).length} categories)
                  </span>
                </button>
                <button onClick={() => deleteRoom(room)} className="text-xs text-slate-400 hover:text-red-600">Delete room</button>
              </div>
              {expandedRoom === room && (
                <div className="px-3 py-2 space-y-1.5">
                  {(expenseCategories.categories[room] || []).map(cat => (
                    <div key={cat} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-slate-700">{cat}</span>
                      <button onClick={() => deleteCategory(room, cat)} className="text-xs text-slate-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCategory(room); }}
                      placeholder="New category…"
                      className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => addCategory(room)} disabled={!newCat.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" value={newRoom} onChange={e => setNewRoom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addRoom(); }}
            placeholder="New room name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addRoom} disabled={!newRoom.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Add room
          </button>
          <button onClick={resetCategories} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
            Reset
          </button>
        </div>
      </Section>

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

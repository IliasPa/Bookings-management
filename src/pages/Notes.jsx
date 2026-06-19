import { useState } from 'react';
import { useData } from '../DataContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const newId = () => `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export default function Notes() {
  const { notes, setNotes, markDirty } = useData();

  const [draft, setDraft] = useState(null); // { id?, title, body }  null = closed
  const [delNote, setDelNote] = useState(null);

  const openNew = () => setDraft({ title: '', body: '' });
  const openEdit = (n) => setDraft({ ...n });

  const saveDraft = () => {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) { setDraft(null); return; }
    if (draft.id) {
      setNotes(prev => prev.map(n => n.id === draft.id ? { ...n, title, body } : n));
    } else {
      setNotes(prev => [...prev, { id: newId(), title, body }]);
    }
    markDirty();
    setDraft(null);
  };

  const deleteNote = () => {
    setNotes(prev => prev.filter(n => n.id !== delNote.id));
    markDirty();
    setDelNote(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-800">Notes &amp; Info</h3>
          {!draft && (
            <button onClick={openNew}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + Add note
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Phone numbers, codes, supplier contacts and anything else useful for managing the apartments.
        </p>

        {draft && (
          <div className="border border-blue-200 rounded-lg p-4 mb-4 space-y-3 bg-blue-50/40">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Title</label>
              <input
                type="text" value={draft.title} autoFocus
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Plumber, Wi-Fi password, Gate code…"
                className="w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Details</label>
              <textarea
                value={draft.body} rows={4}
                onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                placeholder="Phone numbers, instructions, random info…"
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveDraft}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
              <button onClick={() => setDraft(null)}
                className="px-3 py-1 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {note.title && <p className="text-sm font-medium text-slate-800 mb-1">{note.title}</p>}
                  {note.body && <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{note.body}</p>}
                </div>
                <button onClick={() => openEdit(note)} className="text-xs text-slate-400 hover:text-blue-600">Edit</button>
                <button onClick={() => setDelNote(note)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
          {notes.length === 0 && !draft && (
            <p className="text-sm text-slate-400">No notes yet. Add one to keep phones and info handy.</p>
          )}
        </div>
      </div>

      {delNote && (
        <ConfirmModal
          message={`Delete note "${delNote.title || 'Untitled'}"?`}
          onConfirm={deleteNote}
          onCancel={() => setDelNote(null)}
        />
      )}
    </div>
  );
}

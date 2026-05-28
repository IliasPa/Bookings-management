import { useState } from 'react';

export default function SetupModal({ onSave }) {
  const [token, setToken] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="logo" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Apartment Manager</h1>
            <p className="text-sm text-slate-400">Lefkada · Revekka &amp; Back</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5">
          Enter your GitHub Personal Access Token to connect to the data. The token is stored
          only in your browser's localStorage and never sent anywhere except GitHub's API.
        </p>

        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
          GitHub Token
        </label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && token) onSave(token); }}
          placeholder="ghp_…"
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=ApartmentManager"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline block mb-6"
        >
          Create a token on GitHub (needs repo scope) →
        </a>

        <button
          onClick={() => onSave(token)}
          disabled={!token.trim()}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

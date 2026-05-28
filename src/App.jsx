import { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataContext } from './DataContext.jsx';
import { loadAllData, saveAllData, getStoredToken, getStoredConfig } from './github.js';
import { DEFAULT_CATEGORIES } from './categories.js';
import Layout from './components/Layout.jsx';
import Overview from './pages/Overview.jsx';
import Bookings from './pages/Bookings.jsx';
import Expenses from './pages/Expenses.jsx';
import Settings from './pages/Settings.jsx';
import Owners from './pages/Owners.jsx';
import Cleaning from './pages/Cleaning.jsx';
import Consumables from './pages/Consumables.jsx';

function getStoredCategories() {
  try {
    const s = localStorage.getItem('expense_categories');
    return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export default function App() {
  const [token, setToken] = useState(getStoredToken);
  const [config, setConfig] = useState(getStoredConfig);

  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [cleaning, setCleaning] = useState({ hiddenCosts: [], rates: { fullClean: 60, beddingChange: 60, beddingInterval: 4 } });

  const [showBookingFinancials, setShowBookingFinancials] = useState(
    () => localStorage.getItem('show_booking_financials') !== 'false'
  );
  const [expenseCategories, setExpenseCategories] = useState(getStoredCategories);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pushState, setPushState] = useState('idle');
  const [pushError, setPushError] = useState('');

  const load = useCallback(async (tk, cfg) => {
    setLoading(true);
    setLoadError('');

    try {
      const cached = localStorage.getItem('data_cache');
      if (cached) {
        const c = JSON.parse(cached);
        setBookings(c.bookings || []);
        setExpenses(c.expenses || []);
        setApartments(c.apartments || []);
        setConsumables(c.consumables || []);
        setCleaning(c.cleaning || { hiddenCosts: [], rates: { fullClean: 60, beddingChange: 60, beddingInterval: 4 } });
        if (c.expenseCategories) setExpenseCategories(c.expenseCategories);
        setLoading(false);
      }
    } catch {}

    if (!tk) { setLoading(false); return; }

    try {
      const data = await loadAllData(tk, cfg);
      setBookings(data.bookings);
      setExpenses(data.expenses);
      setApartments(data.apartments);
      setConsumables(data.consumables || []);
      setCleaning(data.cleaning || { hiddenCosts: [], rates: { fullClean: 60, beddingChange: 60, beddingInterval: 4 } });
      if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
      localStorage.setItem('data_cache', JSON.stringify(data));
      setPushState('idle');
      setLoading(false);
    } catch (err) {
      setLoadError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(token, config);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (pushState === 'dirty') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pushState]);

  const markDirty = useCallback(() => {
    setPushState(prev => (prev === 'idle' || prev === 'success' ? 'dirty' : prev));
  }, []);

  const handlePush = useCallback(async () => {
    if (!token) {
      setPushError('No token — add it in Settings');
      setPushState('error');
      setTimeout(() => setPushState(prev => prev === 'error' ? 'dirty' : prev), 5000);
      return;
    }
    setPushState('pushing');
    setPushError('');
    try {
      await saveAllData({ bookings, expenses, expenseCategories, apartments, consumables, cleaning }, token, config);
      localStorage.setItem('data_cache', JSON.stringify({ bookings, expenses, expenseCategories, apartments, consumables, cleaning }));
      setPushState('success');
      setTimeout(() => setPushState('idle'), 3000);
    } catch (err) {
      setPushError(err.message);
      setPushState('error');
      setTimeout(() => setPushState('dirty'), 5000);
    }
  }, [bookings, expenses, expenseCategories, apartments, consumables, cleaning, token, config]);

  const saveToken = useCallback((newToken) => {
    localStorage.setItem('gh_token', newToken);
    setToken(newToken);
    load(newToken, config);
  }, [config, load]);

  const saveConfig = useCallback((newConfig) => {
    localStorage.setItem('gh_config', JSON.stringify(newConfig));
    setConfig(newConfig);
  }, []);

  const saveShowBookingFinancials = useCallback((val) => {
    localStorage.setItem('show_booking_financials', String(val));
    setShowBookingFinancials(val);
  }, []);

  const saveExpenseCategories = useCallback((cats) => {
    setExpenseCategories(cats);
    markDirty();
  }, [markDirty]);

  const ctx = {
    bookings, setBookings,
    expenses, setExpenses,
    apartments, setApartments,
    consumables, setConsumables,
    cleaning, setCleaning,
    markDirty,
    token, config,
    saveToken, saveConfig,
    reload: () => load(token, config),
    showBookingFinancials, saveShowBookingFinancials,
    expenseCategories, saveExpenseCategories,
  };

  return (
    <DataContext.Provider value={ctx}>
      <HashRouter>
        <Layout pushState={pushState} pushError={pushError} onPush={handlePush} hasToken={!!token}>
          {loading && !bookings.length ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Loading from GitHub…
            </div>
          ) : loadError && !bookings.length ? (
            <div className="p-8 text-center">
              <p className="text-red-600 text-sm mb-4">{loadError}</p>
              <button
                onClick={() => load(token, config)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/owners" element={<Owners />} />
              <Route path="/consumables" element={<Consumables />} />
              <Route path="/cleaning" element={<Cleaning />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          )}
        </Layout>
      </HashRouter>
    </DataContext.Provider>
  );
}

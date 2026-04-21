;(function () {
  const LOCAL_API_ORIGIN = "http://localhost:3001";
  const GITHUB_SYNC_KEY = "vardania.githubSync";

  const FILES = {
    bookings: "data/bookings.json",
    expenses: "data/expenses.json",
    deletedBookings: "data/deleted_bookings.json",
    deletedExpenses: "data/deleted_expenses.json",
  };

  const state = {
    ready: false,
    bookings: [],
    expenses: [],
    deletedBookings: [],
    deletedExpenses: [],
  };

  const originalFetch = window.fetch.bind(window);

  function parseJsonSafe(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }

  function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function encodeGitHubPath(path) {
    return path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  function detectGitHubRepoFromLocation() {
    const host = window.location.hostname || "";
    const m = host.match(/^([^.]+)\.github\.io$/i);
    if (!m) return null;
    const owner = m[1];
    const parts = (window.location.pathname || "").split("/").filter(Boolean);
    let repo = parts[0] || `${owner}.github.io`;
    if (repo.toLowerCase().endsWith(".html")) {
      repo = `${owner}.github.io`;
    }
    return { owner, repo, branch: "main" };
  }

  function loadGitHubConfig() {
    const detected = detectGitHubRepoFromLocation() || {};
    const saved = parseJsonSafe(localStorage.getItem(GITHUB_SYNC_KEY) || "{}", {});
    return {
      owner: saved.owner || detected.owner || "",
      repo: saved.repo || detected.repo || "",
      branch: saved.branch || detected.branch || "main",
      token: saved.token || "",
    };
  }

  function saveGitHubConfig(cfg) {
    try {
      localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(cfg));
    } catch (err) {}
  }

  function ensureGitHubConfig() {
    const cfg = loadGitHubConfig();
    if (!cfg.owner) {
      const owner = window.prompt("GitHub owner (user or organization):", "");
      if (!owner) return null;
      cfg.owner = owner.trim();
    }
    if (!cfg.repo) {
      const repo = window.prompt("GitHub repository name:", "");
      if (!repo) return null;
      cfg.repo = repo.trim();
    }
    if (!cfg.branch) {
      const branch = window.prompt("GitHub branch:", "main");
      if (!branch) return null;
      cfg.branch = branch.trim();
    }
    // Do not prompt for a token in the browser. The server will use a
    // server-side GITHUB_TOKEN to perform GitHub writes, so keep token empty.
    cfg.token = "";
    saveGitHubConfig(cfg);
    return cfg;
  }

  async function readErrorMessage(response, fallback) {
    try {
      const payload = await response.json();
      return payload.message || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function makeJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function isApiRoute(urlString) {
    try {
      const u = new URL(urlString, window.location.href);
      return (
        u.pathname.startsWith("/api/") &&
        (u.origin === LOCAL_API_ORIGIN || u.origin === window.location.origin)
      );
    } catch (err) {
      return false;
    }
  }

  function normalizeBooking(payload) {
    const gross = parseFloat(payload.gross) || 0;
    const commission = parseFloat(payload.commission) || 0;
    const nights =
      payload.checkIn && payload.checkOut
        ? Math.round(
            (new Date(payload.checkOut) - new Date(payload.checkIn)) / 86400000,
          )
        : parseInt(payload.nights) || 0;
    return {
      ...payload,
      gross,
      commission,
      nights,
      net: gross - commission,
    };
  }

  function normalizeExpense(payload) {
    const qty = parseInt(payload.qty) || 0;
    const cost = parseFloat(payload.cost) || 0;
    return {
      ...payload,
      qty,
      cost,
      total: qty * cost,
      paid: !!payload.paid,
    };
  }

  async function loadJsonFile(path, fallback = []) {
    try {
      const res = await originalFetch(path);
      if (!res.ok) return fallback;
      return res.json();
    } catch (err) {
      return fallback;
    }
  }

  async function ensureLoaded() {
    if (state.ready) return;
    const [bookings, expenses, deletedBookings, deletedExpenses] =
      await Promise.all([
        loadJsonFile(FILES.bookings, []),
        loadJsonFile(FILES.expenses, []),
        loadJsonFile(FILES.deletedBookings, []),
        loadJsonFile(FILES.deletedExpenses, []),
      ]);
    state.bookings = Array.isArray(bookings) ? bookings : [];
    state.expenses = Array.isArray(expenses) ? expenses : [];
    state.deletedBookings = Array.isArray(deletedBookings) ? deletedBookings : [];
    state.deletedExpenses = Array.isArray(deletedExpenses) ? deletedExpenses : [];
    state.ready = true;
  }

  async function githubFetchFileMeta(cfg, path) {
    // Proxy the metadata request through the local server which uses the
    // server-side token. This avoids keeping secrets in the browser.
    const params = new URLSearchParams({
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch || "main",
      path,
    });
    const url = `${LOCAL_API_ORIGIN}/api/github/metadata?${params.toString()}`;
    const res = await originalFetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const message = await readErrorMessage(res, `GitHub read failed (${res.status})`);
      throw new Error(message);
    }
    return res.json();
  }

  async function githubWriteJson(cfg, path, data, message) {
    // Use the server proxy to perform writes with the server-side token.
    const url = `${LOCAL_API_ORIGIN}/api/github/write`;
    const body = { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch || "main", path, data, message };
    const res = await originalFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const messageText = await readErrorMessage(res, `GitHub write failed (${res.status})`);
      throw new Error(messageText);
    }
  }

  function deepCopyState() {
    return parseJsonSafe(
      JSON.stringify({
        bookings: state.bookings,
        expenses: state.expenses,
        deletedBookings: state.deletedBookings,
        deletedExpenses: state.deletedExpenses,
      }),
      null,
    );
  }

  function restoreState(snapshot) {
    if (!snapshot) return;
    state.bookings = snapshot.bookings || [];
    state.expenses = snapshot.expenses || [];
    state.deletedBookings = snapshot.deletedBookings || [];
    state.deletedExpenses = snapshot.deletedExpenses || [];
  }

  async function persistState(keys, reason) {
    const cfg = ensureGitHubConfig();
    if (!cfg) {
      throw new Error("GitHub sync is not configured.");
    }

    for (const key of keys) {
      if (key === "bookings") {
        await githubWriteJson(cfg, FILES.bookings, state.bookings, `${reason} (bookings)`);
      } else if (key === "expenses") {
        await githubWriteJson(cfg, FILES.expenses, state.expenses, `${reason} (expenses)`);
      } else if (key === "deletedBookings") {
        await githubWriteJson(
          cfg,
          FILES.deletedBookings,
          state.deletedBookings,
          `${reason} (deleted bookings)`,
        );
      } else if (key === "deletedExpenses") {
        await githubWriteJson(
          cfg,
          FILES.deletedExpenses,
          state.deletedExpenses,
          `${reason} (deleted expenses)`,
        );
      }
    }
  }

  async function parseRequestBody(init) {
    if (!init || !init.body) return {};
    if (typeof init.body === "string") {
      return parseJsonSafe(init.body, {});
    }
    return {};
  }

  async function handleOfflineApi(urlString, init) {
    await ensureLoaded();

    const url = new URL(urlString, window.location.href);
    const method = (init && init.method ? init.method : "GET").toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/api/bookings") {
      return makeJsonResponse(state.bookings);
    }
    if (method === "GET" && path === "/api/expenses") {
      return makeJsonResponse(state.expenses);
    }
    if (method === "GET" && path === "/api/deleted/bookings") {
      return makeJsonResponse(state.deletedBookings);
    }
    if (method === "GET" && path === "/api/deleted/expenses") {
      return makeJsonResponse(state.deletedExpenses);
    }

    const snapshot = deepCopyState();

    try {
      if (method === "POST" && path === "/api/bookings") {
        const payload = await parseRequestBody(init);
        const id =
          state.bookings.reduce((max, b) => Math.max(max, Number(b.id || 0)), 0) + 1;
        const created = normalizeBooking({ id, ...payload });
        state.bookings.push(created);
        await persistState(["bookings"], `Add booking #${id}`);
        return makeJsonResponse(created, 201);
      }

      if (method === "POST" && path === "/api/expenses") {
        const payload = await parseRequestBody(init);
        const id =
          state.expenses.reduce((max, e) => Math.max(max, Number(e.id || 0)), 0) + 1;
        const created = normalizeExpense({ id, ...payload });
        state.expenses.push(created);
        await persistState(["expenses"], `Add expense #${id}`);
        return makeJsonResponse(created, 201);
      }

      const bookingPut = path.match(/^\/api\/bookings\/([^/]+)$/);
      if (method === "PUT" && bookingPut) {
        const id = bookingPut[1];
        const idx = state.bookings.findIndex((b) => String(b.id) === String(id));
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const body = await parseRequestBody(init);
        const updated = normalizeBooking({ ...state.bookings[idx], ...body, id: state.bookings[idx].id });
        state.bookings[idx] = updated;
        await persistState(["bookings"], `Update booking #${id}`);
        return makeJsonResponse(updated);
      }

      const expensePut = path.match(/^\/api\/expenses\/([^/]+)$/);
      if (method === "PUT" && expensePut) {
        const id = expensePut[1];
        const idx = state.expenses.findIndex((e) => String(e.id) === String(id));
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const body = await parseRequestBody(init);
        const updated = normalizeExpense({ ...state.expenses[idx], ...body, id: state.expenses[idx].id });
        state.expenses[idx] = updated;
        await persistState(["expenses"], `Update expense #${id}`);
        return makeJsonResponse(updated);
      }

      const bookingDelete = path.match(/^\/api\/bookings\/([^/]+)$/);
      if (method === "DELETE" && bookingDelete) {
        const id = bookingDelete[1];
        const idx = state.bookings.findIndex((b) => String(b.id) === String(id));
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const removed = state.bookings.splice(idx, 1)[0];
        state.deletedBookings.push(removed);
        await persistState(
          ["bookings", "deletedBookings"],
          `Delete booking #${id}`,
        );
        return makeJsonResponse(removed);
      }

      const expenseDelete = path.match(/^\/api\/expenses\/([^/]+)$/);
      if (method === "DELETE" && expenseDelete) {
        const id = expenseDelete[1];
        const idx = state.expenses.findIndex((e) => String(e.id) === String(id));
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const removed = state.expenses.splice(idx, 1)[0];
        state.deletedExpenses.push(removed);
        await persistState(
          ["expenses", "deletedExpenses"],
          `Delete expense #${id}`,
        );
        return makeJsonResponse(removed);
      }

      const restoreBooking = path.match(/^\/api\/deleted\/bookings\/([^/]+)\/restore$/);
      if (method === "POST" && restoreBooking) {
        const id = restoreBooking[1];
        const idx = state.deletedBookings.findIndex(
          (d) => String(d.id) === String(id),
        );
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const restored = state.deletedBookings.splice(idx, 1)[0];
        state.bookings.push(restored);
        await persistState(
          ["bookings", "deletedBookings"],
          `Restore booking #${id}`,
        );
        return makeJsonResponse(restored);
      }

      const restoreExpense = path.match(/^\/api\/deleted\/expenses\/([^/]+)\/restore$/);
      if (method === "POST" && restoreExpense) {
        const id = restoreExpense[1];
        const idx = state.deletedExpenses.findIndex(
          (d) => String(d.id) === String(id),
        );
        if (idx === -1) return makeJsonResponse({ error: "Not found" }, 404);
        const restored = state.deletedExpenses.splice(idx, 1)[0];
        state.expenses.push(restored);
        await persistState(
          ["expenses", "deletedExpenses"],
          `Restore expense #${id}`,
        );
        return makeJsonResponse(restored);
      }

      return makeJsonResponse({ error: "Unsupported endpoint" }, 404);
    } catch (err) {
      restoreState(snapshot);
      return makeJsonResponse(
        { error: err && err.message ? err.message : "Sync error" },
        500,
      );
    }
  }

  window.fetch = async function fetchWithOfflineFallback(input, init) {
    const urlString = typeof input === "string" ? input : input.url;
    if (!isApiRoute(urlString)) {
      return originalFetch(input, init);
    }

    try {
      return await originalFetch(input, init);
    } catch (err) {
      return handleOfflineApi(urlString, init);
    }
  };
})();


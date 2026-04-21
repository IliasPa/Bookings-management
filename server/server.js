const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const cors = require("cors");
const https = require("https");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "..", "data");

async function readJson(name) {
  const p = path.join(DATA_DIR, name);
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt);
}
async function readJsonSafe(name) {
  try {
    return await readJson(name);
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    return [];
  }
}
async function writeJson(name, data) {
  const p = path.join(DATA_DIR, name);
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

app.put("/api/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const bookings = await readJson("bookings.json");
    const idx = bookings.findIndex((b) => String(b.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const updated = { ...bookings[idx], ...req.body };
    if (updated.checkIn && updated.checkOut) {
      updated.nights = Math.round(
        (new Date(updated.checkOut) - new Date(updated.checkIn)) / 86400000,
      );
    }
    updated.gross = parseFloat(updated.gross) || 0;
    updated.commission = parseFloat(updated.commission) || 0;
    updated.net = updated.gross - updated.commission;
    bookings[idx] = updated;
    await writeJson("bookings.json", bookings);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Read endpoints for bookings and expenses
app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await readJsonSafe("bookings.json");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await readJsonSafe("expenses.json");
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Apartments (read-only)
app.get("/api/apartments", async (req, res) => {
  try {
    const a = await readJsonSafe("apartments.json");
    res.json(a);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const expenses = await readJson("expenses.json");
    const idx = expenses.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const updated = { ...expenses[idx], ...req.body };
    updated.qty = parseInt(updated.qty) || 0;
    updated.cost = parseFloat(updated.cost) || 0;
    updated.total = updated.qty * updated.cost;
    updated.paid = !!updated.paid;
    expenses[idx] = updated;
    await writeJson("expenses.json", expenses);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const bookings = await readJson("bookings.json");
    const nextId =
      bookings.reduce((m, b) => Math.max(m, Number(b.id || 0)), 0) + 1;
    const nb = { id: nextId, ...req.body };
    if (nb.checkIn && nb.checkOut) {
      nb.nights = Math.round(
        (new Date(nb.checkOut) - new Date(nb.checkIn)) / 86400000,
      );
    }
    nb.gross = parseFloat(nb.gross) || 0;
    nb.commission = parseFloat(nb.commission) || 0;
    nb.net = nb.gross - nb.commission;
    bookings.push(nb);
    await writeJson("bookings.json", bookings);
    res.status(201).json(nb);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const expenses = await readJson("expenses.json");
    const nextId =
      expenses.reduce((m, e) => Math.max(m, Number(e.id || 0)), 0) + 1;
    const ne = { id: nextId, ...req.body };
    ne.qty = parseInt(ne.qty) || 0;
    ne.cost = parseFloat(ne.cost) || 0;
    ne.total = ne.qty * ne.cost;
    ne.paid = !!ne.paid;
    expenses.push(ne);
    await writeJson("expenses.json", expenses);
    res.status(201).json(ne);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const bookings = await readJson("bookings.json");
    const idx = bookings.findIndex((b) => String(b.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const removed = bookings.splice(idx, 1)[0];
    await writeJson("bookings.json", bookings);
    // move to deleted
    const deleted = await readJsonSafe("deleted_bookings.json");
    deleted.push(removed);
    await writeJson("deleted_bookings.json", deleted);
    res.json(removed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const expenses = await readJson("expenses.json");
    const idx = expenses.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const removed = expenses.splice(idx, 1)[0];
    await writeJson("expenses.json", expenses);
    const deleted = await readJsonSafe("deleted_expenses.json");
    deleted.push(removed);
    await writeJson("deleted_expenses.json", deleted);
    res.json(removed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Deleted items endpoints
app.get("/api/deleted/bookings", async (req, res) => {
  try {
    const d = await readJsonSafe("deleted_bookings.json");
    res.json(d);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/deleted/expenses", async (req, res) => {
  try {
    const d = await readJsonSafe("deleted_expenses.json");
    res.json(d);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/deleted/bookings/:id/restore", async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await readJsonSafe("deleted_bookings.json");
    const idx = deleted.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const item = deleted.splice(idx, 1)[0];
    const bookings = await readJson("bookings.json");
    bookings.push(item);
    await writeJson("bookings.json", bookings);
    await writeJson("deleted_bookings.json", deleted);
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/deleted/expenses/:id/restore", async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await readJsonSafe("deleted_expenses.json");
    const idx = deleted.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const item = deleted.splice(idx, 1)[0];
    const expenses = await readJson("expenses.json");
    expenses.push(item);
    await writeJson("expenses.json", expenses);
    await writeJson("deleted_expenses.json", deleted);
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// serve static files from project root (one level up)
app.use(express.static(path.join(__dirname, "..")));

// --- GitHub proxy endpoints (use server-side GITHUB_TOKEN) ---
function ghApiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return reject(new Error("GITHUB_TOKEN not configured on server"));
    const options = {
      hostname: "api.github.com",
      port: 443,
      path: apiPath,
      method,
      headers: {
        "User-Agent": "vardania-host-server",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const status = res.statusCode;
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (status >= 200 && status < 300) return resolve(parsed);
          return reject({ status, body: parsed });
        } catch (e) {
          if (status >= 200 && status < 300) return resolve(data);
          return reject({ status, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      const s = JSON.stringify(body);
      req.setHeader("Content-Type", "application/json");
      req.setHeader("Content-Length", Buffer.byteLength(s));
      req.write(s);
    }
    req.end();
  });
}

function encodeGitHubPath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

app.get("/api/github/metadata", async (req, res) => {
  try {
    const { owner, repo, branch = "main", path: filePath } = req.query;
    if (!owner || !repo || !filePath) return res.status(400).json({ error: "Missing parameters" });
    const encodedPath = encodeGitHubPath(filePath);
    const apiPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
    const meta = await ghApiRequest("GET", apiPath);
    res.json(meta);
  } catch (err) {
    console.error("GitHub metadata error:", err);
    if (err && err.status) return res.status(err.status).json(err.body || { error: "GitHub error" });
    return res.status(500).json({ error: err && err.message ? err.message : "GitHub metadata error" });
  }
});

app.post("/api/github/write", async (req, res) => {
  try {
    const { owner, repo, branch = "main", path: filePath, data, message } = req.body;
    if (!owner || !repo || !filePath || typeof data === "undefined" || !message) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    const encodedPath = encodeGitHubPath(filePath);
    let sha;
    try {
      const meta = await ghApiRequest(
        "GET",
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      );
      sha = meta && meta.sha;
    } catch (e) {
      if (!e || e.status !== 404) throw e;
    }
    const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf8").toString("base64");
    const body = { message, content, branch };
    if (sha) body.sha = sha;
    const result = await ghApiRequest(
      "PUT",
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
      body,
    );
    res.json(result);
  } catch (err) {
    console.error("GitHub write error:", err);
    if (err && err.status) return res.status(err.status).json(err.body || { error: "GitHub error" });
    return res.status(500).json({ error: err && err.message ? err.message : "GitHub write error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`),
);

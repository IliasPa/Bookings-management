require('dotenv').config();
const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const cors = require("cors");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "..", "data");

async function ensureDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data dir:", err);
  }
  const files = [
    "bookings.json",
    "expenses.json",
    "deleted_bookings.json",
    "deleted_expenses.json",
    "apartments.json",
  ];
  for (const name of files) {
    const p = path.join(DATA_DIR, name);
    try {
      await fs.access(p);
      // ensure valid JSON; don't overwrite valid non-array JSON silently
      try {
        const txt = await fs.readFile(p, "utf8");
        JSON.parse(txt || "");
      } catch (err) {
        console.warn(`Initializing corrupt or empty file ${name}`);
        await fs.writeFile(p, "[]", "utf8");
      }
    } catch (err) {
      // missing - create empty array
      try {
        await fs.writeFile(p, "[]", "utf8");
        console.log(`Created missing data file: ${name}`);
      } catch (werr) {
        console.error(`Failed to create ${name}:`, werr);
      }
    }
  }
}

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
  // attempt to commit & push changes to the repo so GitHub Pages (or the repo) is updated
  const rel = `data/${name}`.replace(/\\/g, "/");
  commitAndPush(rel, `Update ${name}`).catch((err) =>
    console.error(
      "git sync error:",
      err && err.stderr ? err.stderr : err.message || err,
    ),
  );
}

async function commitAndPush(fileRelPath, message) {
  const repoRoot = path.join(__dirname, "..");
  const filePathForGit = fileRelPath.replace(/\\/g, "/");
  const lockPath = path.join(repoRoot, ".git", "index.lock");
  try {
    await exec(`git add -- "${filePathForGit}"`, { cwd: repoRoot });
  } catch (err) {
    const stderr = err && err.stderr ? err.stderr : err && err.message ? err.message : "";
    // If a stale index.lock exists, try to remove it and retry once
    if (fsSync.existsSync(lockPath) || /index.lock/.test(stderr)) {
      try {
        if (fsSync.existsSync(lockPath)) {
          fsSync.unlinkSync(lockPath);
          console.log("Removed stale git index.lock");
        }
      } catch (unlinkErr) {
        console.error("Failed to remove stale git index.lock:", unlinkErr);
        console.error("git add failed:", stderr);
        return;
      }
      try {
        await exec(`git add -- "${filePathForGit}"`, { cwd: repoRoot });
      } catch (err2) {
        console.error(
          "git add failed after removing index.lock:",
          err2 && err2.stderr ? err2.stderr : err2.message || err2,
        );
        return;
      }
    } else {
      console.error("git add failed:", stderr);
      return;
    }
  }

  try {
    const safeMessage = message.replace(/"/g, '\\"');
    await exec(`git commit -m "${safeMessage}"`, { cwd: repoRoot });
  } catch (err) {
    const stderr =
      err && err.stderr ? err.stderr : err && err.message ? err.message : "";
    if (
      /nothing to commit/i.test(stderr) ||
      /working tree clean/i.test(stderr)
    ) {
      return;
    }
    // If lock-related, try removing and retrying commit once
    if (fsSync.existsSync(lockPath) || /index.lock/.test(stderr)) {
      try {
        if (fsSync.existsSync(lockPath)) {
          fsSync.unlinkSync(lockPath);
          console.log("Removed stale git index.lock before commit");
        }
      } catch (unlinkErr) {
        console.error("Failed to remove stale git index.lock before commit:", unlinkErr);
        console.error("git commit failed:", stderr);
        return;
      }
      try {
        await exec(`git commit -m "${safeMessage}"`, { cwd: repoRoot });
      } catch (err2) {
        console.error(
          "git commit failed after removing index.lock:",
          err2 && err2.stderr ? err2.stderr : err2.message || err2,
        );
        return;
      }
    } else {
      console.error("git commit failed:", stderr);
      return;
    }
  }

  try {
    const branch = process.env.GITHUB_BRANCH || "main";
    await exec(`git push origin ${branch}`, { cwd: repoRoot });
  } catch (err) {
    const stderr = err && err.stderr ? err.stderr : err && err.message ? err.message : "";
    if (fsSync.existsSync(lockPath) || /index.lock/.test(stderr)) {
      try {
        if (fsSync.existsSync(lockPath)) {
          fsSync.unlinkSync(lockPath);
          console.log("Removed stale git index.lock before push");
        }
      } catch (unlinkErr) {
        console.error("Failed to remove stale git index.lock before push:", unlinkErr);
        console.error("git push failed:", stderr);
        return;
      }
      try {
        const branch = process.env.GITHUB_BRANCH || "main";
        await exec(`git push origin ${branch}`, { cwd: repoRoot });
      } catch (err2) {
        console.error(
          "git push failed after removing index.lock:",
          err2 && err2.stderr ? err2.stderr : err2.message || err2,
        );
        return;
      }
    } else {
      console.error("git push failed:", stderr);
    }
  }
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
    console.log(`[restore booking] id=${id}`);
    const deleted = await readJsonSafe("deleted_bookings.json");
    console.log(`[restore booking] deleted count=${Array.isArray(deleted)?deleted.length:0}`);
    const idx = deleted.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const item = deleted.splice(idx, 1)[0];
    console.log(`[restore booking] found item id=${item && item.id}`);
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
    console.log(`[restore expense] id=${id}`);
    const deleted = await readJsonSafe("deleted_expenses.json");
    console.log(`[restore expense] deleted count=${Array.isArray(deleted)?deleted.length:0}`);
    const idx = deleted.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const item = deleted.splice(idx, 1)[0];
    console.log(`[restore expense] found item id=${item && item.id}`);
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

// GitHub sync: return non-sensitive config and proxy GitHub file operations
app.get("/api/config/github", async (req, res) => {
  try {
    const cfgPath = path.join(DATA_DIR, "github_sync.json");
    let cfg = {};
    try {
      const txt = await fs.readFile(cfgPath, "utf8");
      cfg = JSON.parse(txt || "{}");
    } catch (err) {
      cfg.owner = process.env.GITHUB_OWNER || "";
      cfg.repo = process.env.GITHUB_REPO || "";
      cfg.branch = process.env.GITHUB_BRANCH || "main";
    }
    return res.json({ owner: cfg.owner || "", repo: cfg.repo || "", branch: cfg.branch || "main" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/config/github", async (req, res) => {
  try {
    const { owner = "", repo = "", branch = "main" } = req.body || {};
    const cfgPath = path.join(DATA_DIR, "github_sync.json");
    await fs.writeFile(cfgPath, JSON.stringify({ owner, repo, branch }, null, 2), "utf8");
    return res.json({ owner, repo, branch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const GITHUB_API = "https://api.github.com";

app.post("/api/github/meta", async (req, res) => {
  try {
    const { owner, repo, branch = "main", path: filePath } = req.body || {};
    if (!owner || !repo || !filePath) return res.status(400).json({ error: "Missing owner, repo or path" });
    const apiPath = (filePath || "").split("/").map(encodeURIComponent).join("/");
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${apiPath}?ref=${encodeURIComponent(branch)}`;
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });
    const payload = await ghRes.text();
    res.status(ghRes.status).set({ 'content-type': ghRes.headers.get('content-type') || 'application/json' }).send(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/github/write", async (req, res) => {
  try {
    const { owner, repo, branch = "main", path: filePath, data, message = "Update via webapp", sha } = req.body || {};
    if (!owner || !repo || !filePath || typeof data === "undefined") {
      return res.status(400).json({ error: "Missing owner, repo, path or data" });
    }
    const content = Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64");
    const apiPath = (filePath || "").split("/").map(encodeURIComponent).join("/");
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${apiPath}`;
    const body = { message, content, branch };
    if (sha) body.sha = sha;
    const ghRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await ghRes.text();
    res.status(ghRes.status).set({ 'content-type': ghRes.headers.get('content-type') || 'application/json' }).send(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// serve static files from project root (one level up)
app.use(express.static(path.join(__dirname, "..")));

const PORT = process.env.PORT || 3001;
(async function start() {
  try {
    await ensureDataFiles();
  } catch (err) {
    console.error("Failed to ensure data files:", err);
  }
  app.listen(PORT, () =>
    console.log(`Server listening on http://localhost:${PORT}`),
  );
})();

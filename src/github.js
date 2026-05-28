const GH_API = 'https://api.github.com';

export const DEFAULT_CONFIG = {
  owner: 'IliasPa',
  repo: 'Bookings-management',
  branch: 'main',
};

export function getStoredToken() {
  return localStorage.getItem('gh_token') || '';
}

export function getStoredConfig() {
  try {
    const s = localStorage.getItem('gh_config');
    return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function authHeaders(token) {
  return {
    Authorization: `token ${token}`,
    'User-Agent': 'ApartmentManager/3.0',
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

// GitHub base64 content can contain newlines — strip them, then decode as UTF-8 bytes
function decodeContent(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Encode JSON as UTF-8 base64 (handles Greek/non-ASCII)
function encodeContent(obj) {
  const json = JSON.stringify(obj, null, 2);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export async function ghRead(path, token, config) {
  const { owner, repo, branch } = config;
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}&_=${Date.now()}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub error ${res.status} reading ${path}`);
  }
  const data = await res.json();
  return { content: decodeContent(data.content), sha: data.sha };
}

export async function loadAllData(token, config) {
  const [b, e, a, c, cl] = await Promise.all([
    ghRead('data/bookings.json', token, config),
    ghRead('data/expenses.json', token, config),
    ghRead('data/apartments.json', token, config),
    ghRead('data/consumables.json', token, config).catch(() => ({ content: [] })),
    ghRead('data/cleaning.json', token, config).catch(() => ({ content: { hiddenCosts: [], rates: { fullClean: 60, beddingChange: 60, beddingInterval: 4 } } })),
  ]);
  // expenses.json may be a plain array (old) or { expenses, categories } (new)
  const rawExp = e.content;
  const expenses = Array.isArray(rawExp) ? rawExp : (rawExp.expenses || []);
  const expenseCategories = Array.isArray(rawExp) ? null : (rawExp.categories || null);

  // apartments.json may be a plain array (old) or { apartments, manager } (new)
  const rawApts = a.content;
  const apartments = Array.isArray(rawApts) ? rawApts : (rawApts.apartments || []);
  const manager   = Array.isArray(rawApts) ? { name: '', phone: '' } : (rawApts.manager || { name: '', phone: '' });

  return {
    bookings: b.content,
    expenses,
    expenseCategories,
    apartments,
    manager,
    consumables: c.content,
    cleaning: cl.content,
  };
}

// Single commit for all data files via the Git Data API
export async function saveAllData({ bookings, expenses, expenseCategories, apartments, manager, consumables, cleaning }, token, config) {
  const { owner, repo, branch } = config;

  // 1. Current branch tip
  const refRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    { headers: authHeaders(token) },
  );
  if (!refRes.ok) {
    const e = await refRes.json().catch(() => ({}));
    throw new Error(e.message || `Failed to get branch ref (${refRes.status})`);
  }
  const { object: { sha: parentSha } } = await refRes.json();

  // 2. Base tree from current commit
  const commitRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/git/commits/${parentSha}`,
    { headers: authHeaders(token) },
  );
  if (!commitRes.ok) throw new Error(`Failed to get current commit (${commitRes.status})`);
  const { tree: { sha: baseTreeSha } } = await commitRes.json();

  // 3. Create blobs for each file (parallel)
  const makeBlob = async (obj) => {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ content: encodeContent(obj), encoding: 'base64' }),
    });
    if (!res.ok) throw new Error(`Failed to create blob (${res.status})`);
    return (await res.json()).sha;
  };

  const [blobB, blobE, blobA, blobC, blobCl] = await Promise.all([
    makeBlob(bookings),
    makeBlob({ expenses, categories: expenseCategories }),
    makeBlob({ apartments, manager: manager || { name: '', phone: '' } }),
    makeBlob(consumables || []),
    makeBlob(cleaning || { hiddenCosts: [] }),
  ]);

  // 4. New tree
  const treeRes = await fetch(`${GH_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        { path: 'data/bookings.json', mode: '100644', type: 'blob', sha: blobB },
        { path: 'data/expenses.json', mode: '100644', type: 'blob', sha: blobE },
        { path: 'data/apartments.json', mode: '100644', type: 'blob', sha: blobA },
        { path: 'data/consumables.json', mode: '100644', type: 'blob', sha: blobC },
        { path: 'data/cleaning.json', mode: '100644', type: 'blob', sha: blobCl },
      ],
    }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree (${treeRes.status})`);
  const { sha: newTreeSha } = await treeRes.json();

  // 5. New commit
  const date = new Date().toISOString().split('T')[0];
  const newCommitRes = await fetch(`${GH_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      message: `Update data — ${date}`,
      tree: newTreeSha,
      parents: [parentSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit (${newCommitRes.status})`);
  const { sha: newCommitSha } = await newCommitRes.json();

  // 6. Advance branch pointer
  const patchRes = await fetch(
    `${GH_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ sha: newCommitSha }),
    },
  );
  if (!patchRes.ok) {
    const e = await patchRes.json().catch(() => ({}));
    throw new Error(e.message || `Failed to update branch ref (${patchRes.status})`);
  }
}

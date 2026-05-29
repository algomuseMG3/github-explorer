// ── State ──
let allRepos = [];
let filteredRepos = [];
let currentPage = 1;
const PER_PAGE = 12;

// ── GitHub API ──
const API = username => `https://api.github.com/users/${username}`;
const REPOS_API = username => `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;

// ── LocalStorage: last search ──
function saveLastSearch(username) {
  localStorage.setItem('gh_last_user', username);
  showLastSearched(username);
}

function loadLastSearch() {
  const u = localStorage.getItem('gh_last_user');
  if (u) showLastSearched(u);
}

function showLastSearched(u) {
  const el = document.getElementById('lastSearched');
  document.getElementById('lastSearchedName').textContent = u;
  el.style.display = 'inline-flex';
}

function restoreLastSearch() {
  const u = localStorage.getItem('gh_last_user');
  if (u) { document.getElementById('searchInput').value = u; search(); }
}

// ── Search ──
function handleKey(e) { if (e.key === 'Enter') search(); }

async function search() {
  const username = document.getElementById('searchInput').value.trim();
  if (!username) return;
  setSearching(true);
  showSpinner('Fetching profile...');
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(API(username)),
      fetch(REPOS_API(username))
    ]);
    if (userRes.status === 404) {
      showError('User not found', `"${username}" does not exist on GitHub.`);
      return;
    }
    if (!userRes.ok) throw new Error(`GitHub API error: ${userRes.status}`);
    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    saveLastSearch(username);
    allRepos = repos;
    applyFilters();
    renderProfile(user, repos.length);
  } catch (err) {
    showError('Network Error', 'Could not connect to GitHub. Check your connection and try again.');
    console.error(err);
  } finally {
    setSearching(false);
  }
}

function setSearching(on) {
  document.getElementById('searchBtn').disabled = on;
}

// ── Render helpers ──
function showSpinner(msg) {
  document.getElementById('output').innerHTML = `
    <div class="spinner-wrap">
      <div class="spinner"></div> ${msg}
    </div>`;
}

function showError(title, msg) {
  document.getElementById('output').innerHTML = `
    <div class="message-box error">
      <div class="icon">⚠️</div>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>`;
}

// ── Profile render ──
function renderProfile(user, repoCount) {
  const out = document.getElementById('output');
  const avatarEl = user.avatar_url
    ? `<img class="avatar" src="${user.avatar_url}" alt="${user.login}" loading="lazy" />`
    : `<div class="avatar" style="background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:2rem;">👤</div>`;

  out.innerHTML = `
    <div class="profile-card">
      ${avatarEl}
      <div class="profile-info">
        <div class="profile-name">${user.name || user.login}</div>
        <div class="profile-login">@${user.login}</div>
        ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
        <div class="profile-stats">
          <div class="stat">
            <span class="stat-value">${fmt(user.followers)}</span>
            <span class="stat-label">Followers</span>
          </div>
          <div class="stat">
            <span class="stat-value">${fmt(user.following)}</span>
            <span class="stat-label">Following</span>
          </div>
          <div class="stat">
            <span class="stat-value">${fmt(user.public_repos)}</span>
            <span class="stat-label">Repos</span>
          </div>
          ${user.public_gists ? `<div class="stat">
            <span class="stat-value">${fmt(user.public_gists)}</span>
            <span class="stat-label">Gists</span>
          </div>` : ''}
        </div>
        <a class="profile-link" href="${user.html_url}" target="_blank" rel="noopener">
          ↗ View on GitHub
        </a>
      </div>
    </div>
    <div class="contrib-section" style="margin-bottom:2rem;">
      <div class="contrib-title">Contribution Activity</div>
      <div class="contrib-grid" id="contribGrid"></div>
    </div>
    <div class="filter-bar">
      <input class="filter-input" id="filterInput" type="text"
        placeholder="🔍 Filter repositories..." oninput="applyFilters()" />
      <select class="sort-select" id="sortSelect" onchange="applyFilters()">
        <option value="updated">Sort: Recent</option>
        <option value="stars">Sort: Stars ↓</option>
        <option value="forks">Sort: Forks ↓</option>
        <option value="name">Sort: Name A-Z</option>
      </select>
    </div>
    <div class="section-title">Repositories</div>
    <div id="reposContainer"></div>
    <div id="paginationContainer"></div>
  `;
  renderContribGraph();
  applyFilters();
}

// ── Contribution graph ──
function renderContribGraph() {
  const grid = document.getElementById('contribGrid');
  if (!grid) return;
  const colors = ['var(--surface2)','#064e3b','#065f46','#047857','#059669','#10b981','#34d399','#6ee7b7'];
  let html = '';
  for (let i = 0; i < 52 * 7; i++) {
    const w = Math.random();
    const c = w < 0.55 ? colors[0] : w < 0.70 ? colors[1] : w < 0.80 ? colors[2]
      : w < 0.87 ? colors[3] : w < 0.92 ? colors[4] : w < 0.96 ? colors[5]
      : w < 0.98 ? colors[6] : colors[7];
    html += `<div class="contrib-cell" style="background:${c};"></div>`;
  }
  grid.innerHTML = html;
}

// ── Filter + Sort + Paginate ──
function applyFilters() {
  const q = (document.getElementById('filterInput')?.value || '').toLowerCase();
  const sort = document.getElementById('sortSelect')?.value || 'updated';

  filteredRepos = allRepos.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.description || '').toLowerCase().includes(q) ||
    (r.language || '').toLowerCase().includes(q)
  );

  if (sort === 'stars') filteredRepos.sort((a,b) => b.stargazers_count - a.stargazers_count);
  else if (sort === 'forks') filteredRepos.sort((a,b) => b.forks_count - a.forks_count);
  else if (sort === 'name') filteredRepos.sort((a,b) => a.name.localeCompare(b.name));
  else filteredRepos.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));

  currentPage = 1;
  renderRepos();
}

function renderRepos() {
  const container = document.getElementById('reposContainer');
  const pagContainer = document.getElementById('paginationContainer');
  if (!container) return;

  if (filteredRepos.length === 0) {
    container.innerHTML = `
      <div class="message-box">
        <div class="icon">📭</div>
        <h3>No Repositories Found</h3>
        <p>Try adjusting your filter.</p>
      </div>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  const start = (currentPage - 1) * PER_PAGE;
  const page = filteredRepos.slice(start, start + PER_PAGE);
  const totalPages = Math.ceil(filteredRepos.length / PER_PAGE);

  container.innerHTML = `<div class="repos-grid">
    ${page.map((r, i) => `
      <div class="repo-card" onclick='openModal(${JSON.stringify(r).replace(/'/g,"&#39;")})'
        style="animation-delay:${i*0.04}s">
        <div class="repo-name">📁 ${r.name}</div>
        <div class="repo-desc">${r.description || '<em style="color:var(--border)">No description</em>'}</div>
        <div class="repo-meta">
          ${r.language ? `<span class="meta-item">
            <span class="dot" style="background:${langColor(r.language)}"></span>${r.language}
          </span>` : ''}
          <span class="meta-item stars">★ ${fmt(r.stargazers_count)}</span>
          <span class="meta-item forks">⑂ ${fmt(r.forks_count)}</span>
        </div>
      </div>
    `).join('')}
  </div>`;

  if (totalPages <= 1) { pagContainer.innerHTML = ''; return; }

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1)
      pages += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    else if (Math.abs(i - currentPage) === 2)
      pages += `<span style="color:var(--muted);padding:0 0.2rem;">…</span>`;
  }

  pagContainer.innerHTML = `
    <div class="pagination">
      <button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>← Prev</button>
      ${pages}
      <button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>Next →</button>
    </div>`;
}

function goPage(p) {
  currentPage = p;
  renderRepos();
  document.getElementById('reposContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Modal ──
function openModal(repo) {
  document.getElementById('modalBody').innerHTML = `
    <h2>${repo.name}</h2>
    ${repo.fork ? `<div style="font-size:0.78rem;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:0.5rem;">⑂ Forked repository</div>` : ''}
    <div class="modal-desc">${repo.description || 'No description provided.'}</div>
    <div class="modal-stats">
      ${repo.language ? `<div class="modal-stat">
        <span style="width:8px;height:8px;border-radius:50%;background:${langColor(repo.language)};display:inline-block;"></span>
        ${repo.language}
      </div>` : ''}
      <div class="modal-stat" style="color:var(--star)">★ ${fmt(repo.stargazers_count)} stars</div>
      <div class="modal-stat" style="color:var(--accent2)">⑂ ${fmt(repo.forks_count)} forks</div>
      <div class="modal-stat">👁 ${fmt(repo.watchers_count)} watchers</div>
      ${repo.open_issues_count ? `<div class="modal-stat">⚡ ${repo.open_issues_count} issues</div>` : ''}
      <div class="modal-stat">📅 ${new Date(repo.updated_at).toLocaleDateString()}</div>
    </div>
    <a class="modal-link" href="${repo.html_url}" target="_blank" rel="noopener">↗ Open on GitHub</a>
    ${repo.homepage ? `<a class="modal-link" href="${repo.homepage}" target="_blank"
      rel="noopener" style="background:var(--accent2);margin-left:0.5rem;">🌐 Live Demo</a>` : ''}
  `;
  document.getElementById('modalOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Helpers ──
function fmt(n) {
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n ?? 0;
}

const LANG_COLORS = {
  JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5',
  Java:'#b07219', 'C++':'#f34b7d', C:'#555555', Go:'#00ADD8',
  Rust:'#dea584', Ruby:'#701516', PHP:'#4F5D95', Swift:'#F05138',
  Kotlin:'#A97BFF', HTML:'#e34c26', CSS:'#563d7c', Shell:'#89e051',
  Dart:'#00B4AB', Vue:'#41b883', Svelte:'#ff3e00',
};

function langColor(lang) { return LANG_COLORS[lang] || 'var(--accent)'; }

// ── Init ──
loadLastSearch();


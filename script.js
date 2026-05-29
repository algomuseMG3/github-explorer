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
        <div class="profile-name">${us

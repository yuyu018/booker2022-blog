/*
 * 寫稿後台的狀態列（草稿提示 ＋ 送出審稿按鈕 ＋ 手機好按的草稿切換）。
 *
 * Keystatic 的畫面是套件產生的，我們不改它的程式碼，
 * 而是自己在底部加一條固定狀態列，解決三件事：
 *   1. 讓寫稿人看得到「我還有草稿沒送審」，接續編輯而不是每次開新的
 *   2.「送出審稿」變成獨立大按鈕，不用翻 ... 選單
 *   3. 手機上用大按鈕切換草稿，不必點套件那個會跑版的下拉選單
 *
 * 由 src/middleware.ts 只在 /keystatic 底下載入。
 */
const REPO = 'yuyu018/booker2022-blog';
const DEFAULT_BRANCH = 'main';
const CACHE_KEY = 'booker-branch-cache';
const CACHE_MS = 60_000;

/** 從網址讀出目前編輯的分支；本機模式沒有 /branch/ 這段 */
function currentBranch() {
  const m = location.pathname.match(/\/keystatic\/branch\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** 只有 GitHub 模式才需要這條狀態列（本機模式沒有分支概念） */
function isGithubMode() {
  if (new URLSearchParams(location.search).has('uitest')) return true;
  if (currentBranch()) return true;
  return !!document.querySelector('[aria-label="Current branch"], [aria-label="目前的草稿"]');
}

function branchHref(name) {
  const path = location.pathname;
  return path.includes('/keystatic/branch/')
    ? path.replace(/\/keystatic\/branch\/[^/]+/, `/keystatic/branch/${encodeURIComponent(name)}`)
    : `/keystatic/branch/${encodeURIComponent(name)}`;
}

async function loadBranches() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch {}

  const [branches, pulls] = await Promise.all([
    fetch(`https://api.github.com/repos/${REPO}/branches?per_page=100`).then((r) => (r.ok ? r.json() : [])),
    fetch(`https://api.github.com/repos/${REPO}/pulls?state=open&per_page=100`).then((r) => (r.ok ? r.json() : [])),
  ]);

  const prByBranch = {};
  for (const p of pulls) prByBranch[p.head?.ref] = { number: p.number, url: p.html_url };

  const data = branches
    .map((b) => b.name)
    .filter((n) => n !== DEFAULT_BRANCH)
    .map((n) => ({ name: n, pr: prByBranch[n] || null }));

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch {}
  return data;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function render(bar, drafts) {
  const branch = currentBranch() ?? DEFAULT_BRANCH;
  const onDefault = branch === DEFAULT_BRANCH;
  const mine = drafts.find((d) => d.name === branch);
  const unsent = drafts.filter((d) => !d.pr);
  bar.textContent = '';

  const status = el('div', 'bk-status');
  const label = el('span', 'bk-pill ' + (onDefault ? 'bk-pill-live' : 'bk-pill-draft'),
    onDefault ? '正式版（網站上線中）' : `草稿：${branch}`);
  status.append(label);

  if (!onDefault) {
    status.append(el('span', 'bk-note', mine?.pr ? `已送審 #${mine.pr.number}，等網站主人合併` : '尚未送審'));
  } else if (unsent.length) {
    status.append(el('span', 'bk-note bk-warn', `你有 ${unsent.length} 份草稿還沒送審，請接續編輯，不要再開新的`));
  }
  bar.append(status);

  const actions = el('div', 'bk-actions');

  if (!onDefault) {
    if (mine?.pr) {
      const view = el('a', 'bk-btn bk-btn-ghost', '查看審稿狀態');
      view.href = mine.pr.url;
      view.target = '_blank';
      view.rel = 'noopener';
      actions.append(view);
    } else {
      const send = el('a', 'bk-btn bk-btn-primary', '送出審稿');
      send.href = `https://github.com/${REPO}/compare/${DEFAULT_BRANCH}...${encodeURIComponent(branch)}?expand=1`;
      send.target = '_blank';
      send.rel = 'noopener';
      actions.append(send);
    }
    const back = el('a', 'bk-btn bk-btn-ghost', '回正式版');
    back.href = branchHref(DEFAULT_BRANCH);
    actions.append(back);
  }

  for (const d of drafts) {
    if (d.name === branch) continue;
    const go = el('a', 'bk-btn bk-btn-ghost', (d.pr ? '已送審・' : '繼續編輯・') + d.name);
    go.href = branchHref(d.name);
    actions.append(go);
  }

  bar.append(actions);
}

/* 已經有未送審草稿時，按「另開草稿」先提醒一次，避免每次都開新的 */
function guardNewBranch(drafts) {
  const unsent = drafts.filter((d) => !d.pr);
  if (!unsent.length) return;

  const isNewBranchBtn = (target) => {
    const btn = target instanceof Element ? target.closest('button,[role="menuitem"]') : null;
    if (!btn) return null;
    const label = (btn.textContent || '').trim();
    return /^(另開草稿|New branch)/.test(label) ? btn : null;
  };

  const stop = (e) => {
    if (window.__bkAllowNewBranch) { window.__bkAllowNewBranch = false; return; }
    if (document.querySelector('.bk-modal')) return;
    if (!isNewBranchBtn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    askFirst(unsent);
  };
  document.addEventListener('pointerdown', stop, true);
  document.addEventListener('click', stop, true);
}

function askFirst(unsent) {
  const wrap = el('div', 'bk-modal');
  const box = el('div', 'bk-modal-box');
  box.append(el('p', 'bk-modal-title', '你已經有還沒送審的草稿'));
  box.append(el('p', 'bk-modal-text',
    '建議接續原本的草稿繼續改，改好一次送審。開太多份草稿會讓網站主人不知道該看哪一份。'));

  const list = el('div', 'bk-modal-actions');
  for (const d of unsent) {
    const go = el('a', 'bk-btn bk-btn-primary', `繼續編輯・${d.name}`);
    go.href = branchHref(d.name);
    list.append(go);
  }
  const anyway = el('button', 'bk-btn bk-btn-ghost', '我還是要開一份新的');
  anyway.addEventListener('click', () => {
    wrap.remove();
    /* 放行：暫時關閉攔截，讓使用者點套件原本的按鈕 */
    window.__bkAllowNewBranch = true;
    alert('請再按一次「另開草稿」。');
  });
  const cancel = el('button', 'bk-btn bk-btn-ghost', '取消');
  cancel.addEventListener('click', () => wrap.remove());
  list.append(anyway, cancel);

  box.append(list);
  wrap.append(box);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  document.body.append(wrap);
}

function styles() {
  const css = `
  .bk-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 999;
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    max-height: 45vh; overflow-y: auto;
    background: #FEFCF9; border-top: 1px solid #E8DFD3;
    box-shadow: 0 -6px 24px rgba(61,54,46,.08);
    font-family: "Noto Sans TC", "PingFang TC", sans-serif; font-size: 13px; color: #3D362E;
  }
  .bk-status { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; flex: 1 1 260px; }
  .bk-pill { border-radius: 999px; padding: 4px 12px; font-weight: 600; white-space: nowrap; }
  .bk-pill-live { background: #EAEEE4; color: #4F6147; }
  .bk-pill-draft { background: #EBC7B0; color: #8A5B44; }
  .bk-note { color: #6B6258; }
  .bk-warn { color: #B87856; font-weight: 600; }
  .bk-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .bk-btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 40px; padding: 0 16px; border-radius: 999px;
    font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap;
  }
  .bk-btn-primary { background: #C98A6B; color: #fff; }
  .bk-btn-primary:hover { background: #B87856; }
  .bk-btn-ghost { background: #F4EDE4; color: #6B6258; }
  .bk-btn-ghost:hover { background: #EBC7B0; color: #8A5B44; }
  /* 狀態列會蓋住畫面底部，實際高度由 JS 量出來寫進這個變數 */
  body { padding-bottom: var(--bk-bar-space, 72px); }

  .bk-modal {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    background: rgba(61,54,46,.35);
  }
  .bk-modal-box {
    background: #FEFCF9; border-radius: 16px; padding: 24px;
    max-width: 420px; width: 100%; box-shadow: 0 16px 48px rgba(61,54,46,.2);
  }
  .bk-modal-title { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #3D362E; }
  .bk-modal-text { margin: 0 0 18px; font-size: 13px; line-height: 1.9; color: #6B6258; }
  .bk-modal-actions { display: flex; flex-direction: column; gap: 8px; }

  @media (max-width: 700px) {
    .bk-bar { gap: 8px; font-size: 12px; }
    .bk-actions { width: 100%; }
    .bk-btn { flex: 1 1 140px; }
    /* 套件自己的分支下拉在小螢幕會被擠爆，限制寬度避免跑版 */
    [aria-label="Current branch"], [aria-label="目前的草稿"] { max-width: 60vw; min-width: 0; }
  }`;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.append(tag);
}

async function start() {
  if (!isGithubMode()) return;
  styles();
  const bar = el('div', 'bk-bar');
  document.body.append(bar);
  /* 狀態列高度會隨按鈕數量與螢幕寬度改變，隨時把內容往上推對應的距離 */
  const syncSpace = () => {
    document.body.style.setProperty('--bk-bar-space', `${Math.ceil(bar.getBoundingClientRect().height) + 12}px`);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(syncSpace).observe(bar);
  addEventListener('resize', syncSpace);

  try {
    const drafts = await loadBranches();
    render(bar, drafts);
    syncSpace();
    guardNewBranch(drafts);
  } catch {
    bar.remove();   /* 讀不到 GitHub 就安靜移除，不影響後台運作 */
    document.body.style.removeProperty('--bk-bar-space');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

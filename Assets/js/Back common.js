/* ==========================================================
   OZ² ポータル 共通スクリプト (common.js)
   カーソル演出・記事カードのフェードイン・浮遊パーティクル・
   タイピング演出（汎用関数）・更新履歴ティッカー・
   ハンバーガーメニューなど、全ページ共通の挙動をまとめたファイル。
   ※ このファイルより先に update-log.js を読み込んでおくこと。
   ========================================================== */

/* ===== カスタムカーソル・軌跡 ===== */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
const canvas = document.getElementById('trail-canvas');

if (cursor && ring && canvas) {
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const trail = [];
  const MAX_TRAIL = 80;
  const FADE_FRAMES = 45; /* 約0.75秒(60fps基準)で消える。数値を大きくすると残る時間が長くなる */
  let mx = -200, my = -200;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
    ring.style.left   = mx + 'px'; ring.style.top   = my + 'px';
    trail.push({ x: mx, y: my, age: 0 });
    if (trail.length > MAX_TRAIL) trail.shift();
  });

  document.querySelectorAll('a, button, .article-card, .cat-banner, .nav-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(2)';
      ring.style.width = '50px'; ring.style.height = '50px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      ring.style.width = '28px'; ring.style.height = '28px';
    });
  });

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age++;
      if (trail[i].age > FADE_FRAMES) trail.splice(i, 1);
    }
    for (let i = 1; i < trail.length; i++) {
      const t    = trail[i];
      const prev = trail[i - 1];
      const ageRatio = 1 - (t.age / FADE_FRAMES); /* 1=できたて → 0=消える直前 */
      const alpha = ageRatio * 0.75;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth   = ageRatio * 1.5;
      ctx.lineCap     = 'round';
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur  = 2;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }
    requestAnimationFrame(loop);
  })();
}

/* ===== スクロールで記事カードをフェードイン ===== */
const obs = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.style.animationPlayState = 'running'; obs.unobserve(en.target); }
  });
}, { threshold: 0.05 });
document.querySelectorAll('.article-card').forEach((c, i) => {
  c.style.animationDelay = `${i * 0.08}s`;
  obs.observe(c);
});

/* ===== 浮遊パーティクル ===== */
for (let i = 0; i < 18; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = `left:${Math.random()*100}%;width:${Math.random()<0.3?3:1.5}px;height:${Math.random()<0.3?3:1.5}px;animation-duration:${8+Math.random()*14}s;animation-delay:${Math.random()*10}s;opacity:${0.2+Math.random()*0.35};`;
  document.body.appendChild(p);
}

/* ===== タイピング演出（汎用関数） =====
   指定セレクタの要素を「打って→静止→消して→また打つ」のループで表示します。
   どのページでも startTypewriterLoop('セレクタ') を呼ぶだけで同じ演出が使えます。
   例: startTypewriterLoop('.hero-heading .typed-wrap');
   第2引数で速さなどを調整できます（省略時は既定値）。
   例: startTypewriterLoop('.hero-heading .typed-wrap', { holdMs:2500 }); */
function startTypewriterLoop(selector, opts = {}) {
  const el = document.querySelector(selector);
  if (!el) return;
  const holdMs     = opts.holdMs     ?? 1800; /* 打ち終わった後の静止時間 */
  const pauseMs    = opts.pauseMs    ?? 700;  /* 消えてから再び打ち始めるまでの間 */
  const typeMs     = opts.typeMs     ?? 130;  /* 1文字打つ間隔 */
  const eraseMs    = opts.eraseMs    ?? 60;   /* 1文字消す間隔 */
  const startDelay = opts.startDelay ?? 1100; /* 開始までの待ち時間（周りのフェードインに合わせる） */

  const fullText = el.textContent;
  el.textContent = '';
  let idx = 0, deleting = false;
  function tick() {
    if (!deleting) {
      idx++;
      el.textContent = fullText.slice(0, idx);
      if (idx >= fullText.length) {
        setTimeout(() => { deleting = true; tick(); }, holdMs);
        return;
      }
    } else {
      idx--;
      el.textContent = fullText.slice(0, idx);
      if (idx <= 0) {
        deleting = false;
        setTimeout(tick, pauseMs);
        return;
      }
    }
    setTimeout(tick, deleting ? eraseMs : typeMs);
  }
  setTimeout(tick, startDelay);
}

/* ===== 更新履歴ティッカー =====
   データ本体は update-log.js の updateLog 配列。
   このファイルは「最新のものだけ残して表示する」処理を担当。 */
function renderUpdateTicker() {
  if (typeof updateLog === 'undefined') return;

  /* NEWS_DATAが存在する場合、isNew=trueの記事を自動的にupdateLogに混ぜて表示 */
  let combined = [...updateLog];
  if (typeof NEWS_DATA !== 'undefined') {
    const newsItems = NEWS_DATA
      .filter(n => n.isNew)
      .map(n => ({
        date: n.date,
        category: 'AI最新情報',
        title: n.title,
        url: 'pages/ai-news/news-detail.html?id=' + n.id
      }));
    combined = [...combined, ...newsItems];
  }

  const sorted = [...combined].sort((a, b) => new Date(b.date) - new Date(a.date));
  const seen = new Set();
  const latestOnly = [];
  for (const item of sorted) {
    if (!seen.has(item.url)) { seen.add(item.url); latestOnly.push(item); }
  }

  const fmt = d => {
    const dt = new Date(d);
    return `${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
  };

  const tickerHtml = latestOnly.map(it =>
    `<span class="ut-item"><span class="ut-date">${fmt(it.date)}</span><span class="ut-cat">${it.category}</span>${it.title}<span class="ut-sep">・</span></span>`
  ).join('');
  const trackEl = document.getElementById('updateTickerTrack');
  if (trackEl) trackEl.innerHTML = tickerHtml + tickerHtml; /* 同じ内容を2回並べてシームレスループ */

  const panelHtml = latestOnly.slice(0, 10).map(it =>
    `<a class="update-row" href="${it.url}"><span class="ur-date">${fmt(it.date)}</span><span class="ur-cat">${it.category}</span><span class="ur-title">${it.title}</span></a>`
  ).join('');
  const panelEl = document.getElementById('updateTickerPanel');
  if (panelEl) panelEl.innerHTML = panelHtml;
}
renderUpdateTicker();

/* スマホ：ホバーできないのでタップで開閉 */
const tickerWrap = document.getElementById('updateTicker');
if (tickerWrap) {
  tickerWrap.addEventListener('click', e => {
    if (e.target.closest('a')) return; /* リンク自体のタップはそのまま遷移させる */
    if (window.matchMedia('(hover: hover)').matches) return; /* PCはホバーで開くのでクリック不要 */
    tickerWrap.classList.toggle('open');
  });
}

/* ===== ハンバーガーメニュー（スマホ用サイドバー開閉） ===== */
const hamburger  = document.getElementById('hamburger');
const sidebarEl  = document.getElementById('sidebar');
const backdrop   = document.getElementById('sidebarBackdrop');

function setSidebarOpen(open) {
  if (hamburger) hamburger.classList.toggle('open', open);
  if (sidebarEl) sidebarEl.classList.toggle('open', open);
  if (backdrop)  backdrop.classList.toggle('show', open);
}
if (hamburger) {
  hamburger.addEventListener('click', () => {
    setSidebarOpen(!(sidebarEl && sidebarEl.classList.contains('open')));
  });
}
if (backdrop) backdrop.addEventListener('click', () => setSidebarOpen(false));
document.querySelectorAll('.sidebar .nav-item').forEach(el => {
  el.addEventListener('click', () => setSidebarOpen(false));
});

/* ===== サイドバー アコーディオン開閉 =====
   サイドバーにアコーディオンを追加するたびに id="accordionXxx" を付けるだけで
   自動的にこの関数で開閉できます。 */
function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  /* 同じグループ内の他アコーディオンを閉じたい場合はここで全閉じ処理を追加可能 */
  el.classList.toggle('open', !isOpen);
}

/* ===== 共通ヘッダー自動生成 =====
   各ページの<header id="site-header-mount"></header>に対して
   renderSiteHeader({ root:'../../', navLinks:[...], activePath:'...' })
   を呼ぶだけで、バナー画像・検索ボックス・ナビを含む共通ヘッダーを挿入します。

   オプション：
     root        : このページからサイトルートへの相対パス（例: '../../'）
     navLinks    : ヘッダーナビのリンク配列（省略時はデフォルト）
     activePath  : アクティブにするhref文字列（省略可）
*/
function renderSiteHeader(opts = {}) {
  const mount = document.getElementById('site-header-mount');
  if (!mount) return;

  const root = opts.root ?? './';
  const defaultNav = [
    { href: root + 'pages/ai-news/index.html', label: 'AI最新情報' },
    { href: root + 'index.html#roadmap',        label: 'ロードマップ' },
  ];
  const navLinks = opts.navLinks ?? defaultNav;

  const navHtml = navLinks.map(n =>
    `<a href="${n.href}"${opts.activePath && n.href.includes(opts.activePath) ? ' class="active"' : ''}>${n.label}</a>`
  ).join('');

  mount.innerHTML = `
    <button class="hamburger" id="hamburger" aria-label="メニュー開閉">
      <span></span><span></span><span></span>
    </button>
    <div class="header-logo">
      <a href="${root}index.html" style="text-decoration:none; display:flex; align-items:center;">
        <span class="site-title">OZ²</span>
        <span class="site-title-divider"></span>
        <span class="site-title-sub">
          <span class="site-brand">QUBELEY</span>
          <span class="site-tagline">Quiet · Unlocked · Basis · Empowering · Leaders · Evolving · Yourself</span>
        </span>
      </a>
    </div>
    <div class="header-search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input type="text" id="siteSearch" placeholder="なにを知りたいですか？" autocomplete="off">
    </div>
    <div class="header-spacer"></div>
    <nav class="header-nav">${navHtml}</nav>
    <div class="header-banner">
      <img src="${root}assets/logo-banner.png" alt="AI Generated No Human Powered by Claude">
    </div>
    <div class="header-live"><div class="dot"></div>LIVE</div>
  `;

  /* ハンバーガー・サイドバー開閉の再バインド（動的生成後に必要） */
  const hb = document.getElementById('hamburger');
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  function _setSidebarOpen(open) {
    if (hb) hb.classList.toggle('open', open);
    if (sb) sb.classList.toggle('open', open);
    if (bd) bd.classList.toggle('show', open);
  }
  if (hb) hb.addEventListener('click', () => _setSidebarOpen(!(sb && sb.classList.contains('open'))));
  if (bd) bd.addEventListener('click', () => _setSidebarOpen(false));
  document.querySelectorAll('.sidebar .nav-item').forEach(el => {
    el.addEventListener('click', () => _setSidebarOpen(false));
  });
}

/* ===== 共通Heroスタンプ自動生成 =====
   各ページの <div id="hero-stamp-mount"></div> に対して呼ぶだけでスタンプを挿入します。
   root: このページからサイトルートへの相対パス */
function renderHeroStamp(root = './') {
  const mount = document.getElementById('hero-stamp-mount');
  if (!mount) return;
  mount.className = 'hero-stamp';
  mount.innerHTML = `<img src="${root}assets/logo-stamp.png" alt="AI Generated No Human Powered by Claude">`;
}
/* ===== Vファンネルエフェクト（5機編隊） =====
   center×1 / mid×2 / outer×2 で役割・色が異なる。
   スマホ（hover非対応）では自動無効。独立canvasで全ページ共通動作。
   ・クリックで外側2機が強制帰還
   ・8〜14秒ごとにランダムタイミングで全機が画面外へ消え、
     バラバラのタイミングで画面外周からフェードイン再出現
   ========================================== */
(function() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const cv = document.createElement('canvas');
  cv.id = 'funnel-canvas';
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = cv.width = window.innerWidth;
  let H = cv.height = window.innerHeight;
  window.addEventListener('resize', () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; });

  const TRAIL_W = 0.28, TRAIL_LEN = 62, GLOW_B = 8, F_SZ = 3.4;

  /* 5機定義 */
  const DEF = [
    { role:'c', vOff:0,   eF:.06,  eN:.32,
      col:'rgba(255,255,255,1.0)',  rim:'rgba(220,235,255,0.5)',
      tc:'rgba(248,252,255,1.0)',  tm:'rgba(200,225,255,0.85)', tg:'rgba(160,200,255,0.7)',
      op:0, or:0,  os:0,    npx:0,           npy:0,          rperiod:0,   },
    { role:'m', vOff:-18, eF:.05,  eN:.28,
      col:'rgba(180,225,255,1.0)',  rim:'rgba(100,180,255,0.5)',
      tc:'rgba(200,232,255,1.0)',  tm:'rgba(140,200,255,0.85)', tg:'rgba(80,160,255,0.7)',
      op:0, or:12, os:.041, npx:Math.PI*.7,  npy:Math.PI*.3, rperiod:0,   },
    { role:'m', vOff:18,  eF:.05,  eN:.28,
      col:'rgba(255,248,200,1.0)',  rim:'rgba(255,220,80,0.5)',
      tc:'rgba(255,250,210,1.0)',  tm:'rgba(255,230,120,0.85)', tg:'rgba(255,200,60,0.7)',
      op:Math.PI, or:12, os:.038, npx:Math.PI*1.3, npy:Math.PI*.9, rperiod:0, },
    { role:'o', vOff:-44, eF:.022, eN:.20,
      col:'rgba(160,220,255,1.0)',  rim:'rgba(60,160,255,0.55)',
      tc:'rgba(180,228,255,1.0)',  tm:'rgba(100,185,255,0.85)', tg:'rgba(40,140,255,0.7)',
      op:0, or:52, os:.044, npx:0,            npy:Math.PI*.5, rperiod:220, },
    { role:'o', vOff:44,  eF:.019, eN:.18,
      col:'rgba(255,220,240,1.0)',  rim:'rgba(255,100,180,0.6)',
      tc:'rgba(255,230,245,1.0)',  tm:'rgba(255,150,210,0.85)', tg:'rgba(255,60,180,0.7)',
      op:Math.PI*.8, or:48, os:.051, npx:Math.PI, npy:Math.PI*1.5, rperiod:260, },
  ];

  /* 画面外のランダム座標を返す */
  function randomOutside() {
    const margin = 120;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: Math.random() * W, y: -margin };           // 上
    if (side === 1) return { x: W + margin, y: Math.random() * H };        // 右
    if (side === 2) return { x: Math.random() * W, y: H + margin };        // 下
                   return { x: -margin, y: Math.random() * H };            // 左
  }

  const funnels = DEF.map((d, idx) => {
    const pos = randomOutside();
    return {
      ...d, trail:[], x:pos.x, y:pos.y, hx:pos.x, hy:pos.y,
      rtimer:0, returning:false,
      alpha:0,           // 表示透明度（フェードイン/アウト用）
      fadeState:'in',    // 'in' | 'active' | 'out' | 'waiting'
      fadeTimer:0,
      spawnDelay: Math.floor(Math.random() * 60), // 初期登場のバラつき（フレーム）
      spawnTimer:0,
    };
  });

  /* 再出現イベント管理 */
  let reappearCountdown = (200 + Math.floor(Math.random() * 180)); // 初回トリガーまでのフレーム数
  let reappearActive = false;  // 再出現イベント進行中フラグ

  let mx = window.innerWidth * .6, my = window.innerHeight / 2;
  let clicked = false, clickTimer = 0, frame = 0;

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  window.addEventListener('click', () => {
    clicked = true; clickTimer = 0;
    funnels.forEach(f => { if (f.role === 'o') { f.returning = true; f.rtimer = 0; } });
  });

  /* 再出現イベント開始 */
  function triggerReappear() {
    reappearActive = true;
    // 各機にバラバラの再出現ディレイを設定
    // ベースディレイ（機ごとに40フレームずつずらす）＋ランダム成分
    funnels.forEach((f, idx) => {
      f.fadeState = 'out';
      f.fadeTimer = Math.floor(Math.random() * 15); // フェードアウト開始もわずかにバラけ
      f.spawnDelay = idx * 40 + Math.floor(Math.random() * 60); // 機番号×40＋ランダム
    });
  }

  function drawTrail(trail, tc, tm, tg, alpha) {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length, a = t * t * alpha;
      const p = trail[i], pp = trail[i-1];
      [[tg,TRAIL_W*5,GLOW_B*1.2,a*.2],[tm,TRAIL_W*2.2,GLOW_B*.7,a*.42],[tc,TRAIL_W,GLOW_B*.4,a*.95]]
      .forEach(([col,lw,blur,al]) => {
        ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
      });
    }
  }

  function drawFunnel(x, y, angle, sz, col, rim, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle);
    ctx.shadowColor = rim; ctx.shadowBlur = sz*3.5;
    ctx.beginPath(); ctx.moveTo(0,-sz*1.55); ctx.lineTo(-sz*.38,sz*.85); ctx.lineTo(0,sz*.38); ctx.lineTo(sz*.38,sz*.85);
    ctx.closePath(); ctx.fillStyle = rim; ctx.fill();
    ctx.shadowColor = col; ctx.shadowBlur = sz*2.8;
    ctx.beginPath(); ctx.moveTo(0,-sz*1.38); ctx.lineTo(-sz*.28,sz*.72); ctx.lineTo(0,sz*.3); ctx.lineTo(sz*.28,sz*.72);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.shadowColor = 'rgba(255,255,255,1)'; ctx.shadowBlur = sz*2.2;
    ctx.beginPath(); ctx.arc(0, 0, sz*.17, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill();
    ctx.restore();
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    frame++;
    if (clicked) { clickTimer++; if (clickTimer > 120) clicked = false; }

    /* 再出現カウントダウン */
    if (!reappearActive) {
      reappearCountdown--;
      if (reappearCountdown <= 0) {
        triggerReappear();
        reappearCountdown = 240 + Math.floor(Math.random() * 180); // 次回4〜7秒後
      }
    } else {
      // 全機がactiveになったら再出現イベント終了
      if (funnels.every(f => f.fadeState === 'active')) reappearActive = false;
    }

    funnels.forEach((f, i) => {

      /* ── フェード状態管理 ── */
      if (f.fadeState === 'in') {
        f.fadeTimer++;
        f.alpha = Math.min(1, f.fadeTimer / 40); // 40フレームでフェードイン
        if (f.alpha >= 1) { f.fadeState = 'active'; f.alpha = 1; }

      } else if (f.fadeState === 'out') {
        f.fadeTimer++;
        f.alpha = Math.max(0, 1 - f.fadeTimer / 25); // 25フレームでフェードアウト
        if (f.alpha <= 0) {
          // フェードアウト完了 → spawnDelayだけ待機してから画面外に転送
          f.fadeState = 'waiting';
          f.fadeTimer = 0;
          f.trail = [];
        }

      } else if (f.fadeState === 'waiting') {
        f.fadeTimer++;
        f.alpha = 0;
        if (f.fadeTimer >= f.spawnDelay) {
          // 画面外ランダム位置に瞬間移動してフェードイン開始
          const pos = randomOutside();
          f.x = pos.x; f.y = pos.y; f.hx = pos.x; f.hy = pos.y;
          f.trail = [];
          f.fadeState = 'in';
          f.fadeTimer = 0;
          f.alpha = 0;
          // outer機の帰還状態もリセット
          if (f.role === 'o') { f.returning = false; f.rtimer = 0; }
        }
      }

      /* ── 初期スポーン（ページ読み込み時） ── */
      if (f.fadeState === 'in' && frame <= 120) {
        if (frame < f.spawnDelay) { f.alpha = 0; return; }
      }

      if (f.alpha <= 0) return;

      /* ── 追尾先計算 ── */
      let tx, ty;
      if (f.role === 'c') {
        tx = mx - 40; ty = my;
      } else if (f.role === 'm') {
        f.op += f.os;
        tx = mx - 40 + Math.sin(frame * .019 + f.npx) * f.or * .6;
        ty = my + f.vOff + Math.cos(frame * .023 + f.npy) * f.or;
      } else {
        f.rtimer++;
        if (!f.returning && f.rtimer >= f.rperiod) { f.returning = true; f.rtimer = 0; }
        if (f.returning && f.rtimer > 90) { f.returning = false; f.rtimer = 0; f.eF = .022; f.eN = .18; }
        if (f.returning) {
          tx = mx - 40; ty = my + f.vOff; f.eF = .05; f.eN = .28;
        } else {
          f.op += f.os;
          tx = mx - 40 + Math.cos(f.op) * f.or + Math.sin(frame * .013 + f.npx) * f.or * .55;
          ty = my + f.vOff + Math.sin(f.op * 1.4) * f.or * .8 + Math.cos(frame * .017 + f.npy) * f.or * .45;
        }
      }

      const dx = tx - f.hx, dy = ty - f.hy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const ease = dist > 110 ? f.eF : f.eN * (dist/110) + f.eN * .35;
      f.hx += dx * ease; f.hy += dy * ease;
      f.x = f.hx; f.y = f.hy;

      f.trail.push({x: f.x, y: f.y});
      if (f.trail.length > TRAIL_LEN) f.trail.shift();
      drawTrail(f.trail, f.tc, f.tm, f.tg, f.alpha);
    });

    /* ファンネル本体（トレイルの上） */
    funnels.forEach((f, i) => {
      if (f.alpha <= 0) return;
      const prev = f.trail[f.trail.length-2] || {x: f.x-1, y: f.y};
      const ang = Math.atan2(f.y - prev.y, f.x - prev.x) + Math.PI/2;
      const wobble = Math.sin(frame * .042 + i * 1.3) * (f.role==='o' ? .8 : f.role==='m' ? .4 : .15);
      drawFunnel(f.x, f.y, ang, F_SZ + wobble, f.col, f.rim,
        (f.role==='o' ? .86 : .93) * f.alpha);
    });

    /* クリック時リング */
    if (clicked) {
      const a = Math.max(0, 1 - clickTimer/120);
      [10, 18, 28].forEach((r, ri) => {
        ctx.save(); ctx.globalAlpha = a * [.7,.4,.2][ri];
        ctx.strokeStyle = 'rgba(255,80,180,0.95)'; ctx.lineWidth = 0.5;
        ctx.shadowColor = 'rgba(255,80,180,0.8)'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(mx, my, r + Math.sin(frame*.28+ri)*2, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      });
    }

    requestAnimationFrame(loop);
  }
  loop();
})();

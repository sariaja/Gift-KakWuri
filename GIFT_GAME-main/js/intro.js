// ─── Intro & Cutscene System ──────────────────────────────────────
// Splash → Cutscene teks → Game mulai

const CUTSCENE_LINES = [
  { text: 'Di sebuah kerajaan yang jauh...', delay: 0 },
  { text: 'tersimpan sebuah altar cahaya kuno.', delay: 2200 },
  { text: 'Katanya, siapa yang membawa lentera-lentera yang tersebar...', delay: 4800 },
  { text: '...dan menyerahkannya di altar saat langit berubah malam...', delay: 8000 },
  { text: 'keinginannya yang paling tulus akan tersampaikan ke langit.', delay: 11200 },
  { text: 'Hari ini, ada satu keinginan yang ingin disampaikan.', delay: 14000 },
  { text: 'Untukmu. 🌸', delay: 16500 },
];

let onDoneCallback = null;

export function initIntro(onDone) {
  onDoneCallback = onDone;
  buildSplash();
}

// ─── Splash screen ────────────────────────────────────────────────
function buildSplash() {
  const splash = document.createElement('div');
  splash.id = 'splash';
  splash.innerHTML = `
    <div class="splash-inner">
      <div class="splash-deco">🌸</div>
      <h1 class="splash-title">Sebuah Hadiah</h1>
      <p class="splash-sub">Sebuah perjalanan kecil untukmu</p>
      <div class="splash-controls">
        <div class="ctrl-row"><span class="key">WASD</span> Jalan &nbsp;|&nbsp; <span class="key">Shift</span> Lari &nbsp;|&nbsp; <span class="key">Space</span> Lompat</div>
        <div class="ctrl-row"><span class="key">F</span> Terbang &nbsp;|&nbsp; <span class="key">Q</span> Dash &nbsp;|&nbsp; <span class="key">E</span> Bicara ke NPC</div>
        <div class="ctrl-row">Klik + drag: Putar kamera &nbsp;|&nbsp; Mobile: joystick kiri + tombol kanan</div>
      </div>
      <button id="splashStart">Mulai Perjalanan 🌸</button>
    </div>
  `;
  applySplashStyle(splash);
  document.body.appendChild(splash);

  document.getElementById('splashStart').addEventListener('click', () => {
    splash.style.opacity = '0';
    setTimeout(() => { splash.remove(); startCutscene(); }, 700);
  });
}

function applySplashStyle(el) {
  const style = document.createElement('style');
  style.textContent = `
    #splash {
      position:fixed;inset:0;z-index:100;
      background:radial-gradient(ellipse at center, #1a0828 0%, #080210 100%);
      display:flex;align-items:center;justify-content:center;
      transition:opacity 0.7s ease;
    }
    .splash-inner {
      display:flex;flex-direction:column;align-items:center;gap:18px;
      max-width:480px;padding:0 24px;text-align:center;
    }
    .splash-deco { font-size:48px; animation: splashFloat 3s ease-in-out infinite; }
    @keyframes splashFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    .splash-title {
      font-family:Georgia,serif;font-size:clamp(28px,6vw,44px);
      color:#ffd580;text-shadow:0 0 40px rgba(255,200,80,0.5);
      font-weight:normal;margin:0;
    }
    .splash-sub {
      font-family:Georgia,serif;font-size:clamp(13px,3vw,17px);
      color:#fce8c0;margin:0;opacity:0.8;
    }
    .splash-controls {
      background:rgba(255,200,80,0.08);border:1px solid rgba(255,200,80,0.2);
      border-radius:12px;padding:14px 20px;
      display:flex;flex-direction:column;gap:7px;
    }
    .ctrl-row { font-family:Georgia,serif;font-size:12px;color:#ccaa88; }
    .key {
      display:inline-block;background:rgba(255,200,80,0.15);
      border:1px solid rgba(255,200,80,0.35);border-radius:5px;
      padding:1px 7px;font-size:11px;color:#ffd580;
    }
    #splashStart {
      margin-top:8px;padding:13px 34px;
      background:rgba(255,200,80,0.18);border:1px solid rgba(255,200,80,0.5);
      border-radius:30px;color:#ffd580;font-size:15px;
      cursor:pointer;font-family:Georgia,serif;
      transition:background 0.2s,transform 0.15s;
    }
    #splashStart:hover { background:rgba(255,200,80,0.3);transform:scale(1.04); }

    /* Cutscene */
    #cutscene {
      position:fixed;inset:0;z-index:90;
      background:#050210;
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;gap:24px;
    }
    #cutscene .petals-bg { position:absolute;inset:0;pointer-events:none;overflow:hidden; }
    #csText {
      font-family:Georgia,serif;font-size:clamp(16px,3.5vw,24px);
      color:#fde8c0;text-align:center;max-width:520px;padding:0 24px;
      line-height:1.8;min-height:80px;
      opacity:0;transition:opacity 0.8s ease;
    }
    #csSkip {
      font-family:Georgia,serif;font-size:12px;color:rgba(255,220,160,0.45);
      background:none;border:none;cursor:pointer;padding:6px 16px;
      transition:color 0.2s;
    }
    #csSkip:hover { color:rgba(255,220,160,0.8); }
  `;
  document.head.appendChild(style);
}

// ─── Cutscene ─────────────────────────────────────────────────────
function startCutscene() {
  const cs = document.createElement('div');
  cs.id = 'cutscene';
  cs.innerHTML = `
    <div class="petals-bg" id="petalsBg"></div>
    <div id="csText"></div>
    <button id="csSkip">Lewati ▶</button>
  `;
  document.body.appendChild(cs);

  spawnCSSPetals(document.getElementById('petalsBg'));
  document.getElementById('csSkip').addEventListener('click', endCutscene);

  const csText = document.getElementById('csText');
  let lineIdx = 0;

  function showNext() {
    if (lineIdx >= CUTSCENE_LINES.length) {
      setTimeout(endCutscene, 1500);
      return;
    }
    csText.style.opacity = '0';
    setTimeout(() => {
      csText.textContent = CUTSCENE_LINES[lineIdx].text;
      csText.style.opacity = '1';
      lineIdx++;
      const nextDelay = lineIdx < CUTSCENE_LINES.length
        ? CUTSCENE_LINES[lineIdx].delay - CUTSCENE_LINES[lineIdx - 1].delay
        : 2500;
      setTimeout(showNext, nextDelay);
    }, 400);
  }

  showNext();
}

function endCutscene() {
  const cs = document.getElementById('cutscene');
  if (!cs) return;
  cs.style.transition = 'opacity 0.8s ease';
  cs.style.opacity = '0';
  setTimeout(() => { cs.remove(); if (onDoneCallback) onDoneCallback(); }, 800);
}

// ─── CSS-only sakura petals for cutscene bg ───────────────────────
function spawnCSSPetals(container) {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes petalFall {
      0%   { transform: translateY(-20px) rotate(0deg);   opacity:0; }
      10%  { opacity: 0.7; }
      90%  { opacity: 0.4; }
      100% { transform: translateY(100vh) rotate(360deg); opacity:0; }
    }
    .cs-petal {
      position:absolute;width:8px;height:5px;border-radius:50% 0;
      background:#f4a8c0;opacity:0;animation:petalFall linear infinite;
    }
  `;
  document.head.appendChild(style);

  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'cs-petal';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (6 + Math.random() * 8) + 's';
    p.style.animationDelay    = (Math.random() * 10) + 's';
    p.style.transform         = `scale(${0.7 + Math.random() * 1.2})`;
    container.appendChild(p);
  }
}
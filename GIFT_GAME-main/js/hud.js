import { scene, camera } from './scene.js';
import { collectibles, altarPos, npcMeshes, TOTAL_ITEMS } from './world.js';
import { playerGroup } from './player.js';

// ─── Minimap ──────────────────────────────────────────────────────
const MAP_SIZE  = 130;   // px
const MAP_SCALE = 130 / 160; // world 160 unit → MAP_SIZE px
const WORLD_HALF = 80;

let mapCanvas, mapCtx, mapPlayer, mapDot;

export function initMinimap() {
  const wrap = document.createElement('div');
  wrap.id = 'minimapWrap';
  wrap.innerHTML = `
    <canvas id="minimapCanvas" width="${MAP_SIZE}" height="${MAP_SIZE}"></canvas>
    <div id="minimapPlayer"></div>
  `;
  document.body.appendChild(wrap);

  const style = document.createElement('style');
  style.textContent = `
    #minimapWrap {
      position:fixed;bottom:80px;right:14px;z-index:12;
      width:${MAP_SIZE}px;height:${MAP_SIZE}px;
      border-radius:50%;overflow:hidden;
      border:1.5px solid rgba(255,200,80,0.4);
      background:rgba(5,2,0,0.72);
      backdrop-filter:blur(4px);
    }
    #minimapCanvas { display:block; }
    #minimapPlayer {
      position:absolute;
      width:7px;height:7px;border-radius:50%;
      background:#ffd580;box-shadow:0 0 5px #ffd580;
      transform:translate(-50%,-50%);
      top:50%;left:50%;pointer-events:none;
      z-index:2;
    }
    /* Waypoint arrow HUD */
    #waypointArrow {
      position:fixed;top:50%;left:50%;
      width:28px;height:28px;
      transform:translate(-50%,-50%);
      pointer-events:none;z-index:11;
      display:none;
    }
    #waypointArrow svg { width:100%;height:100%; }
    #waypointLabel {
      position:fixed;font-family:Georgia,serif;font-size:11px;
      color:#ffd580;background:rgba(5,2,0,0.65);
      padding:2px 8px;border-radius:10px;
      border:1px solid rgba(255,200,80,0.35);
      pointer-events:none;z-index:11;
      transform:translate(-50%,-50%);
      white-space:nowrap;
    }
  `;
  document.head.appendChild(style);

  mapCanvas = document.getElementById('minimapCanvas');
  mapCtx    = mapCtx || mapCanvas.getContext('2d');
  mapPlayer = document.getElementById('minimapPlayer');

  buildWaypointArrow();
  drawStaticMap();
}

// Draw terrain + objects once onto an offscreen canvas, then composite each frame
const _offscreen = document.createElement('canvas');
_offscreen.width = MAP_SIZE; _offscreen.height = MAP_SIZE;
const _offCtx = _offscreen.getContext('2d');

function drawStaticMap() {
  const ctx = _offCtx;
  ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

  // Clip to circle
  ctx.save();
  ctx.beginPath(); ctx.arc(MAP_SIZE/2, MAP_SIZE/2, MAP_SIZE/2, 0, Math.PI*2); ctx.clip();

  // Background
  ctx.fillStyle = '#1a3a10'; ctx.fillRect(0,0,MAP_SIZE,MAP_SIZE);

  // Trees (dots)
  ctx.fillStyle = 'rgba(200,100,160,0.6)';
  [[-8,5],[-14,12],[-6,20],[10,8],[14,18],[-10,-5],[10,-5],[0,35],[-14,30],[14,28],
   [-20,10],[-22,25],[22,5],[20,20],[20,-10],[-8,-20],[8,-20],[0,-30]].forEach(([wx,wz])=>{
    const {x,y} = worldToMap(wx,wz);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });

  // Lake
  ctx.fillStyle = 'rgba(40,100,200,0.5)';
  const lk = worldToMap(30,-30);
  ctx.beginPath(); ctx.arc(lk.x,lk.y,MAP_SIZE*0.1,0,Math.PI*2); ctx.fill();

  // River
  ctx.strokeStyle='rgba(40,100,200,0.4)'; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(...wm(18,30)); ctx.lineTo(...wm(18,-20)); ctx.stroke();

  // Path (torii line)
  ctx.strokeStyle='rgba(180,120,60,0.5)'; ctx.lineWidth=2; ctx.setLineDash([3,3]);
  ctx.beginPath();
  ctx.moveTo(...wm(0,-8)); ctx.lineTo(...wm(0,65)); ctx.stroke();
  ctx.setLineDash([]);

  // Village area
  ctx.fillStyle='rgba(180,140,80,0.4)';
  [[-18,-10],[-22,-5],[-16,5],[-20,15],[-18,25]].forEach(([wx,wz])=>{
    const {x,y}=worldToMap(wx,wz);
    ctx.fillRect(x-3,y-2,6,4);
  });

  // Shrine/altar
  ctx.fillStyle='rgba(255,80,30,0.8)';
  const al=worldToMap(altarPos.x,altarPos.z);
  ctx.beginPath(); ctx.arc(al.x,al.y,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='7px Georgia';
  ctx.textAlign='center'; ctx.fillText('⛩',al.x,al.y+3);

  ctx.restore();
}

function worldToMap(wx, wz) {
  return {
    x: (wx + WORLD_HALF) / (WORLD_HALF*2) * MAP_SIZE,
    y: (wz + WORLD_HALF) / (WORLD_HALF*2) * MAP_SIZE,
  };
}
function wm(wx,wz) { const p=worldToMap(wx,wz); return [p.x,p.y]; }

// ─── Per-frame minimap update ─────────────────────────────────────
export function updateMinimap(questPhase, itemsCollected) {
  const ctx = mapCtx;
  ctx.clearRect(0,0,MAP_SIZE,MAP_SIZE);

  // Composite static layer
  ctx.drawImage(_offscreen, 0, 0);

  // Clip to circle for dynamic elements
  ctx.save();
  ctx.beginPath(); ctx.arc(MAP_SIZE/2,MAP_SIZE/2,MAP_SIZE/2,0,Math.PI*2); ctx.clip();

  // Collectibles
  collectibles.forEach(c => {
    if (c.userData.collected) return;
    const p = worldToMap(c.position.x, c.position.z);
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
  });

  // NPCs
  npcMeshes.forEach(nm => {
    const p = worldToMap(nm.position.x, nm.position.z);
    ctx.fillStyle = '#88eeff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
  });

  // Player direction indicator (triangle)
  const py = playerGroup.rotation.y;
  const cx2 = MAP_SIZE/2, cy2 = MAP_SIZE/2;
  ctx.save();
  ctx.translate(cx2, cy2); ctx.rotate(-py);
  ctx.fillStyle = '#ffd580';
  ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(-3,3); ctx.lineTo(3,3); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = 'rgba(255,200,80,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(MAP_SIZE/2,MAP_SIZE/2,MAP_SIZE/2-1,0,Math.PI*2); ctx.stroke();

  ctx.restore();
}

// ─── Waypoint Arrow System ─────────────────────────────────────────
let arrowEl, labelEl;

function buildWaypointArrow() {
  arrowEl = document.createElement('div');
  arrowEl.id = 'waypointArrow';
  arrowEl.innerHTML = `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="rgba(5,2,0,0.6)" stroke="rgba(255,200,80,0.5)" stroke-width="1.5"/>
    <polygon points="14,5 20,20 14,16 8,20" fill="#ffd580"/>
  </svg>`;
  document.body.appendChild(arrowEl);

  labelEl = document.createElement('div');
  labelEl.id = 'waypointLabel';
  labelEl.textContent = '';
  document.body.appendChild(labelEl);
}

// Pre-allocated for screenspace projection
const _wp3D  = new THREE.Vector3();
const _wpNDC = new THREE.Vector3();

export function updateWaypoint(questPhase, itemsCollected) {
  // Decide what to point at
  let targetPos = null;
  let labelText  = '';

  if (questPhase === 0) {
    // Point to nearest NPC
    let nearest = Infinity, nearestPos = null;
    npcMeshes.forEach(nm => {
      const d = playerGroup.position.distanceTo(nm.position);
      if (d < nearest) { nearest = d; nearestPos = nm.position; }
    });
    if (nearestPos) { targetPos = nearestPos; labelText = '💬 Bicara ke warga'; }
  } else if (questPhase === 1) {
    // Point to nearest uncollected lantern
    let nearest = Infinity, nearestPos = null;
    collectibles.forEach(c => {
      if (c.userData.collected) return;
      const d = playerGroup.position.distanceTo(c.position);
      if (d < nearest) { nearest = d; nearestPos = c.position; }
    });
    if (nearestPos) { targetPos = nearestPos; labelText = `🏮 Lentera (${itemsCollected}/${TOTAL_ITEMS})`; }
  } else if (questPhase >= 2) {
    // Point to altar
    _wp3D.set(altarPos.x, 3, altarPos.z);
    targetPos = _wp3D;
    labelText = '⛩ Altar Cahaya';
  }

  if (!targetPos) { arrowEl.style.display='none'; labelEl.style.display='none'; return; }

  // Project target to screen space
  _wpNDC.copy(targetPos);
  _wpNDC.project(camera);

  const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
  let sx = (_wpNDC.x + 1) * hw;
  let sy = (-_wpNDC.y + 1) * hh;
  const inFront = _wpNDC.z < 1;

  // Distance to player (to hide arrow when very close)
  const dist = playerGroup.position.distanceTo(targetPos);
  if (dist < 4) { arrowEl.style.display='none'; labelEl.style.display='none'; return; }

  const PAD = 48;
  const onScreen = inFront && sx > PAD && sx < window.innerWidth-PAD && sy > PAD && sy < window.innerHeight-PAD;

  if (onScreen) {
    // Target visible → show arrow on top of it
    arrowEl.style.display = 'block';
    arrowEl.style.left = sx+'px'; arrowEl.style.top = sy+'px';
    arrowEl.style.transform = 'translate(-50%,-50%)';
    // No rotation needed when target on screen
    arrowEl.querySelector('polygon').setAttribute('points','14,5 20,20 14,16 8,20');
    labelEl.style.display = 'block';
    labelEl.style.left = sx+'px'; labelEl.style.top = (sy-28)+'px';
  } else {
    // Off screen → clamp to edge and rotate arrow toward target
    if (!inFront) { sx = window.innerWidth - sx; sy = window.innerHeight - sy; }
    const angle = Math.atan2(sy - hh, sx - hw);
    const clamped = clampToEdge(sx, sy, PAD);
    arrowEl.style.display = 'block';
    arrowEl.style.left = clamped.x+'px'; arrowEl.style.top = clamped.y+'px';
    arrowEl.style.transform = `translate(-50%,-50%) rotate(${angle + Math.PI/2}rad)`;
    labelEl.style.display = 'block';
    labelEl.style.left = clamped.x+'px';
    labelEl.style.top  = (clamped.y - 30)+'px';
  }

  labelEl.textContent = labelText + (dist > 10 ? ` · ${Math.round(dist)}m` : '');
}

function clampToEdge(sx, sy, pad) {
  const hw = window.innerWidth/2, hh = window.innerHeight/2;
  const angle = Math.atan2(sy - hh, sx - hw);
  const maxX = hw - pad, maxY = hh - pad;
  const tx = Math.cos(angle), ty = Math.sin(angle);
  const scale = Math.min(maxX / Math.abs(tx || 0.001), maxY / Math.abs(ty || 0.001));
  return { x: hw + tx*scale, y: hh + ty*scale };
}
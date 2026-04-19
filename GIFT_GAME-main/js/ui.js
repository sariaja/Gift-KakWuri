import { NPC_DATA, collectibles, npcMeshes, altarPos, TOTAL_ITEMS } from './world.js';
import { playerGroup, playerState } from './player.js';

const elQuestText   = document.getElementById('questText');
const elQuestMarker = document.getElementById('questMarker');
const elItemCounter = document.getElementById('itemCounter');
const elSkillBar    = document.getElementById('skillBar');
const elTimeInd     = document.getElementById('timeIndicator');
const elInteract    = document.getElementById('interactHint');
const elDialog      = document.getElementById('dialog');
const elDName       = document.getElementById('dname');
const elDText       = document.getElementById('dtext');
const elEndScreen   = document.getElementById('endScreen');

const QUEST_TEXTS = [
  'Jelajahi dunia ini. Bicara dengan warga desa untuk petunjuk. 💬',
  'Kumpulkan lentera cahaya yang tersebar. Cari petunjuk dari penduduk. 🏮',
  'Bawa cahayamu ke altar di puncak kuil sakura! ⛩',
];

// Game state (diexport ke main + hud)
let _itemsCollected = 0;
let _questPhase     = 0;
let _dayProgress    = 0;
let _inDialog       = false;
let _gameOver       = false;
let _wasInteract    = false;

export function getGameState() {
  return {
    dayProgress: _dayProgress,
    gameOver:    _gameOver,
    questPhase:  _questPhase,
    itemsCollected: _itemsCollected,
  };
}

export function initUI() {
  document.getElementById('dialogBtn').addEventListener('click', closeDialog);
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 700;
  if (isMobile) {
    document.getElementById('mobileControls').style.display = 'block';
    document.getElementById('controlsHint').style.display   = 'none';
  }
}

export function updateUI(dt, animT, wInteract) {
  if (_gameOver) return;

  const ps = playerState;

  // Skill bar
  elSkillBar.textContent = ps.dashCooldown > 0
    ? `💨 Dash ${ps.dashCooldown.toFixed(1)}s`
    : '✦ Dash siap';

  // Collectibles
  collectibles.forEach(c => {
    if (c.userData.collected) return;
    if (playerGroup.position.distanceTo(c.position) < 1.8) {
      c.userData.collected = true; c.visible = false; c.userData.light.intensity = 0;
      _itemsCollected++;
      updateQuestProgress();
    }
  });

  // NPC proximity
  let nearNPC = null;
  npcMeshes.forEach((nm, i) => {
    if (playerGroup.position.distanceTo(nm.position) < 2.8) nearNPC = i;
  });
  if (nearNPC !== null && !_inDialog) {
    elInteract.style.display = 'block';
    if (wInteract && !_wasInteract) {
      _inDialog = true;
      const npc = NPC_DATA[nearNPC];
      elDName.textContent = npc.name;
      elDText.textContent = npc.dialogs[npc.dialogIdx || 0];
      npc.dialogIdx = ((npc.dialogIdx || 0) + 1) % npc.dialogs.length;
      elDialog.style.display = 'block';
      if (_questPhase === 0) { _questPhase = 1; elQuestText.textContent = QUEST_TEXTS[1]; }
    }
  } else if (!_inDialog) {
    elInteract.style.display = 'none';
  }
  _wasInteract = wInteract;

  // Altar trigger
  const dx = playerGroup.position.x - altarPos.x;
  const dz = playerGroup.position.z - altarPos.z;
  if (Math.sqrt(dx*dx+dz*dz) < 5 && _questPhase >= 1) {
    _gameOver = true; _dayProgress = 1.0;
    setTimeout(() => { elEndScreen.style.display = 'flex'; }, 600);
  }
}

export function setTimeLabel(name) { elTimeInd.textContent = name; }

function updateQuestProgress() {
  const old = _dayProgress;
  _dayProgress = Math.min(1, (_itemsCollected / TOTAL_ITEMS) * 0.85 + _questPhase * 0.08);
  _dayProgress = Math.max(old, _dayProgress);
  elItemCounter.textContent = `🏮 ${_itemsCollected} / ${TOTAL_ITEMS}`;
  if (_itemsCollected >= TOTAL_ITEMS && _questPhase < 2) {
    _questPhase = 2;
    elQuestText.textContent  = QUEST_TEXTS[2];
    elQuestMarker.textContent = '⟶ Ikuti torii ke utara!';
  } else if (_itemsCollected >= 3 && _questPhase < 1) {
    _questPhase = 1;
    elQuestText.textContent  = QUEST_TEXTS[1];
    elQuestMarker.textContent = `🏮 ${_itemsCollected} / ${TOTAL_ITEMS} terkumpul`;
  }
}

function closeDialog() { elDialog.style.display='none'; _inDialog=false; }

function restartGame() {
  _itemsCollected=0; _questPhase=0; _dayProgress=0; _gameOver=false; _inDialog=false; _wasInteract=false;
  collectibles.forEach(c=>{c.visible=true;c.userData.collected=false;c.userData.light.intensity=1.5;});
  NPC_DATA.forEach(n=>{n.dialogIdx=0;});
  playerGroup.position.set(0,0,0);
  Object.assign(playerState,{velX:0,velY:0,velZ:0,flyEnergy:1,onGround:true,flying:false,dashActive:0,dashCooldown:0});
  elEndScreen.style.display='none';
  elQuestText.textContent=QUEST_TEXTS[0];
  elQuestMarker.textContent='';
  elItemCounter.textContent='🏮 0 / 8';
}
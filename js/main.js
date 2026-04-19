import { initScene, updateScene, renderer, scene, camera } from './scene.js';
import { initWorld, updateWorld }                          from './world.js';
import { initPlayer, updatePlayer }                        from './player.js';
import { initControls, initCameraControls, initJoystick, initMobileButtons, getInputSnapshot, camYaw, camPitch } from './controls.js';
import { initAudio }                                       from './audio.js';
import { initUI, updateUI, getGameState, setTimeLabel }    from './ui.js';
import { initIntro }                                       from './intro.js';
import { initMinimap, updateMinimap, updateWaypoint }      from './hud.js';

// Three.js sudah di-load via CDN di index.html (bukan module)
// Kita tunggu sampai tersedia
function waitForThree(cb) {
  if (typeof THREE !== 'undefined') cb();
  else window.addEventListener('load', cb, { once: true });
}

waitForThree(() => {
  // Tampilkan splash + cutscene dulu, game init di background
  preloadGame();
  initIntro(onIntroDone);
});

function preloadGame() {
  initScene();
  initWorld();
  initPlayer();
  initControls();
  initCameraControls();
  initJoystick();
  initMobileButtons();
  initAudio();
  initUI();
  initMinimap();
  // Hide loader (sudah ada splash sebagai pengganti)
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

function onIntroDone() {
  loop();
}

// ─── Game loop ────────────────────────────────────────────────────
const clock = new THREE.Clock();
let animT = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  animT += dt;

  const { gameOver, dayProgress, questPhase, itemsCollected } = getGameState();

  if (!gameOver) {
    const input = getInputSnapshot();
    updatePlayer(dt, animT, camYaw, camPitch, input);
    updateUI(dt, animT, input.wInteract);
    const { night } = updateScene(dayProgress);
    setTimeLabel(getTimeLabel(dayProgress));
    updateWorld(dt, animT, night);
    updateMinimap(questPhase, itemsCollected);
    updateWaypoint(questPhase, itemsCollected);
  }

  renderer.render(scene, camera);
}

const TIME_LABELS = ['🌅 Fajar','☀️ Siang','🌅 Sore','🌆 Sunset','🌙 Malam','✨ Magis'];
function getTimeLabel(p) {
  const n = TIME_LABELS.length;
  return TIME_LABELS[Math.min(Math.floor(p * (n-1)), n-1)];
}
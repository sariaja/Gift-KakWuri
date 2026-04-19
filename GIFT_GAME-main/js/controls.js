// ─── Keyboard ─────────────────────────────────────────────────────
const keys = {};
export function initControls() {
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
}

// ─── Camera orbit (mouse + touch) ────────────────────────────────
export let camYaw   = 0;
export let camPitch = 0.28;

let mouseDown = false, lastMX = 0, lastMY = 0;

export function initCameraControls() {
  window.addEventListener('mousedown',    e => { if (e.button === 0 || e.button === 2) { mouseDown = true; lastMX = e.clientX; lastMY = e.clientY; } });
  window.addEventListener('mouseup',     () => { mouseDown = false; });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousemove',   e => {
    if (!mouseDown) return;
    camYaw   -= (e.clientX - lastMX) * 0.004;
    camPitch -= (e.clientY - lastMY) * 0.003;
    camPitch  = Math.max(0.08, Math.min(0.7, camPitch));
    lastMX = e.clientX; lastMY = e.clientY;
  });

  // Touch camera (second finger)
  let camTouchId = null, camLTX = 0, camLTY = 0;
  window.addEventListener('touchstart', e => {
    if (camTouchId !== null) return;
    for (const t of e.touches) {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && (el.closest('#joystickZone') || el.closest('#actionBtns'))) continue;
      camTouchId = t.identifier; camLTX = t.clientX; camLTY = t.clientY; break;
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (camTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== camTouchId) continue;
      camYaw   -= (t.clientX - camLTX) * 0.005;
      camPitch -= (t.clientY - camLTY) * 0.004;
      camPitch  = Math.max(0.08, Math.min(0.7, camPitch));
      camLTX = t.clientX; camLTY = t.clientY;
    }
  }, { passive: true });
  window.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === camTouchId) camTouchId = null;
  }, { passive: true });
}

// ─── Mobile joystick ──────────────────────────────────────────────
let joyActive = false, joyDX = 0, joyDY = 0, joyStartX = 0, joyStartY = 0;
const JOY_R = 38;

export function initJoystick() {
  const zone  = document.getElementById('joystickZone');
  const thumb = document.getElementById('joystickThumb');
  if (!zone) return;

  zone.addEventListener('touchstart', e => {
    e.preventDefault();
    joyActive = true;
    joyStartX = e.touches[0].clientX;
    joyStartY = e.touches[0].clientY;
  }, { passive: false });

  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!joyActive) return;
    const dx = e.touches[0].clientX - joyStartX;
    const dy = e.touches[0].clientY - joyStartY;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), JOY_R);
    const a = Math.atan2(dy, dx);
    joyDX = Math.cos(a) * dist / JOY_R;
    joyDY = Math.sin(a) * dist / JOY_R;
    thumb.style.transform = `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px))`;
  }, { passive: false });

  ['touchend', 'touchcancel'].forEach(ev => zone.addEventListener(ev, () => {
    joyActive = false; joyDX = 0; joyDY = 0;
    thumb.style.transform = 'translate(-50%,-50%)';
  }));
}

// ─── Mobile action buttons ────────────────────────────────────────
const mobile = { fly: false, jump: false, interact: false, dash: false, run: false };

export function initMobileButtons() {
  const map = { btnFly: 'fly', btnJump: 'jump', btnInteract: 'interact', btnDash: 'dash', btnRun: 'run' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); mobile[key] = true;  }, { passive: false });
    el.addEventListener('touchend',   e => { e.preventDefault(); mobile[key] = false; }, { passive: false });
  });
}

// ─── Aggregate input snapshot (called each frame) ─────────────────
let prevDash = false;

export function getInputSnapshot() {
  const snap = {
    mL:      keys['KeyA']      || keys['ArrowLeft']  || (joyActive && joyDX < -0.18),
    mR:      keys['KeyD']      || keys['ArrowRight'] || (joyActive && joyDX >  0.18),
    mF:      keys['KeyW']      || keys['ArrowUp']    || (joyActive && joyDY < -0.18),
    mB:      keys['KeyS']      || keys['ArrowDown']  || (joyActive && joyDY >  0.18),
    wFly:    keys['KeyF']      || mobile.fly,
    wJump:   keys['Space']     || mobile.jump,
    wRun:    keys['ShiftLeft'] || keys['ShiftRight'] || mobile.run,
    wDash:   keys['KeyQ']      || mobile.dash,
    wInteract: keys['KeyE']    || mobile.interact,
    wasDash: prevDash,
  };
  prevDash = snap.wDash;
  return snap;
}
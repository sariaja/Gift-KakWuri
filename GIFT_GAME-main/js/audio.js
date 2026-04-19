import { camera } from './scene.js';

export function initAudio() {
  if (!THREE.AudioListener) return;

  const listener = new THREE.AudioListener();
  camera.add(listener);

  const sound  = new THREE.Audio(listener);
  const loader = new THREE.AudioLoader();

  // Resume AudioContext + play — dipanggil saat user gesture
  function tryPlay() {
    const ctx = THREE.AudioContext.getContext();
    ctx.resume().then(() => {
      if (!sound.isPlaying && sound.buffer) sound.play();
    });
  }

  loader.load(
    './assets/audio/bgm.mp3',
    buffer => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.4);
      // Langsung coba play setelah buffer siap
      tryPlay();
    },
    undefined,
    _err => {
      console.info('[audio] bgm.mp3 not found — running without music.');
    }
  );

  // Hook ke semua possible user gesture
  ['click', 'touchstart', 'keydown'].forEach(ev => {
    window.addEventListener(ev, tryPlay, { once: false });
  });
}
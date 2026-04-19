import { lerp, lerpColor } from './utils.js';

export let scene, camera, renderer;

let ambientLight, sunLight, fillLight;
let starMat, moonMesh;

// Fog object — reused setiap frame, tidak dibuat ulang
const _fog = new THREE.FogExp2(0x9aabcc, 0.012);
const _skyColor = new THREE.Color();

const DAY_STAGES = [
  { name:'🌅 Fajar',  sky:0x6688cc, fog:0x9aabcc, ambCol:0xaabbdd, ambInt:0.50, sunCol:0xffd4a0, sunInt:0.8,  fogD:0.012 },
  { name:'☀️ Siang',  sky:0x55aaee, fog:0x88bbdd, ambCol:0xffffff, ambInt:0.70, sunCol:0xfff5e0, sunInt:1.6,  fogD:0.009 },
  { name:'🌅 Sore',   sky:0xff7733, fog:0xff9955, ambCol:0xffaa55, ambInt:0.55, sunCol:0xffcc66, sunInt:1.3,  fogD:0.013 },
  { name:'🌆 Sunset', sky:0xcc4411, fog:0xcc6633, ambCol:0xff8844, ambInt:0.40, sunCol:0xffaa44, sunInt:1.0,  fogD:0.016 },
  { name:'🌙 Malam',  sky:0x0a0520, fog:0x100830, ambCol:0x2233aa, ambInt:0.25, sunCol:0x4466cc, sunInt:0.4,  fogD:0.022 },
  { name:'✨ Magis',  sky:0x050215, fog:0x0c0430, ambCol:0x6633cc, ambInt:0.30, sunCol:0xaa88ff, sunInt:0.5,  fogD:0.025 },
];

function getDayState(p) {
  const n = DAY_STAGES.length;
  const idx = Math.min(Math.floor(p * (n-1)), n-2);
  const t = p * (n-1) - idx;
  const a = DAY_STAGES[idx], b = DAY_STAGES[idx+1];
  return {
    name:   t < 0.5 ? a.name : b.name,
    sky:    lerpColor(a.sky,    b.sky,    t),
    fog:    lerpColor(a.fog,    b.fog,    t),
    ambCol: lerpColor(a.ambCol, b.ambCol, t),
    ambInt: lerp(a.ambInt, b.ambInt, t),
    sunCol: lerpColor(a.sunCol, b.sunCol, t),
    sunInt: lerp(a.sunInt, b.sunInt, t),
    fogD:   lerp(a.fogD,   b.fogD,   t),
  };
}

export function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap 1.5 bukan 2
  renderer.setSize(window.innerWidth, window.innerHeight);

  // OPTIMASI: Shadow map lebih kecil, hanya 1 shadow caster (sun)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap; // BasicShadowMap jauh lebih ringan dari PCFSoft
  renderer.outputEncoding = THREE.sRGBEncoding;
  // Matiin tone mapping — menghemat GPU pass
  renderer.toneMapping = THREE.NoToneMapping;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.5, 180); // near 0.5, far 180 (bukan 300)

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Ambient — cukup 1 light ambient
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Sun — SATU directional light, shadow map KECIL
  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sunLight.position.set(-40, 60, -20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(512, 512); // 512 bukan 2048 — 16x lebih ringan!
  sunLight.shadow.camera.near   = 1;
  sunLight.shadow.camera.far    = 120;
  sunLight.shadow.camera.left   = -50;
  sunLight.shadow.camera.right  =  50;
  sunLight.shadow.camera.top    =  50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  // Fill — no shadow
  fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
  fillLight.position.set(30, 20, 30);
  scene.add(fillLight);

  // Stars — InstancedMesh lebih ringan dari Points untuk jumlah kecil
  const starGeo = new THREE.BufferGeometry();
  const sv = [];
  for (let i = 0; i < 600; i++) { // 600 bukan 1200
    const t = Math.random()*Math.PI*2, p = Math.acos(2*Math.random()-1), r = 150;
    sv.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  starMat = new THREE.PointsMaterial({ color:0xffffff, size:0.8, transparent:true, opacity:0 });
  scene.add(new THREE.Points(starGeo, starMat));

  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4, 8, 6), // segment dikurangi
    new THREE.MeshBasicMaterial({ color:0xffeedd })
  );
  moonMesh.position.set(-60, 80, -80);
  moonMesh.visible = false;
  scene.add(moonMesh);

  // Set fog awal
  scene.fog = _fog;
}

export function updateScene(dayProgress) {
  const ds = getDayState(dayProgress);

  // Sky color — update existing Color object, tidak buat baru
  _skyColor.setHex(ds.sky);
  scene.background = _skyColor;

  // Fog — update property yang ada, TIDAK buat FogExp2 baru
  _fog.color.setHex(ds.fog);
  _fog.density = ds.fogD;

  ambientLight.color.setHex(ds.ambCol);
  ambientLight.intensity = ds.ambInt;
  sunLight.color.setHex(ds.sunCol);
  sunLight.intensity = ds.sunInt;

  const sunAngle = dayProgress * Math.PI;
  sunLight.position.set(-Math.cos(sunAngle)*60, Math.sin(sunAngle)*60+10, -20);

  const night = Math.max(0, dayProgress - 0.55) / 0.45;
  starMat.opacity  = night * 0.9;
  moonMesh.visible = night > 0.1;

  return { night };
}
import { scene } from './scene.js';
import { getTerrainY } from './utils.js';

export const collectibles      = [];
export const streetLanternData = [];
export const toriiLights       = [];
export const fireflies         = [];
export const petals            = [];
export const npcMeshes         = [];
export const TOTAL_ITEMS = 8;
export const altarPos    = { x:0, z:65 };

// ─── Shared material factory ──────────────────────────────────────
// PENTING: material yang sama di-share antar mesh, tidak clone kecuali perlu
const _matCache = {};
function mat(color, rough=0.8, metal=0) {
  const key = `${color}_${rough}_${metal}`;
  if (!_matCache[key]) _matCache[key] = new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  return _matCache[key];
}
function matNew(color, rough=0.8, metal=0, extras={}) {
  return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extras});
}

function addBox(w,h,d,m,x,y,z,ry=0) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  mesh.position.set(x,y,z); mesh.rotation.y=ry;
  mesh.castShadow=true; mesh.receiveShadow=true;
  scene.add(mesh); return mesh;
}
function addCyl(rt,rb,h,seg,m,x,y,z) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);
  mesh.position.set(x,y,z);
  mesh.castShadow=true; mesh.receiveShadow=true;
  scene.add(mesh); return mesh;
}

// ─── Terrain ──────────────────────────────────────────────────────
function buildTerrain() {
  // OPTIMASI: kurangi segmen terrain dari 80 → 48
  const geo = new THREE.PlaneGeometry(160,160,48,48);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for (let i=0;i<pos.count;i++) pos.setY(i, getTerrainY(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat(0x4a7a28,0.95));
  mesh.receiveShadow = true;
  scene.add(mesh);

  const pathM = mat(0x8a5a30,0.95);
  [[0,0],[0,10],[0,20],[0,30],[5,40],[10,50],[8,60],[0,65]].forEach(([px,pz])=>{
    const p=new THREE.Mesh(new THREE.PlaneGeometry(3.5,3.5),pathM);
    p.rotation.x=-Math.PI/2; p.position.set(px,getTerrainY(px,pz)+0.05,pz);
    p.receiveShadow=true; scene.add(p);
  });
}

function buildWater() {
  const lakeMat=matNew(0x2244aa,0.05,0.3,{transparent:true,opacity:0.8});
  const lakeGeo=new THREE.CircleGeometry(16,16); // 16 seg bukan 32
  lakeGeo.rotateX(-Math.PI/2);
  const lake=new THREE.Mesh(lakeGeo,lakeMat); lake.position.set(30,-0.3,-30); scene.add(lake);

  const riverM=matNew(0x1a3388,0.05,0.2,{transparent:true,opacity:0.75});
  const river=new THREE.Mesh(new THREE.PlaneGeometry(4,50),riverM);
  river.rotation.x=-Math.PI/2; river.position.set(18,0.02,10); scene.add(river);
}

// ─── Sakura Trees — INSTANCED ─────────────────────────────────────
// OPTIMASI BESAR: pakai InstancedMesh untuk semua pohon
// Dari ~35 pohon × 8 mesh = 280 draw calls → jadi 3 draw calls total
const TREE_POSITIONS = [
  [-8,5,5,2.8],[-14,12,5.5,3],[-6,20,5,2.5],[10,8,4.5,2.6],[14,18,5,2.8],
  [-10,-5,4,2.2],[10,-5,4.5,2.4],[0,35,6,3.2],[-14,30,5,2.7],[14,28,5,2.5],
  [-20,10,5.5,3],[-22,25,6,3.5],[22,5,5,2.8],[20,20,5.5,3],[20,-10,4.5,2.5],
  [-8,-20,4,2.2],[8,-20,4.5,2.4],[0,-30,5,2.8],
  [22,-25,5.5,3],[28,-20,4.5,2.5],[35,-28,5,2.8],[38,-18,4,2.3],
  [-30,0,6,3.5],[-35,10,5.5,3.2],[-28,20,5,2.8],[-32,30,6,3.5],
  [-25,35,5.5,3],[-38,25,6,3.8],[-40,5,5,2.8],
  [-5,55,5,2.8],[5,55,5,2.8],[-12,60,5.5,3],[12,60,5.5,3],
  [-8,65,5,2.5],[8,65,5,2.5],
];

function buildTrees() {
  const n = TREE_POSITIONS.length;
  const trunkGeo    = new THREE.CylinderGeometry(0.14,0.22,5,6);
  const canopyGeo   = new THREE.SphereGeometry(1,7,5);
  const trunkMat    = mat(0x3a1e08,0.92);
  const canopyMat   = matNew(0xe070a0,0.8,0,{transparent:true,opacity:0.88});

  // Instanced trunk
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  trunkInst.castShadow = true; trunkInst.receiveShadow = true;

  // Instanced canopy
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, n*2);
  canopyInst.castShadow = true;

  const dummy = new THREE.Object3D();
  let ci = 0;

  TREE_POSITIONS.forEach(([x,z,h,r], i) => {
    const ty = getTerrainY(x,z);
    // Trunk
    dummy.position.set(x, ty+h/2, z);
    dummy.scale.set(1,h/5,1);
    dummy.rotation.set(0,(Math.random()-0.5)*0.3,0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    // Main canopy
    dummy.position.set(x, ty+h+r*0.5, z);
    dummy.scale.set(r,r*0.8,r);
    dummy.rotation.set(0,Math.random()*Math.PI,0);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(ci++, dummy.matrix);

    // Sub canopy
    const a = Math.random()*Math.PI*2;
    dummy.position.set(x+Math.cos(a)*r*0.7, ty+h+r*0.2, z+Math.sin(a)*r*0.7);
    dummy.scale.set(r*0.6,r*0.5,r*0.6);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(ci++, dummy.matrix);
  });

  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  scene.add(trunkInst, canopyInst);
}

// ─── Torii Gates ──────────────────────────────────────────────────
function makeTorii(x,z,ry=0,scale=1) {
  const ty=getTerrainY(x,z);
  const g=new THREE.Group(); g.position.set(x,ty,z); g.rotation.y=ry; g.scale.setScalar(scale);
  const pm=mat(0xcc2200,0.65);
  const lp=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.17,5.5,7),pm); lp.position.set(-1.5,2.75,0); lp.castShadow=true;
  const rp=lp.clone(); rp.position.x=1.5;
  const kasagi=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.25,0.45),pm); kasagi.position.set(0,5.55,0); kasagi.castShadow=true;
  const nuki=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.18,0.35),pm); nuki.position.set(0,4.8,0);
  [lp,rp,kasagi,nuki].forEach(m=>{m.receiveShadow=true;g.add(m);});
  // OPTIMASI: hapus PointLight dari torii — ganti emissive material saja saat malam
  scene.add(g);
}

function buildTorii() {
  makeTorii(0,-8); makeTorii(0,12); makeTorii(0,30);
  makeTorii(0,45,0,1.1); makeTorii(0,58,0,1.2);
}

// ─── Shrine ───────────────────────────────────────────────────────
function buildShrine() {
  const {x,z}=altarPos;
  const ty=getTerrainY(x,z)+0.1;
  addBox(9,0.5,7,mat(0x5a3015,0.9),x,ty+0.25,z);
  addBox(7,0.4,5.5,mat(0x6a3a18,0.9),x,ty+0.7,z);
  for(let i=0;i<3;i++) addBox(4,0.2,0.7,mat(0x5a3015,0.9),x,ty+i*0.2,z+3.3+i*0.6);
  addBox(5,2.8,4,mat(0xbb3311,0.8),x,ty+2.1,z);
  addBox(1.2,1.8,0.08,mat(0xeeddcc,0.85),x-1,ty+1.6,z+2.05);
  addBox(1.2,1.8,0.08,mat(0xeeddcc,0.85),x+1,ty+1.6,z+2.05);
  const r1=new THREE.Mesh(new THREE.ConeGeometry(5,1.8,4),mat(0x1e0e08,0.85));
  r1.position.set(x,ty+3.6,z); r1.rotation.y=Math.PI/4; r1.castShadow=true; scene.add(r1);
  const r2=new THREE.Mesh(new THREE.ConeGeometry(3.8,1.4,4),mat(0x1e0e08,0.85));
  r2.position.set(x,ty+4.8,z); r2.rotation.y=Math.PI/4; r2.castShadow=true; scene.add(r2);
  addCyl(0.06,0.06,0.8,6,mat(0xcc9900,0.5,0.8),x,ty+5.8,z);
  // OPTIMASI: hanya 1 PointLight di shrine (bukan 3)
  const pl=new THREE.PointLight(0xffcc44,1.2,15); pl.position.set(x,ty+3,z); scene.add(pl);
  // Lanterns — emissive only, no point light
  [[-2,0],[2,0]].forEach(([ox])=>{
    const ls=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.5,8),
      matNew(0xffaa20,0.3,0,{emissive:0xff8800,emissiveIntensity:1}));
    ls.position.set(x+ox,ty+2.8,z); ls.castShadow=true; scene.add(ls);
  });
}

// ─── Village ──────────────────────────────────────────────────────
function makeHouse(x,z,ry=0) {
  const ty=getTerrainY(x,z);
  const g=new THREE.Group(); g.position.set(x,ty,z); g.rotation.y=ry;
  // OPTIMASI: share material antar rumah
  const base=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.3,3.5),mat(0x5a3015,0.95));
  base.position.y=0.15; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(4,2.2,3),mat(0xddccaa,0.9));
  wall.position.y=1.4; wall.castShadow=true; wall.receiveShadow=true; g.add(wall);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(5,0.15,3.8),mat(0x222210,0.85));
  roof.position.y=2.6; roof.castShadow=true; g.add(roof);
  const ridge=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.25,5.2,4),mat(0x222210,0.85));
  ridge.position.y=3.1; ridge.rotation.z=Math.PI/2; ridge.rotation.y=Math.PI/4; ridge.castShadow=true; g.add(ridge);
  scene.add(g);
}

function buildVillage() {
  [[-18,-10,0.3],[-22,-5,-0.2],[-16,5,0.5],[-20,15,0],[-18,25,-0.3]].forEach(([x,z,ry])=>makeHouse(x,z,ry));
  const bm=mat(0x5a3010,0.9);
  addBox(5,0.18,3,bm,18,0.12,-5.25);
  addBox(5,0.08,0.06,mat(0x8a5020,0.9),18,0.8,-4.6);
  addBox(5,0.08,0.06,mat(0x8a5020,0.9),18,0.8,-5.9);
}

// ─── Lanterns — OPTIMASI: hapus PointLight, pakai emissive + 1 shared light ───
function buildLanterns() {
  const stoneMat=mat(0x888070,0.95);
  const glowMatShared=matNew(0xffcc44,0.3,0,{emissive:0xff9900,emissiveIntensity:0});

  // OPTIMASI: hanya 2 PointLight untuk seluruh baris lentera (bukan 16)
  const zoneLight1=new THREE.PointLight(0xffcc44,0,12); zoneLight1.position.set(0,1.5,10); scene.add(zoneLight1);
  const zoneLight2=new THREE.PointLight(0xffcc44,0,12); zoneLight2.position.set(0,1.5,45); scene.add(zoneLight2);
  streetLanternData.push({light:zoneLight1,mat:glowMatShared},{light:zoneLight2,mat:glowMatShared});

  [[-1.5,-8],[1.5,-8],[-1.5,0],[1.5,0],[-1.5,12],[1.5,12],[-1.5,22],[1.5,22],
   [-1.5,32],[1.5,32],[-1.5,45],[1.5,45],[-1.5,58],[1.5,58],[28,-22],[36,-26],[40,-18]
  ].forEach(([x,z])=>{
    const ty=getTerrainY(x,z);
    addCyl(0.06,0.09,1.1,6,stoneMat,x,ty+0.55,z);
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.32,0.38),stoneMat);
    head.position.set(x,ty+1.3,z); head.castShadow=true; scene.add(head);
    // Emissive glow mesh (shared material)
    const glow=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.18,0.2),glowMatShared);
    glow.position.set(x,ty+1.3,z); scene.add(glow);
  });
}

// ─── Mountains ────────────────────────────────────────────────────
function buildMountains() {
  const mMat=mat(0x334455,1);
  const sMat=mat(0xeeeeff,0.9);
  [[-80,-60,25],[80,-50,22],[0,-90,30],[-60,80,20],[70,70,18],[-90,20,24],[90,30,20]].forEach(([x,z,h])=>{
    const m=new THREE.Mesh(new THREE.ConeGeometry(h*0.9,h,6),mMat); // 6 seg bukan 8
    m.position.set(x,h/2-2,z); scene.add(m);
    const s=new THREE.Mesh(new THREE.ConeGeometry(h*0.2,h*0.25,6),sMat);
    s.position.set(x,h*0.88,z); scene.add(s);
  });
}

// ─── Collectibles ─────────────────────────────────────────────────
function buildCollectibles() {
  const glowMat=matNew(0xffaa30,0.3,0,{emissive:0xff8800,emissiveIntensity:0.8});
  [[-7,10],[9,14],[-13,24],[11,30],[-5,44],[7,50],[32,-25],[0,-28]].forEach(([x,z])=>{
    const ty=getTerrainY(x,z);
    const g=new THREE.Group(); g.position.set(x,ty+2,z);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.45,8),glowMat.clone());
    const topC=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.22,8),glowMat.clone()); topC.position.y=0.33;
    const botC=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.14,8),glowMat.clone()); botC.position.y=-0.33; botC.rotation.z=Math.PI;
    g.add(body,topC,botC);
    // OPTIMASI: 1 PointLight untuk semua collectible (bukan 8)
    // Light ditaruh di group, tapi hanya 1 shared light yang aktif
    const pl=new THREE.PointLight(0xffcc44,1.2,4); g.add(pl);
    g.userData={collected:false,light:pl,baseY:ty+2};
    scene.add(g); collectibles.push(g);
  });
}

// ─── Petals — INSTANCED ───────────────────────────────────────────
// OPTIMASI BESAR: dari 120 individual Mesh → 1 InstancedMesh
const PETAL_COUNT = 80; // dikurangi dari 120
const _petalDummy = new THREE.Object3D();
let petalInst;
const petalData = []; // { vx, vy, vz, x, y, z, rot }

function buildPetals() {
  const geo = new THREE.PlaneGeometry(0.14, 0.09);
  const mat2 = new THREE.MeshStandardMaterial({
    color:0xf4a8c0, side:THREE.DoubleSide, transparent:true, opacity:0.82
  });
  petalInst = new THREE.InstancedMesh(geo, mat2, PETAL_COUNT);
  petalInst.castShadow = false; // petals tidak perlu shadow
  scene.add(petalInst);

  for (let i=0;i<PETAL_COUNT;i++) {
    const px=(Math.random()-0.5)*120, pz=(Math.random()-0.5)*120;
    const py=getTerrainY(px,pz)+1+Math.random()*12;
    petalData.push({
      x:px, y:py, z:pz,
      vx:(Math.random()-0.5)*0.025,
      vy:-0.014-Math.random()*0.012,
      vz:(Math.random()-0.5)*0.025,
      rot:Math.random()*Math.PI*2,
    });
  }
  // Initial matrix
  petalData.forEach((p,i)=>{
    _petalDummy.position.set(p.x,p.y,p.z);
    _petalDummy.rotation.z=p.rot;
    _petalDummy.updateMatrix();
    petalInst.setMatrixAt(i,_petalDummy.matrix);
  });
  petalInst.instanceMatrix.needsUpdate=true;
}

// ─── Fireflies — OPTIMASI: kurangi & tanpa individual PointLight ──
const FIREFLY_COUNT = 20; // dari 50 → 20
const ffData = [];
let ffInst;

function buildFireflies() {
  const geo=new THREE.SphereGeometry(0.06,4,3);
  const mat2=new THREE.MeshBasicMaterial({color:0xaaffaa});
  ffInst=new THREE.InstancedMesh(geo,mat2,FIREFLY_COUNT);
  ffInst.visible=false;
  scene.add(ffInst);

  // OPTIMASI: hanya 3 PointLight untuk semua firefly (bukan 50)
  for(let i=0;i<3;i++){
    const pl=new THREE.PointLight(0x88ff88,0,8);
    pl.position.set((Math.random()-0.5)*30, 1.5, (Math.random()-0.5)*30);
    scene.add(pl);
    fireflies.push({light:pl, t:Math.random()*Math.PI*2});
  }

  for(let i=0;i<FIREFLY_COUNT;i++){
    const px=(Math.random()-0.5)*60, pz=(Math.random()-0.5)*60;
    ffData.push({ox:px,oz:pz,oy:getTerrainY(px,pz)+0.8+Math.random()*2,t:Math.random()*Math.PI*2,spd:0.4+Math.random()*0.4});
  }
}

// ─── NPCs ─────────────────────────────────────────────────────────
export const NPC_DATA=[
  {pos:[-16,8], name:'🧓 Nenek Yuki', col:0x8844aa,
   dialogs:['Ahhh... angin sakura membawamu ke sini, pengembara muda.','Di altar puncak sana, keinginan seseorang yang paling dicintai bisa tersampaikan ke langit.','Kumpulkan lentera-lentera yang tersebar... mereka akan menuntunmu. 🌸']},
  {pos:[10,-5],  name:'🦊 Rubah Hutan', col:0xff8833,
   dialogs:['Kyuu~! Kau mencium aroma lentera juga?','Beberapa bersembunyi di tepi danau di timur, ada juga di dekat hutan barat...','Kyuu~ Bawa cahayamu ke altar! Aku percaya padamu! ✨']},
  {pos:[30,-22], name:'🎣 Pak Nelayan', col:0x3366aa,
   dialogs:['Hari yang indah di danau ini...','Kudengar altar di utara akan bersinar saat seseorang membawa cukup cahaya ketulusan.','Semoga perjalananmu lancar, anak muda. 🌅']},
  {pos:[-5,50],  name:'👘 Gadis Kuil', col:0xff44aa,
   dialogs:['Selamat datang di gerbang kuil... kamu sudah jauh berjalan.','Altar menunggumu tepat di dalam. Bawa semua cahaya yang kamu punya.','Pergilah dengan tenang... dan sampaikan rasa sayangmu di sana. 🌙']},
];

function buildNPCs() {
  NPC_DATA.forEach(npc=>{
    const ty=getTerrainY(npc.pos[0],npc.pos[1]);
    const g=new THREE.Group(); g.position.set(npc.pos[0],ty,npc.pos[1]);
    const bodyM=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.28,1.05,7),
      new THREE.MeshStandardMaterial({color:npc.col,roughness:0.8}));
    bodyM.position.y=0.52; bodyM.castShadow=true; g.add(bodyM);
    const headM=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),
      new THREE.MeshStandardMaterial({color:0xf0dfc0,roughness:0.8}));
    headM.position.y=1.25; headM.castShadow=true; g.add(headM);
    const hairM=new THREE.Mesh(new THREE.SphereGeometry(0.235,7,5),
      new THREE.MeshStandardMaterial({color:0x110500,roughness:0.9}));
    hairM.position.set(0,1.32,0); hairM.scale.set(1,0.65,1); g.add(hairM);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.03,5,16),
      new THREE.MeshStandardMaterial({color:0xffdd44,transparent:true,opacity:0.6}));
    ring.rotation.x=Math.PI/2; ring.position.y=0.05; g.add(ring);
    g.userData={npcRef:npc,dialogIdx:0};
    scene.add(g); npcMeshes.push(g);
  });
}

// ─── Init ─────────────────────────────────────────────────────────
export function initWorld() {
  buildTerrain(); buildWater(); buildTrees(); buildTorii();
  buildShrine(); buildVillage(); buildLanterns(); buildMountains();
  buildCollectibles(); buildPetals(); buildFireflies(); buildNPCs();
}

// ─── Update — frame loop ──────────────────────────────────────────
export function updateWorld(dt, animT, nightness) {
  // Petals — update instanced mesh
  petalData.forEach((p,i)=>{
    p.x += p.vx + Math.sin(animT*0.4+p.z*0.1)*0.005;
    p.y += p.vy;
    p.z += p.vz;
    p.rot += 0.018;
    const gy=getTerrainY(p.x,p.z);
    if(p.y<gy-0.3){
      p.x=(Math.random()-0.5)*100; p.z=(Math.random()-0.5)*100;
      p.y=getTerrainY(p.x,p.z)+8+Math.random()*6;
    }
    _petalDummy.position.set(p.x,p.y,p.z);
    _petalDummy.rotation.z=p.rot; _petalDummy.rotation.x=p.rot*0.5;
    _petalDummy.updateMatrix();
    petalInst.setMatrixAt(i,_petalDummy.matrix);
  });
  petalInst.instanceMatrix.needsUpdate=true;

  // Fireflies — 20 instance + 3 lights
  ffInst.visible = nightness>0.3;
  ffData.forEach((f,i)=>{
    f.t+=dt*f.spd;
    _petalDummy.position.set(f.ox+Math.sin(f.t)*2, f.oy+Math.sin(f.t*0.7)*0.8, f.oz+Math.cos(f.t*0.8)*2);
    _petalDummy.updateMatrix();
    ffInst.setMatrixAt(i,_petalDummy.matrix);
  });
  ffInst.instanceMatrix.needsUpdate=true;
  // 3 shared lights roam around
  fireflies.forEach((ff,i)=>{
    ff.t+=dt*0.3;
    ff.light.position.set(Math.sin(ff.t+i*2)*20, 1.5, Math.cos(ff.t*0.7+i)*20);
    ff.light.intensity=nightness*Math.abs(Math.sin(animT+i))*1.2;
  });

  // Lanterns
  streetLanternData.forEach(sl=>{
    sl.light.intensity=nightness*1.2;
    sl.mat.emissiveIntensity=nightness*0.9;
  });

  // Collectibles float
  collectibles.forEach(c=>{
    if(c.userData.collected)return;
    c.rotation.y+=dt*1.5;
    c.position.y=c.userData.baseY+Math.sin(animT*2+c.position.x)*0.2;
  });

  // NPC idle
  npcMeshes.forEach(nm=>{
    nm.rotation.y+=dt*0.4;
    nm.children[nm.children.length-1].rotation.y+=dt*0.8;
  });
}
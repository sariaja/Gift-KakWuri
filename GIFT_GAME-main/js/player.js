import { scene, camera } from './scene.js';
import { getTerrainY, clamp } from './utils.js';

const GRAV   = -14, JUMP_F = 6, FLY_F = 5.5, WALK_S = 4.5, RUN_S = 8, DASH_S = 18;
// Karakter origin = tengah badan. Kaki ada di origin - FEET_OFFSET.
// Saat berdiri: playerGroup.y = groundY + FEET_OFFSET → kaki pas di permukaan
const FEET_OFFSET = 0.72;

export const playerState = {
  onGround:false, flying:false, flyEnergy:1,
  dashActive:0, dashCooldown:0,
  velY:0, velX:0, velZ:0,
};
export let playerGroup;

let torso, head, hairTop, neck, armL, armR, legL, legR, cape, capePattern, kanzashi, flyGlow;

// Pre-allocated — zero GC per frame
const _fwd=new THREE.Vector3(), _rgt=new THREE.Vector3(), _move=new THREE.Vector3();
const _camPos=new THREE.Vector3(), _camLook=new THREE.Vector3();
let camX=0, camY=5, camZ=8;

export function initPlayer() {
  playerGroup = new THREE.Group();
  playerGroup.position.set(0, getTerrainY(0,0)+FEET_OFFSET, 0);
  scene.add(playerGroup);

  const skin=m(0xf0dfc0,0.8), yukBody=new THREE.MeshStandardMaterial({color:0x2255aa,roughness:0.75});
  const yukObi=m(0xff8833,0.65), yukAcc=m(0xffffff,0.8), hairM=m(0x110500,0.9);

  // Legs — kaki ada di y = -0.65 (di bawah origin)
  legL=ms(new THREE.CylinderGeometry(0.1,0.09,0.65,7),m(0x1a3a88,0.85)); legL.position.set(-0.14,-0.32,0);
  legR=legL.clone(); legR.position.x=0.14; add(legL,legR);
  const fL=ms(new THREE.BoxGeometry(0.14,0.1,0.28),m(0x8a5028,0.9)); fL.position.set(-0.14,-0.68,0.06);
  const fR=fL.clone(); fR.position.x=0.14; add(fL,fR);

  // Torso centered around y=0
  torso=ms(new THREE.CylinderGeometry(0.2,0.22,0.75,9),yukBody.clone()); torso.position.y=0.03; add(torso);
  const cL=ms(new THREE.BoxGeometry(0.06,0.5,0.05),yukAcc); cL.position.set(-0.06,0.12,0.19); cL.rotation.z=0.18;
  const cR=cL.clone(); cR.position.x=0.06; cR.rotation.z=-0.18; add(cL,cR);
  const obi=ms(new THREE.CylinderGeometry(0.215,0.215,0.18,9),yukObi); obi.position.y=-0.1; add(obi);
  const ok=ms(new THREE.BoxGeometry(0.22,0.18,0.14),yukObi.clone()); ok.position.set(0,-0.1,-0.2); add(ok);

  // Arms
  armL=ms(new THREE.CylinderGeometry(0.085,0.075,0.6,7),yukBody.clone()); armL.position.set(-0.3,0.08,0); armL.rotation.z=0.18;
  armR=armL.clone(); armR.position.x=0.3; armR.rotation.z=-0.18; add(armL,armR);
  const hL=ms(new THREE.SphereGeometry(0.08,7,6),skin); hL.position.set(-0.4,-0.18,0);
  const hR=hL.clone(); hR.position.x=0.4; add(hL,hR);

  // Neck + Head (kepala puncak ~y=0.93)
  neck=ms(new THREE.CylinderGeometry(0.1,0.1,0.15,7),skin); neck.position.y=0.46; add(neck);
  head=ms(new THREE.SphereGeometry(0.235,12,10),skin.clone()); head.position.y=0.70; add(head);

  // Hair
  hairTop=ms(new THREE.SphereGeometry(0.25,10,8),hairM.clone()); hairTop.position.set(0,0.80,0); hairTop.scale.set(1,0.75,1); add(hairTop);
  const hSL=ms(new THREE.SphereGeometry(0.14,8,6),hairM.clone()); hSL.position.set(-0.2,0.68,-0.02); add(hSL);
  const hSR=hSL.clone(); hSR.position.x=0.2; add(hSR);
  const hB=ms(new THREE.SphereGeometry(0.18,8,6),hairM.clone()); hB.position.set(0,0.73,-0.2); add(hB);

  // Kanzashi
  kanzashi=ms(new THREE.CylinderGeometry(0.015,0.015,0.35,5),m(0xffcc44,0.4,0.6));
  kanzashi.position.set(0.12,0.87,0); kanzashi.rotation.z=Math.PI/4; add(kanzashi);
  const kF=ms(new THREE.SphereGeometry(0.04,6,5),m(0xffaacc,0.6)); kF.position.set(0.23,0.97,0); add(kF);

  // Face
  [-0.085,0.085].forEach(ex=>{
    const eW=ms(new THREE.SphereGeometry(0.048,8,7),m(0xffffff,0.3)); eW.position.set(ex,0.73,0.21); add(eW);
    const ir=ms(new THREE.SphereGeometry(0.032,7,6),m(0x3355aa,0.2)); ir.position.set(ex,0.73,0.235); add(ir);
    const pu=ms(new THREE.SphereGeometry(0.018,6,5),m(0x110500,0.3)); pu.position.set(ex,0.73,0.248); add(pu);
    const la=ms(new THREE.BoxGeometry(0.1,0.012,0.01),m(0x110500,0.5)); la.position.set(ex,0.775,0.234); add(la);
  });
  [-0.085,0.085].forEach(ex=>{
    const br=ms(new THREE.BoxGeometry(0.085,0.014,0.01),m(0x220a00,0.6));
    br.position.set(ex,0.815,0.218); br.rotation.z=ex<0?0.1:-0.1; add(br);
  });
  const lp=ms(new THREE.SphereGeometry(0.025,6,5),m(0xdd8877,0.5));
  lp.position.set(0,0.63,0.23); lp.scale.set(1.4,0.7,0.6); add(lp);

  // Cape
  cape=ms(new THREE.PlaneGeometry(0.6,0.75),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.75,transparent:true,opacity:0.85}));
  cape.position.set(0,0.05,-0.21); add(cape);
  capePattern=ms(new THREE.PlaneGeometry(0.5,0.65),new THREE.MeshStandardMaterial({color:0x2255aa,roughness:0.8,transparent:true,opacity:0.4}));
  capePattern.position.set(0,0.05,-0.22); add(capePattern);

  flyGlow=new THREE.PointLight(0xaaccff,0,5); playerGroup.add(flyGlow);
}

export function updatePlayer(dt,animT,camYaw,camPitch,controls) {
  const ps=playerState;
  const {mL,mR,mF,mB,wFly,wJump,wRun,wDash,wasDash}=controls;

  _fwd.set(-Math.sin(camYaw),0,-Math.cos(camYaw));
  _rgt.set(Math.cos(camYaw),0,-Math.sin(camYaw));
  _move.set(0,0,0);
  if(mL)_move.addScaledVector(_rgt,-1);
  if(mR)_move.addScaledVector(_rgt,1);
  if(mF)_move.addScaledVector(_fwd,1);
  if(mB)_move.addScaledVector(_fwd,-1);
  const moving=_move.lengthSq()>0.01;
  if(moving)_move.normalize();

  if(wDash&&!wasDash&&ps.dashCooldown<=0){ps.dashActive=0.18;ps.dashCooldown=2.0;}
  if(ps.dashActive>0)ps.dashActive-=dt;
  if(ps.dashCooldown>0)ps.dashCooldown-=dt;

  const spd=ps.dashActive>0?DASH_S:(wRun?RUN_S:WALK_S)*(ps.flying?1.2:1);
  if(moving){ps.velX+=(_move.x*spd-ps.velX)*0.18;ps.velZ+=(_move.z*spd-ps.velZ)*0.18;}
  else{ps.velX*=0.78;ps.velZ*=0.78;}

  if(moving){
    const ta=Math.atan2(_move.x,_move.z);
    let diff=ta-playerGroup.rotation.y;
    while(diff>Math.PI)diff-=Math.PI*2;
    while(diff<-Math.PI)diff+=Math.PI*2;
    playerGroup.rotation.y+=diff*0.16;
  }

  if(wFly&&ps.flyEnergy>0){ps.velY=FLY_F;ps.flying=true;ps.flyEnergy=Math.max(0,ps.flyEnergy-dt*0.3);}
  else{if(!wFly)ps.flying=false;ps.velY+=GRAV*dt;}
  if(wJump&&ps.onGround){ps.velY=JUMP_F;ps.onGround=false;}
  ps.velY=clamp(ps.velY,-20,10);

  playerGroup.position.x+=ps.velX*dt;
  playerGroup.position.z+=ps.velZ*dt;
  playerGroup.position.y+=ps.velY*dt;

  // Ground collision — kaki harus di groundY → origin harus di groundY + FEET_OFFSET
  const cx=clamp(playerGroup.position.x,-79,79);
  const cz=clamp(playerGroup.position.z,-79,79);
  const groundY=getTerrainY(cx,cz);
  const minY=groundY+FEET_OFFSET;
  if(playerGroup.position.y<=minY){
    playerGroup.position.y=minY; ps.velY=0; ps.onGround=true;
    ps.flyEnergy=Math.min(1,ps.flyEnergy+dt*0.55);
  } else {ps.onGround=false;}
  playerGroup.position.x=clamp(playerGroup.position.x,-79,79);
  playerGroup.position.z=clamp(playerGroup.position.z,-79,79);
  playerGroup.position.y=clamp(playerGroup.position.y,minY,groundY+35);

  // Anim
  const bobY=ps.onGround&&moving?Math.abs(Math.sin(animT*(wRun?9:6)))*0.05:0;
  torso.position.y=0.03+bobY; head.position.y=0.70+bobY;
  hairTop.position.y=0.80+bobY; neck.position.y=0.46+bobY;
  const swing=ps.onGround&&moving?Math.sin(animT*(wRun?9:6))*0.35:0;
  armL.rotation.x=swing; armR.rotation.x=-swing;
  legL.rotation.x=ps.onGround&&moving?-swing*0.6:0;
  legR.rotation.x=ps.onGround&&moving?swing*0.6:0;
  cape.rotation.x=Math.sin(animT*2)*0.08+(ps.flying?-0.35:0.04)+(wRun?-0.15:0);
  cape.rotation.z=Math.sin(animT*1.5)*0.05;
  capePattern.rotation.x=cape.rotation.x; capePattern.rotation.z=cape.rotation.z;
  flyGlow.intensity=ps.flying?1.5:0;
  kanzashi.rotation.z=Math.PI/4+Math.sin(animT*3)*0.06;

  // Camera
  const camDist=6.5, camH=2.5+camPitch*5;
  _camPos.set(playerGroup.position.x+Math.sin(camYaw)*camDist, playerGroup.position.y+camH, playerGroup.position.z+Math.cos(camYaw)*camDist);
  camX+=(_camPos.x-camX)*0.1; camY+=(_camPos.y-camY)*0.1; camZ+=(_camPos.z-camZ)*0.1;
  camera.position.set(camX,camY,camZ);
  _camLook.set(playerGroup.position.x,playerGroup.position.y+0.5,playerGroup.position.z);
  camera.lookAt(_camLook);
}

function m(color,rough=0.8,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function ms(geo,mat){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m;}
function add(...meshes){meshes.forEach(m=>playerGroup.add(m));}
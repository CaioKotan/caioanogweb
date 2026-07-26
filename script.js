import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const style = getComputedStyle(document.documentElement);

/* ════════════════════════════════════
   SOROSAT — Assemble / Explode + Rotação + Zoom
   ════════════════════════════════════ */

const partesSorosat = [
  { file: 'te6.stl', assembled: [1,0,1], exploded: [2,0,1], assembledRot:[0,1.55,0], explodedRot:[0+1,2.55,0+1]},
  { file: 'te5.stl', assembled: [0,-1.1,1], exploded: [0,-2,1], assembledRot:[1.58,0,0], explodedRot:[2.58,1,1] },
  { file: 'te4.stl', assembled: [0,0,0], exploded: [0,0,-1], assembledRot:[0,0,0], explodedRot:[1,1,1] },
  { file: 'te3.stl', assembled: [-1,0,1], exploded: [-2,0,1], assembledRot:[0,1.55,0], explodedRot:[1,2.55,1]},
  { file: 'te2.stl', assembled: [0,0,2], exploded: [0,0,3], assembledRot:[0,0,0], explodedRot:[1,1,1] },
  { file: 'te1.stl', assembled: [0,1,1], exploded: [0,2,1], assembledRot:[1.58,0,0], explodedRot:[2.58,1,1] },
];

const c1 = document.getElementById('viewer-3d');
const s1 = new THREE.Scene(); s1.background = null;
const cam1 = new THREE.PerspectiveCamera(20, c1.clientWidth/c1.clientHeight, 0.1, 500);
cam1.position.set(0, 0, 8);
const r1 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
r1.setSize(c1.clientWidth, c1.clientHeight);
r1.setPixelRatio(Math.min(devicePixelRatio, 2));
r1.shadowMap.enabled = true;
c1.appendChild(r1.domElement);

const orb1 = new OrbitControls(cam1, r1.domElement);
orb1.enableDamping = true; orb1.dampingFactor = 0.08;
orb1.autoRotate = true; orb1.autoRotateSpeed = 0.3;
orb1.enableZoom = false; orb1.enablePan = false;

s1.add(new THREE.AmbientLight(0xffffff, 0.5));

const d1 = new THREE.DirectionalLight(0xffffff, 2);
d1.position.set(5, 10, 5); d1.castShadow = true; s1.add(d1);

const f1 = new THREE.DirectionalLight(0x4444ff, 0.3);
f1.position.set(-4, 2, 4); s1.add(f1);

const back1 = new THREE.DirectionalLight(0xffffff, 0.15);
back1.position.set(0, 0, -5); s1.add(back1);

const sp1 = new THREE.Mesh(
  new THREE.PlaneGeometry(16,8),
  new THREE.ShadowMaterial({ opacity: 0.12, color: 0x000000 })
);
sp1.rotation.x = -Math.PI/2; sp1.position.y = -1.2; sp1.receiveShadow = true; s1.add(sp1);

let partes1 = [], prog1 = 0, alvo1 = 0, explodido = false;
let camInicio = null, camFim = null;
let camAssembled = null, camExploded = null;

Promise.all(partesSorosat.map(({file, assembled, exploded, assembledRot, explodedRot}) =>
  new Promise((resolve) => {
    new STLLoader().load(file, (g) => {
      g.computeVertexNormals(); g.center();
      const cor = new THREE.Color(style.getPropertyValue('--model-color').trim());
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cor, metalness: 0.2, roughness: 0.5 }));
      m.castShadow = true; m.receiveShadow = true;
      const box = new THREE.Box3().setFromObject(m);
      const s = box.getSize(new THREE.Vector3());
      const max = Math.max(s.x, s.y, s.z);
      if (max > 0) m.scale.setScalar(2.2 / max);

      const aQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...assembledRot));
      const eQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...explodedRot));

      resolve({ mesh: m, assembledPos: new THREE.Vector3(...assembled), explodedPos: new THREE.Vector3(...exploded), assembledQuat: aQ, explodedQuat: eQ });
    }, undefined, () => resolve(null));
  })
)).then((res) => {
  partes1 = res.filter(r => r);
  
  const center = new THREE.Vector3(0, 0, 0);
  partes1.forEach(({assembledPos}) => center.add(assembledPos));
  center.divideScalar(partes1.length);
  
  partes1.forEach(({mesh}) => s1.add(mesh));
  orb1.target.copy(center);
  
  const dist = 4 + partes1.length * 1.2;
  camAssembled = new THREE.Vector3(center.x, center.y + dist * 0.3, center.z + dist);
  camExploded = camAssembled.clone().multiplyScalar(1.6);
  
  camInicio = camAssembled;
  camFim = camExploded;
  
  cam1.position.copy(camAssembled);
  orb1.update();
});

document.getElementById('toggle-sorosat').addEventListener('click', () => {
  explodido = !explodido;
  
  alvo1 = explodido ? 1 : 0;
  camInicio = cam1.position.clone();
  camFim = explodido ? camExploded : camAssembled;
  
  document.getElementById('toggle-sorosat').textContent = explodido ? '🔧 MONTAR' : '🔧 EXPLODIR';
});

function anim1() {
  requestAnimationFrame(anim1);
  prog1 += (alvo1 - prog1) * 0.05;
  
  partes1.forEach(({mesh, assembledPos, explodedPos, assembledQuat, explodedQuat}) => {
    mesh.position.lerpVectors(assembledPos, explodedPos, prog1);
    mesh.quaternion.slerpQuaternions(assembledQuat, explodedQuat, prog1);
  });
  
  if (camInicio && camFim && Math.abs(prog1 - alvo1) > 0.001) {
    const t = explodido ? prog1 : 1 - prog1;
    cam1.position.lerpVectors(camInicio, camFim, t);
  }
  
  orb1.update(); r1.render(s1, cam1);
}
anim1();

/* ════════════════════════════════════
   ESP32 — Viewer simples
   ════════════════════════════════════ */

const c2 = document.getElementById('viewer-esp32');

if (c2) {  // ← só executa se o container existir no HTML

  const s2 = new THREE.Scene(); s2.background = null;
  const cam2 = new THREE.PerspectiveCamera(40, c2.clientWidth/c2.clientHeight, 0.1, 1000);
  cam2.position.set(4, 3, 6);
  const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r2.setSize(c2.clientWidth, c2.clientHeight);
  r2.setPixelRatio(Math.min(devicePixelRatio, 2));
  r2.shadowMap.enabled = true;
  c2.appendChild(r2.domElement);

  const orb2 = new OrbitControls(cam2, r2.domElement);
  orb2.enableDamping = true; orb2.dampingFactor = 0.08;
  orb2.autoRotate = true; orb2.autoRotateSpeed = 1.5;
  orb2.enableZoom = false; orb2.enablePan = false;

  s2.add(new THREE.AmbientLight(0xffffff, 0.6));

  const d2 = new THREE.DirectionalLight(0xffffff, 2);
  d2.position.set(5, 10, 5); d2.castShadow = true; s2.add(d2);

  const f2 = new THREE.DirectionalLight(0x4444ff, 0.3);
  f2.position.set(-4, 2, 4); s2.add(f2);

  const back2 = new THREE.DirectionalLight(0xffffff, 0.15);
  back2.position.set(0, 0, -5); s2.add(back2);

  const sp2 = new THREE.Mesh(
    new THREE.PlaneGeometry(6,6),
    new THREE.ShadowMaterial({ opacity: 0.08, color: 0x000000 })
  );
  sp2.rotation.x = -Math.PI/2; sp2.position.y = -1.2; sp2.receiveShadow = true; s2.add(sp2);

  new STLLoader().load('esp32.stl', (g) => {
    g.computeVertexNormals(); g.center();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x33ff33, metalness: 0.15, roughness: 0.5, emissive: 0x113311, emissiveIntensity: 0.1 }));
    m.castShadow = true; m.receiveShadow = true;
    const box = new THREE.Box3().setFromObject(m);
    const s = box.getSize(new THREE.Vector3());
    const max = Math.max(s.x, s.y, s.z);
    if (max > 0) m.scale.setScalar(2.5 / max);
    s2.add(m);
    console.log('✅ ESP32 carregado');
  }, undefined, (e) => console.error('Erro ESP32:', e));

  function anim2() {
    requestAnimationFrame(anim2);
    orb2.update(); r2.render(s2, cam2);
  }
  anim2();
}

/* ─── RESIZE ─── */
window.addEventListener('resize', () => {
  const w1 = c1.clientWidth, h1 = c1.clientHeight;
  cam1.aspect = w1 / h1; cam1.updateProjectionMatrix();
  r1.setSize(w1, h1);

  if (c2) {
    const w2 = c2.clientWidth, h2 = c2.clientHeight;
    cam2.aspect = w2 / h2; cam2.updateProjectionMatrix();
    r2.setSize(w2, h2);
  }
});

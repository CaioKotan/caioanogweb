import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const style = getComputedStyle(document.documentElement);

/* ════════════════════════════════════════════════════════════════
   HELPER — Cabo curvo (peça → ponto fixo central)
   ════════════════════════════════════════════════════════════════ */
class CaboCentral {
  constructor(idxArray, idxPeca, localA, posCentral, cor = 0x88aaff, raio = 0.02, comprimento = 3.5) {
    this.idxArray = idxArray;
    this.idxPeca = idxPeca;
    this.localA = new THREE.Vector3(...localA);
    this.posCentral = posCentral;
    this.comprimentoIdeal = comprimento;
    this.raio = raio;

    this.curva = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    );

    const mat = new THREE.MeshStandardMaterial({
      color: cor, metalness: 0.1, roughness: 0.8,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  update() {
    const arr = this.idxArray === 'novasPecas' ? window.__novasPecas : window.__partes1;
    if (!arr || !arr[this.idxPeca]) return;

    const meshPeca = arr[this.idxPeca].mesh;
    const worldA = this.localA.clone().applyQuaternion(meshPeca.quaternion).add(meshPeca.position);
    const worldB = this.posCentral;

    const dist = worldA.distanceTo(worldB);
    if (dist < 0.001) return;

    const folga = Math.max(0, this.comprimentoIdeal - dist);
    const meio = worldA.clone().lerp(worldB, 0.5);
    meio.y -= folga * 0.6;

    this.curva.v0.copy(worldA);
    this.curva.v1.copy(meio);
    this.curva.v2.copy(worldB);

    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(this.curva, 20, this.raio, 8, false);
  }
}

/* ════════════════════════════════════════════════════════════════
   SOROSAT — Montado / Explodido
   ════════════════════════════════════════════════════════════════ */

const partesSorosat = [ //rotação 90º = 3.15
  { file: 'te6.glb', assembled: [1,0,1], exploded: [4,0,1], assembledRot:[1.575,3.15,1.575], explodedRot:[1,2.55,1]},
  { file: 'te5.glb', assembled: [0,-1.1,1], exploded: [0,-4,1], assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1]},
  { file: 'te4.glb', assembled: [0,0,0], exploded: [0,0,-3], assembledRot:[0,1.575,1.575], explodedRot:[1,1,1]},
  { file: 'te3.glb', assembled: [-1,0,1], exploded: [-4,0,1], assembledRot:[1.575,3.15,1.575], explodedRot:[1,2.55,1]},
  { file: 'te2.glb', assembled: [0,0,2], exploded: [0,0,5], assembledRot:[0,1.575,1.575], explodedRot:[1,1,1]},
  { file: 'te1.glb', assembled: [0,1,1], exploded: [0,4,1], assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1]},
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

/* ── Variáveis globais ── */
let partes1 = [], prog1 = 0, alvo1 = 0, explodido = false;
let camInicio = null, camFim = null;
let camAssembled = null, camExploded = null;
let cabos = [];
let esp32Model = null;
let novasPecas = [];

window.__partes1 = partes1;
window.__novasPecas = novasPecas;

/* ── Posições do ESP32 ── */
const posCentral = new THREE.Vector3();
const posCentralAssembled = new THREE.Vector3();
const posCentralExploded = new THREE.Vector3();

/* ── Config das 2 novas peças ── */
const configNovas = [
  {
    file: 'ultsensor.glb',
    label: 'Sensor',
    scale: 1.4,
    assembled: [0,  -1.0, 0.3],
    exploded:  [1.2,  -1.3, 0.5],
    assembledRot: [0, 2, 3],
    explodedRot: [0.3, 2.2, 3],
  },
  {
    file: 'oled128x64i2c.glb',
    label: 'OLED',
    scale: 1.0,
    assembled: [0.0, 0.4, 0.2],
    exploded:  [-1.0, 2.0, 0.6],
    assembledRot: [0, 0, 0],
    explodedRot: [-0.2, -0.3, 2.1],
  },
];

/* ── 8 cores para os 8 cabos ── */
const coresCabos = [
  0xff3333, 0xff6633, 0xff9933, 0xffcc33,
  0x3333ff, 0x3366ff, 0x3399ff, 0x33ccff,
];

/* ── 4 pontos de ancoragem por peça ── */
const pontosAncoragem = [
  [ 0.25,  0.15,  0   ],
  [-0.25,  0.15,  0   ],
  [ 0,     0.3,   0.15],
  [ 0,     0,     0.25],
];

/* ════════════════════════════════════════════════════════════════
   CARREGAMENTO
   ════════════════════════════════════════════════════════════════ */

// 1) STLs do SOROSAT
const loaderStl = Promise.all(
  partesSorosat.map(
    ({ file, assembled, exploded, assembledRot, explodedRot }) =>
      new Promise((resolve) => {
        new GLTFLoader().load(
          file,
          (gltf) => {
            const model = gltf.scene;

            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Mantém a aparência semelhante ao STL
                if (child.material) {
                  child.material = child.material.clone();
                  child.material.metalness = 0.2;
                  child.material.roughness = 0.5;
                }
              }
            });

            // Centraliza
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Escala igual ao STL
            const size = box.getSize(new THREE.Vector3());
            const max = Math.max(size.x, size.y, size.z);

            if (max > 0) {
              model.scale.setScalar(2.2 / max);
            }

            const aQ = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...assembledRot)
            );

            const eQ = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...explodedRot)
            );

            resolve({
              mesh: model,
              assembledPos: new THREE.Vector3(...assembled),
              explodedPos: new THREE.Vector3(...exploded),
              assembledQuat: aQ,
              explodedQuat: eQ,
            });
          },
          undefined,
          () => resolve(null)
        );
      })
  )
);

// 2) ESP32 GLB
const loaderEsp = new Promise((resolve) => {
  new GLTFLoader().load('esp32.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (max > 0) model.scale.setScalar(1.4 / max);
    resolve(model);
  }, undefined, () => resolve(null));
});

// 3) Novas peças (usa cfg.scale do configNovas)
const loadersNovas = configNovas.map((cfg) =>
  new Promise((resolve) => {
    new GLTFLoader().load(cfg.file, (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const max = Math.max(size.x, size.y, size.z);
      if (max > 0) model.scale.setScalar(cfg.scale / max); // ← USA O scale DO CONFIG

      resolve({
        mesh: model,
        label: cfg.label,
      });
    }, undefined, () => resolve(null));
  })
);

Promise.all([loaderStl, loaderEsp, ...loadersNovas]).then(([resStl, resEsp, ...resNovas]) => {
  // ── SOROSAT ──
  partes1 = resStl.filter(r => r);
  window.__partes1 = partes1;

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

  // ── ESP32 ──
  if (resEsp) {
    esp32Model = resEsp;
    esp32Model.position.copy(center);
    esp32Model.position.y += 0.3;

    posCentralAssembled.copy(esp32Model.position);
    posCentralExploded.copy(esp32Model.position);
    posCentralExploded.y += 0.6;
    posCentralExploded.x += 0.2;
    posCentral.copy(posCentralAssembled);

    s1.add(esp32Model);
    console.log('✅ ESP32 carregado');
  }

  // ── NOVAS PEÇAS ──
  novasPecas = resNovas.filter(r => r);
  window.__novasPecas = novasPecas;

  novasPecas.forEach((p, idx) => {
    const cfg = configNovas[idx];

    p.assembledPos = new THREE.Vector3(
      center.x + cfg.assembled[0],
      center.y + 0.3 + cfg.assembled[1],
      center.z + cfg.assembled[2]
    );
    p.explodedPos = new THREE.Vector3(
      center.x + cfg.exploded[0],
      center.y + 0.3 + cfg.exploded[1],
      center.z + cfg.exploded[2]
    );
    p.assembledQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.assembledRot));
    p.explodedQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.explodedRot));

    p.mesh.position.copy(p.assembledPos);
    p.mesh.quaternion.copy(p.assembledQuat);
    s1.add(p.mesh);
    console.log(`✅ ${p.label} → ${p.assembledPos.toArray().map(v=>v.toFixed(2))}`);
  });

  // ── CABOS ──
  cabos = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 4; j++) {
      cabos.push(new CaboCentral(
        'novasPecas', i,
        pontosAncoragem[j],
        posCentral,
        coresCabos[i * 4 + j],
        0.02 + j * 0.004,
        3.0 + j * 0.3
      ));
      s1.add(cabos[cabos.length - 1].mesh);
    }
  }
  console.log(`✅ ${cabos.length} cabos criados`);
});

/* ─── TOGGLE ─── */
document.getElementById('toggle-sorosat').addEventListener('click', () => {
  explodido = !explodido;
  alvo1 = explodido ? 1 : 0;
  camInicio = cam1.position.clone();
  camFim = explodido ? camExploded : camAssembled;
  document.getElementById('toggle-sorosat').textContent = explodido ? '🔧 MONTAR' : '🔧 EXPLODIR';
});

/* ─── ANIMAÇÃO ─── */
function anim1() {
  requestAnimationFrame(anim1);
  prog1 += (alvo1 - prog1) * 0.05;

  partes1.forEach(({mesh, assembledPos, explodedPos, assembledQuat, explodedQuat}) => {
    mesh.position.lerpVectors(assembledPos, explodedPos, prog1);
    mesh.quaternion.slerpQuaternions(assembledQuat, explodedQuat, prog1);
  });

  novasPecas.forEach(({mesh, assembledPos, explodedPos, assembledQuat, explodedQuat}) => {
    mesh.position.lerpVectors(assembledPos, explodedPos, prog1);
    mesh.quaternion.slerpQuaternions(assembledQuat, explodedQuat, prog1);
  });

  if (esp32Model) {
    posCentral.lerpVectors(posCentralAssembled, posCentralExploded, prog1);
    esp32Model.position.copy(posCentral);
  }

  cabos.forEach(c => c.update());

  if (camInicio && camFim && Math.abs(prog1 - alvo1) > 0.001) {
    const t = explodido ? prog1 : 1 - prog1;
    cam1.position.lerpVectors(camInicio, camFim, t);
  }

  orb1.update(); r1.render(s1, cam1);
}
anim1();

/* ════════════════════════════════════
   ESP32 — Viewer simples (opcional)
   ════════════════════════════════════ */

const c2 = document.getElementById('viewer-esp32');
if (c2) {
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
  }, undefined, (e) => console.error('Erro ESP32:', e));

  function anim2() { requestAnimationFrame(anim2); orb2.update(); r2.render(s2, cam2); }
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

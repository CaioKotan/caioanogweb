import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ════════════════════════════════════════════════════════════════
   CABO
   ════════════════════════════════════════════════════════════════ */
class Cabo {
  constructor(meshPeca, offsetLocal, fnAlvo, cor = 0x88aaff, raio = 0.02, comprimento = 3.5) {
    this.meshPeca = meshPeca;
    this.offsetLocal = new THREE.Vector3(...offsetLocal);
    this.fnAlvo = fnAlvo;
    this.comprimentoIdeal = comprimento;
    this.raio = raio;
    this.curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
    const mat = new THREE.MeshStandardMaterial({ color: cor, metalness: 0.1, roughness: 0.8 });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  update() {
    if (!this.meshPeca.parent) return;
    const A = this.offsetLocal.clone()
      .applyQuaternion(this.meshPeca.quaternion)
      .add(this.meshPeca.position);
    const B = this.fnAlvo();
    const dist = A.distanceTo(B);
    if (dist < 0.001) return;
    const folga = Math.max(0, this.comprimentoIdeal - dist);
    const meio = A.clone().lerp(B, 0.5);
    meio.y -= folga * 0.6;
    this.curva.v0.copy(A); this.curva.v1.copy(meio); this.curva.v2.copy(B);
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(this.curva, 20, this.raio, 8, false);
  }
}

/* ════════════════════════════════════════════════════════════════
   CONFIGS
   ════════════════════════════════════════════════════════════════ */
const FACES_CUBO = [
  { file: 'te6.glb', assembled: [1,0,1], exploded: [4,0,1],     assembledRot:[1.575,3.15,1.575], explodedRot:[1,2.55,1] },
  { file: 'te5.glb', assembled: [0,-1.1,1], exploded: [0,-4,1], assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
  { file: 'te4.glb', assembled: [0,0,0], exploded: [0,0,-3],    assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
  { file: 'te3.glb', assembled: [-1,0,1], exploded: [-4,0,1],   assembledRot:[1.575,3.15,1.575],  explodedRot:[1,2.55,1] },
  { file: 'te2.glb', assembled: [0,0,2], exploded: [0,0,5],     assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
  { file: 'te1.glb', assembled: [0,1,1], exploded: [0,4,1],     assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
];

function cubo(id, offsetX) {
  return {
    sorosat: FACES_CUBO.map((f, i) => ({
      id: `${id}-f${i}`, file: f.file,
      assembled:  [f.assembled[0] + offsetX, f.assembled[1], f.assembled[2]],
      exploded:   [f.exploded[0]  + offsetX, f.exploded[1],  f.exploded[2]],
      assembledRot: f.assembledRot, explodedRot: f.explodedRot,
    })),
    esp32: { id: `${id}-esp`, file: 'esp32.glb', offset: [offsetX, 0.3, 0] },
    novas: [
      { id: `${id}-sensor`, file: 'ultsensor.glb', label: 'Sensor', scale: 1.4,
        assembled: [offsetX, -0.7, 0.3], exploded: [offsetX+1.2, -1.0, 0.5],
        assembledRot: [0,2,3], explodedRot: [0.3,2.2,3] },
      { id: `${id}-oled`,   file: 'oled128x64i2c.glb', label: 'OLED',   scale: 1.0,
        assembled: [offsetX, 0.2, 0.2], exploded: [offsetX-1.0, 1.3, 0.6],
        assembledRot: [0,0,0], explodedRot: [-0.2,-0.3,2.1] },
    ],
  };
}

const v2spacing = 1.5;

// Viewer #1
const CFG_EDV1 = cubo('v1', 0);

// Viewer #2 — CADA FACE DE CADA CUBO EXPLÍCITA
const CFG_LAUNCH = {
  sorosat: [
    { id:'cuboE-f0', file:'l1.glb', assembled:[1-v2spacing,0,1], exploded:[4-v2spacing,0,1],     assembledRot:[1.575,3.15,1.575], explodedRot:[1,2.55,1] },
    { id:'cuboE-f1', file:'l2.glb', assembled:[0-v2spacing,-1.1,1], exploded:[0-v2spacing,-4,1], assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
    { id:'cuboE-f2', file:'l5.glb', assembled:[0-v2spacing,0,0], exploded:[0-v2spacing,0,-3],    assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
    { id:'cuboE-f3', file:'l3.glb', assembled:[-1-v2spacing,0,1], exploded:[-4-v2spacing,0,1],   assembledRot:[1.575,3.15,1.575],  explodedRot:[1,2.55,1] },
    { id:'cuboE-f4', file:'l6.glb', assembled:[0-v2spacing,0,2], exploded:[0-v2spacing,0,5],     assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
    { id:'cuboE-f5', file:'l4.glb', assembled:[0-v2spacing,1,1], exploded:[0-v2spacing,4,1],     assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
    { id:'cuboD-f0', file:'l7.glb', assembled:[1+v2spacing,0,1], exploded:[4+v2spacing,0,1],     assembledRot:[1.575,3.15,1.575], explodedRot:[1,2.55,1] },
    { id:'cuboD-f1', file:'l8.glb', assembled:[0+v2spacing,-1.1,1], exploded:[0+v2spacing,-4,1], assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
    { id:'cuboD-f2', file:'l11.glb', assembled:[0+v2spacing,0,0], exploded:[0+v2spacing,0,-3],    assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
    { id:'cuboD-f3', file:'l9.glb', assembled:[-1+v2spacing,0,1], exploded:[-4+v2spacing,0,1],   assembledRot:[1.575,3.15,1.575],  explodedRot:[1,2.55,1] },
    { id:'cuboD-f4', file:'l12.glb', assembled:[0+v2spacing,0,2], exploded:[0+v2spacing,0,5],     assembledRot:[0,1.575,1.575],     explodedRot:[1,1,1] },
    { id:'cuboD-f5', file:'l10.glb', assembled:[0+v2spacing,1,1], exploded:[0+v2spacing,4,1],     assembledRot:[1.575,1.575,1.575], explodedRot:[2.58,1,1] },
  ],
  esp32s: [
    { id:'cuboE-esp', file:'esp32.glb', offset:[-v2spacing, 0.3, 0] },
    { id:'cuboD-esp', file:'esp32.glb', offset:[ v2spacing, 0.3, 0] },
  ],
  novas: [
    { id:'cuboE-sensor', file:'ultsensor.glb', label:'Sensor E', scale:1.4,
      assembled:[-v2spacing,-0.2,0.3], exploded:[-v2spacing+1.2,-1.0,0.5],
      assembledRot:[0,2,3], explodedRot:[0.3,2.2,3] },
    { id:'cuboE-oled', file:'oled128x64i2c.glb', label:'OLED E', scale:1.0,
      assembled:[-v2spacing,0.2,0.2], exploded:[-v2spacing-1.0,2.3,0.6],
      assembledRot:[0,0,0], explodedRot:[-0.2,-0.3,2.1] },
    { id:'cuboD-sensor', file:'ultsensor.glb', label:'Sensor D', scale:1.4,
      assembled:[v2spacing,-0.2,0.3], exploded:[v2spacing+1.2,-1.0,0.5],
      assembledRot:[0,2,3], explodedRot:[0.3,2.2,3] },
    
  ],
};

const CORES_CABOS = [0xff3333,0xff6633,0xff9933,0xffcc33,0x3333ff,0x3366ff,0x3399ff,0x33ccff];
const PONTOS_ANCORA = [[0.25,0.15,0],[-0.25,0.15,0],[0,0.3,0.15],[0,0,0.25]];

/* ════════════════════════════════════════════════════════════════
   PROCESSAR GLTF
   ════════════════════════════════════════════════════════════════ */
function processarGLTF(scene, escalaAlvo) {
  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true; child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.metalness = 0.2; child.material.roughness = 0.5;
      }
    }
  });
  const box = new THREE.Box3().setFromObject(scene);
  scene.position.sub(box.getCenter(new THREE.Vector3()));
  const max = Math.max(...box.getSize(new THREE.Vector3()).toArray());
  if (max > 0) scene.scale.setScalar(escalaAlvo / max);
  return scene;
}

/* ════════════════════════════════════════════════════════════════
   CARREGAMENTO ÚNICO
   ════════════════════════════════════════════════════════════════ */
function arquivosUnicos(...configs) {
  const set = new Set();
  configs.forEach(cfg => {
    (cfg.sorosat || []).forEach(p => set.add(JSON.stringify({ file: p.file, scale: 2.2 })));
    (cfg.esp32s || (cfg.esp32 ? [cfg.esp32] : [])).forEach(p => set.add(JSON.stringify({ file: p.file, scale: 1.4 })));
    (cfg.novas || []).forEach(p => set.add(JSON.stringify({ file: p.file, scale: p.scale })));
  });
  return [...set].map(JSON.parse);
}

const modeloCache = {};
const todosArquivos = arquivosUnicos(CFG_EDV1, CFG_LAUNCH);

Promise.all(todosArquivos.map(({ file, scale }) =>
  new Promise(res => {
    new GLTFLoader().load(file, g => { modeloCache[file] = processarGLTF(g.scene, scale); res(); }, undefined, () => res());
  })
)).then(() => {
  console.log('📦 Cache:', Object.keys(modeloCache));
  criarViewer('viewer-3d',  'toggle-sorosat',   CFG_EDV1);
  criarViewer('viewer-3d2', 'toggle-sorosat-2', CFG_LAUNCH);
});

/* ════════════════════════════════════════════════════════════════
   FÁBRICA DE VIEWER
   ════════════════════════════════════════════════════════════════ */
function criarViewer(containerId, btnId, config) {
  const el = document.getElementById(containerId);
  const scene = new THREE.Scene(); scene.background = null;

  const cam = new THREE.PerspectiveCamera(20, el.clientWidth/el.clientHeight, 0.1, 500);
  cam.position.set(0, 0, 8);

  const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  ren.setSize(el.clientWidth, el.clientHeight);
  ren.setPixelRatio(Math.min(devicePixelRatio, 2));
  ren.shadowMap.enabled = true;
  el.appendChild(ren.domElement);

  const orb = new OrbitControls(cam, ren.domElement);
  orb.enableDamping = true; orb.dampingFactor = 0.08;
  orb.autoRotate = true; orb.autoRotateSpeed = 0.3;
  orb.enableZoom = false; orb.enablePan = false;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 2);
  dl.position.set(5,10,5); dl.castShadow = true; scene.add(dl);
  const fl = new THREE.DirectionalLight(0x4444ff, 0.3);
  fl.position.set(-4,2,4); scene.add(fl);
  const bl = new THREE.DirectionalLight(0xffffff, 0.15);
  bl.position.set(0,0,-5); scene.add(bl);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(24,8), new THREE.ShadowMaterial({opacity:0.12,color:0x000000}));
  sh.rotation.x = -Math.PI/2; sh.position.y = -1.2; sh.receiveShadow = true; scene.add(sh);

  // ── Estado ──
  const state = {
    pecas: {},    // { id: { mesh, p0, p1, r0, r1, tipo } }
    esp32s: [],   // [{ mesh, pos, posExplodida, id }]
    cabos: [],
    prog: 0, alvo: 0, explodido: false,
    camInicio: null, camFim: null,
    camAssembled: null, camExploded: null,
  };

  // Centro
  const center = new THREE.Vector3(0,0,0);
  let count = 0;

  // ── Sorosat ──
  (config.sorosat || []).forEach(cfg => {
    const mesh = modeloCache[cfg.file].clone(true);
    const p0 = new THREE.Vector3(...cfg.assembled);
    const p1 = new THREE.Vector3(...cfg.exploded);
    const r0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.assembledRot));
    const r1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.explodedRot));
    mesh.position.copy(p0);
    mesh.quaternion.copy(r0);
    scene.add(mesh);
    center.add(p0); count++;
    state.pecas[cfg.id] = { mesh, p0, p1, r0, r1, tipo: 'sorosat', id: cfg.id };
  });
  if (count) center.divideScalar(count);
  orb.target.copy(center);

  const dist = 4 + (config.sorosat?.length || 6) * 1.2;
  state.camAssembled = new THREE.Vector3(center.x, center.y + dist*0.3, center.z + dist);
  state.camExploded = state.camAssembled.clone().multiplyScalar(1.6);
  state.camInicio = state.camAssembled;
  state.camFim = state.camExploded;
  cam.position.copy(state.camAssembled);
  orb.update();

  // ── ESP32(s) ──
  const listaEsp = config.esp32s || (config.esp32 ? [config.esp32] : []);
  listaEsp.forEach(espCfg => {
    if (!modeloCache[espCfg.file]) return;
    const mesh = modeloCache[espCfg.file].clone(true);
    const pos = new THREE.Vector3(center.x + espCfg.offset[0], center.y + espCfg.offset[1], center.z + espCfg.offset[2]);
    const posExplodida = pos.clone().add(new THREE.Vector3(0.2, 0.6, 0));
    mesh.position.copy(pos);
    scene.add(mesh);
    const entry = { mesh, pos, posExplodida, id: espCfg.id };
    state.esp32s.push(entry);
    state.pecas[espCfg.id] = { mesh, p0: pos, p1: posExplodida, r0: new THREE.Quaternion(), r1: new THREE.Quaternion(), tipo: 'esp32', id: espCfg.id };
  });

  // ── Novas + Cabos (cada nova → ESP32 mais próximo) ──
  (config.novas || []).forEach(cfg => {
    const mesh = modeloCache[cfg.file].clone(true);
    const p0 = new THREE.Vector3(center.x+cfg.assembled[0], center.y+cfg.assembled[1], center.z+cfg.assembled[2]);
    const p1 = new THREE.Vector3(center.x+cfg.exploded[0],  center.y+cfg.exploded[1],  center.z+cfg.exploded[2]);
    p0.y += 0.3; p1.y += 0.3;
    const r0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.assembledRot));
    const r1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.explodedRot));
    mesh.position.copy(p0);
    mesh.quaternion.copy(r0);
    scene.add(mesh);
    state.pecas[cfg.id] = { mesh, p0, p1, r0, r1, tipo: 'nova', id: cfg.id, label: cfg.label };

    // ESP32 mais próximo
    const espProx = state.esp32s.reduce((a, b) =>
      Math.abs(a.mesh.position.x - p0.x) < Math.abs(b.mesh.position.x - p0.x) ? a : b
    );

    for (let j = 0; j < 4; j++) {
      const corIdx = ((state.esp32s.indexOf(espProx) % 2) * 4) + j;
      const cabo = new Cabo(
        mesh, PONTOS_ANCORA[j],
        () => espProx.mesh.position.clone().lerp(espProx.posExplodida, state.prog),
        CORES_CABOS[corIdx],
        0.02 + j*0.004, 3.0 + j*0.3
      );
      state.cabos.push(cabo);
      scene.add(cabo.mesh);
    }
  });

  // ── Botão ──
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener('click', () => {
      state.explodido = !state.explodido;
      state.alvo = state.explodido ? 1 : 0;
      state.camInicio = cam.position.clone();
      state.camFim = state.explodido ? state.camExploded : state.camAssembled;
      btn.textContent = state.explodido ? '🔧 MONTAR' : '🔧 EXPLODIR';
    });
  }

  // ── Animação ──
  function animar() {
    requestAnimationFrame(animar);
    state.prog += (state.alvo - state.prog) * 0.05;

    Object.values(state.pecas).forEach(p => {
      p.mesh.position.lerpVectors(p.p0, p.p1, state.prog);
      p.mesh.quaternion.slerpQuaternions(p.r0, p.r1, state.prog);
    });
    state.cabos.forEach(c => c.update());

    if (state.camInicio && state.camFim && Math.abs(state.prog - state.alvo) > 0.001) {
      const t = state.explodido ? state.prog : 1 - state.prog;
      cam.position.lerpVectors(state.camInicio, state.camFim, t);
    }
    orb.update();
    ren.render(scene, cam);
  }
  animar();

  window.addEventListener('resize', () => {
    cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix();
    ren.setSize(el.clientWidth, el.clientHeight);
  });

  const nome = `viewer_${containerId.replace(/\W/g, '_')}`;
  window[nome] = state;
  console.log(`✅ Viewer [${containerId}] pronto`);
  return state;
}

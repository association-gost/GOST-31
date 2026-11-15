// La panthère en 3D : marche depuis la gauche, rugit face à nous, se couche.
// Modèle : « Panther semi low poly sculpt » par uv15o6 (CC BY 4.0), squelette et animation ajoutés
// (script Blender : assets/riguer-panthere.py). L'animation fait 8,4 s ; l'intro de panthere.js
// la pilote image par image et fait le fondu vers la panthère du logo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const P3 = (window.Panthere3D = window.Panthere3D || {});
P3.pret = false;
P3.DUREE = 8.4;
P3.T = { arret: 3.3, rugit: 4.35, ouverte: 4.67, couche: 6.05, couchee: 7.65 };

P3.charger = function (conteneur, url, o) {
  o = o || {};
  P3.promesse = new Promise((resoudre, rejeter) => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { rejeter(e); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposition || 1.15;
    const canvas = renderer.domElement;
    canvas.className = 'panthere-3d';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0';
    conteneur.appendChild(canvas);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
    cam.position.set(0, 0, 10);
    scene.add(new THREE.HemisphereLight(0xe4e9ff, 0x141416, o.ciel == null ? 1.5 : o.ciel));
    const cle = new THREE.DirectionalLight(0xffffff, o.cle == null ? 2.6 : o.cle); cle.position.set(-3, 4, 6); scene.add(cle);
    const contre = new THREE.DirectionalLight(o.couleurContre || 0xffffff, o.contre == null ? 2.2 : o.contre); contre.position.set(3, 2.5, -5); scene.add(contre);

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
    loader.load(url, (g) => {
      const modele = g.scene;
      modele.rotation.y = Math.PI / 2; // l'avant du modèle (+Z) regarde vers la droite de l'écran
      const support = new THREE.Group(); support.add(modele); scene.add(support);
      const maillages = [];
      modele.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; maillages.push(m); } });
      const mixer = new THREE.AnimationMixer(modele);
      const action = mixer.clipAction(g.animations[0]);
      action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();

      // Boîte englobante réelle (os appliqués) à un instant donné.
      const v = new THREE.Vector3();
      function poserA(t) { action.enabled = true; action.paused = false; action.time = t; mixer.update(0); }
      function boite(t, filtre) {
        poserA(t); scene.updateMatrixWorld(true);
        const b = new THREE.Box3();
        maillages.filter(filtre).forEach((m) => {
          const pos = m.geometry.attributes.position, pas = Math.max(1, Math.floor(pos.count / 1500));
          for (let i = 0; i < pos.count; i += pas) {
            v.fromBufferAttribute(pos, i);
            if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
            v.applyMatrix4(m.matrixWorld); b.expandByPoint(v);
          }
        });
        return b;
      }
      const sansQueue = (m) => !/queue/.test(m.name) && !/queue/.test(m.parent && m.parent.name || '');
      const estTete = (m) => /^tete/.test(m.name) || /^tete/.test(m.parent && m.parent.name || '');
      const finale = boite(P3.DUREE, sansQueue);
      const teteFinale = boite(P3.DUREE, estTete);
      const teteRugit = boite(P3.T.ouverte + 0.2, estTete);
      const debout = boite(P3.T.arret + 0.3, sansQueue);
      poserA(0);

      const st = { renderer, scene, cam, canvas, mixer, poserA, support, finale, teteFinale, teteRugit, debout, fit: null, w: 1, h: 1 };
      P3.st = st;
      P3.canvas = canvas;
      P3.pret = true;
      resoudre(P3);
    }, undefined, (err) => rejeter(err));
  });
  P3.promesse.catch((e) => { P3.pret = false; console.warn('Panthère 3D indisponible, intro 2D utilisée.', e); });
  return P3.promesse;
};

// Cale la caméra : le centre de la tête et la hauteur de la panthère couchée tombent sur
// ceux de la panthère du logo (coordonnées écran fournies par panthere.js).
P3.caler = function (cible) {
  const st = P3.st; if (!st) return;
  const r = st.canvas.getBoundingClientRect();
  st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
  st.renderer.setSize(st.w, st.h, false);
  const haut3 = st.finale.max.y, bas3 = st.finale.min.y;
  const teteX = (st.teteFinale.min.x + st.teteFinale.max.x) / 2;
  const ppu = (cible.bas - cible.haut) / (haut3 - bas3);
  st.fit = {
    ppu,
    cx: teteX - (cible.teteX - st.w / 2) / ppu,
    cy: bas3 + (cible.bas - st.h / 2) / ppu
  };
  const d = st.debout;
  st.marche = { cx: (d.min.x + d.max.x) / 2, cy: (d.min.y + d.max.y) / 2 + 0.05, zoom: Math.min(2.5, Math.min(st.h * 0.46 / ((d.max.y - d.min.y) * ppu), st.w * 0.62 / ((d.max.x - d.min.x) * ppu))) };
  const t = st.teteRugit;
  st.gros = { cx: (t.min.x + t.max.x) / 2, cy: (t.min.y + t.max.y) / 2 - 0.05, zoom: Math.min(3.2, (st.h * 0.62) / ((t.max.y - t.min.y) * ppu)) };
};

// vue : { t (s d'animation), decal (entrée par la gauche), cadre (0 = cadre de marche, 1 = cadre du logo), tete (1 = gros plan) }
P3.rendre = function (vue) {
  const st = P3.st; if (!st || !st.fit) return;
  st.poserA(Math.min(P3.DUREE - 0.001, Math.max(0, vue.t)));
  st.support.position.x = vue.decal || 0;
  const k = vue.tete || 0, c = vue.cadre == null ? 1 : vue.cadre, f = st.fit, g = st.gros, m = st.marche;
  const base = { cx: m.cx + (f.cx - m.cx) * c, cy: m.cy + (f.cy - m.cy) * c, zoom: m.zoom + (1 - m.zoom) * c };
  const zoom = base.zoom + (g.zoom - base.zoom) * k;
  const cam = st.cam, demiW = st.w / (2 * f.ppu), demiH = st.h / (2 * f.ppu);
  cam.left = -demiW; cam.right = demiW; cam.top = demiH; cam.bottom = -demiH;
  cam.zoom = zoom;
  cam.position.x = base.cx + (g.cx - base.cx) * k;
  cam.position.y = base.cy + (g.cy - base.cy) * k;
  cam.updateProjectionMatrix();
  st.renderer.render(st.scene, cam);
};

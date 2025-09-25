'use client';
import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { isAluminum, isGlass, isSilk, tuneAluminum, tuneGlass, tuneSilk } from '@/lib/materials';
import { useSim } from '@/state/sim';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FINISH_META } from '@/lib/finishes';
import type { FinishName } from '@/lib/finishes';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing'; 
import { useLayoutEffect } from 'react';
import { getPresetForModel, clampBoxFrom } from '@/lib/cameraPresets';
import { getShelfPresetForModel } from '@/lib/shelfPresets';

const DEBUG_FINISH_LOGS = true; // flip to false to silence logs

THREE.Cache.enabled = true;

type GlassMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;

function formatVec(v: THREE.Vector3) {
  return `[${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}]`;
}
function CameraSnap({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    function doSnap() {
      const p = camera.position.clone();
      const t = controlsRef.current?.target?.clone?.() ?? new THREE.Vector3();
      const text =
        `// Pick a pose that works for your room\n` +
        `const CAM_POS: [number, number, number] = ${formatVec(p)};\n` +
        `const CAM_LOOK: [number, number, number] = ${formatVec(t)};`;
      console.log('%c[Camera]', 'background:#222;color:#0f0;padding:2px 6px', '\n' + text);
      navigator.clipboard?.writeText(text).catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'p') doSnap(); };

    // also listen to a DOM event we can fire from Panels
    const onEvt = () => doSnap();

    window.addEventListener('keydown', onKey);
    window.addEventListener('copy-cam-pose', onEvt as any);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('copy-cam-pose', onEvt as any);
    };
  }, [camera, controlsRef, gl]);
  return null;
}
function CameraGoto({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const anim = useRef<{
    startP: THREE.Vector3; startL: THREE.Vector3;
    endP: THREE.Vector3;   endL: THREE.Vector3;
    t: number; dur: number;
  } | null>(null);

  useEffect(() => {
    const onEvt = (e: any) => {
      const pos: [number, number, number] | undefined = e.detail?.pos;
      const look: [number, number, number] | undefined = e.detail?.look;
      const duration: number = e.detail?.duration ?? 0;
      if (!pos || !look) return;

      // Instant jump (used only on first mount)
      if (duration <= 0) {
        camera.position.set(...pos);
        const tgt = controlsRef.current?.target;
        if (tgt) { tgt.set(...look); controlsRef.current?.update?.(); }
        else { camera.lookAt(new THREE.Vector3(...look)); }
        return;
      }

      // Signal “animation start”
      window.dispatchEvent(new CustomEvent('cam-anim-start'));

      anim.current = {
        startP: camera.position.clone(),
        startL: controlsRef.current?.target?.clone?.() ?? new THREE.Vector3(),
        endP: new THREE.Vector3(...pos),
        endL: new THREE.Vector3(...look),
        t: 0,
        dur: duration,
      };
    };

    window.addEventListener('go-to-cam-pose', onEvt as any);
    return () => window.removeEventListener('go-to-cam-pose', onEvt as any);
  }, [camera, controlsRef]);

  useFrame((_, dt) => {
    const a = anim.current; if (!a) return;
    a.t += dt;
    let k = Math.min(1, a.t / a.dur);
    // easeOutCubic
    k = 1 - Math.pow(1 - k, 3);

    // Move camera and aim at the lerped target (no OrbitControls.update during anim)
    camera.position.lerpVectors(a.startP, a.endP, k);
    const tgt = controlsRef.current?.target;
    const lookNow = new THREE.Vector3().lerpVectors(a.startL, a.endL, k);
    if (tgt) tgt.copy(lookNow);
    camera.lookAt(lookNow);

    if (k >= 1) {
      // Ensure controls know the final target/orbit
      controlsRef.current?.update?.();
      anim.current = null;
      // Signal “animation done”
      window.dispatchEvent(new CustomEvent('cam-anim-done'));
    }
  });

  return null;
}

function makeNoiseNormal(size = 64) {
  const pixels = size * size;
  const data = new Uint8Array(pixels * 4); // RGBA

  for (let i = 0; i < pixels; i++) {
    // Near-flat normal (128,128,255) with a little jitter on R/G
    const j = Math.floor(Math.random() * 10) - 5; // -5..+4
    const r = 128 + j;
    const g = 128 + j;
    const b = 255;
    const a = 255;

    const idx = i * 4;
    data[idx + 0] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = a;
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  // Normal maps are *data* textures — keep default (no colorSpace).
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

const FROST_NOISE = makeNoiseNormal(64);


const isMat__Aluminum = (m: any) =>
  ((m?.name ?? '') as string).toLowerCase().replace(/\s+/g, '') === 'mat__aluminum';

async function applyFinishToMats(
  mats: THREE.MeshStandardMaterial[],
  name: FinishName,
  aniso: number
) {
  const basePath = `/finishes/${name}/${name}`;
  const loader = new THREE.TextureLoader();
  const load = (url: string) =>
    new Promise<THREE.Texture | null>(res => {
      loader.load(
        url,
        t => {
          const isBase = url.toLowerCase().includes('basecolor');
          t.colorSpace = isBase ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = aniso;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.generateMipmaps = true;
          res(t);
        },
        undefined,
        () => res(null)
      );
    });

  const [map, normalMap, roughnessMap] = await Promise.all([
    load(`${basePath}_BaseColor.png`),
    load(`${basePath}_Normal.png`),
    load(`${basePath}_Roughness.png`),
  ]);

  const meta = FINISH_META[name] ?? {};
  mats.forEach(m => {
    m.map = map || null;
    m.color.set(map ? '#ffffff' : (meta.hex ?? '#ffffff'));
    m.normalMap = normalMap || null;
    const ns = meta.normalScale ?? 0.3;
    m.normalScale = new THREE.Vector2(ns, ns);
    m.roughnessMap = roughnessMap || null;
    const metallic = meta.metalness ?? 0;
    m.metalness = metallic;
    const baseR = meta.roughness ?? 0.25;
    m.roughness = roughnessMap ? m.roughness : baseR;
    if (metallic) m.roughness = Math.max(m.roughness, 0.08); else m.roughness = Math.max(m.roughness, 0.12);
    (m as any).envMapIntensity = metallic ? 1.1 : 0.85;
    m.dithering = true;
    m.side = THREE.FrontSide;
    m.needsUpdate = true;
  });
}

// For handles
function applyFinishToNode(
  node: THREE.Object3D,
  sample: THREE.MeshStandardMaterial | null | undefined,
  shouldPaint?: (m: any) => boolean     // NEW (optional filter)
) {
  if (!sample) return;

  node.traverse((n) => {
    const mats = Array.isArray((n as any).material)
      ? ((n as any).material as THREE.Material[])
      : ((n as any).material ? [(n as any).material as THREE.Material] : []);

    mats.forEach((mm: any) => {
      if (!mm || !(mm.isMeshStandardMaterial || mm.isMeshPhysicalMaterial)) return;

      // apply filter if provided
      if (shouldPaint) {
        try {
          if (!shouldPaint(mm)) return;
        } catch { return; }
      }

      // copy fields (no mm.copy to avoid surprises)
      if (sample.color && mm.color?.copy) mm.color.copy(sample.color);
      mm.map = sample.map ?? null;

      if ('metalness' in mm) mm.metalness = (sample as any).metalness ?? mm.metalness;
      if ('roughness' in mm) mm.roughness = (sample as any).roughness ?? mm.roughness;

      mm.roughnessMap = (sample as any).roughnessMap ?? null;
      mm.normalMap    = (sample as any).normalMap ?? null;

      if (mm.normalScale && (sample as any).normalScale?.x !== undefined) {
        mm.normalScale.copy((sample as any).normalScale);
      }

      (mm as any).envMapIntensity =
        (sample as any).envMapIntensity ?? (mm as any).envMapIntensity ?? 1.0;

      mm.needsUpdate = true;
    });
  });
}

function ClickToZoom({
  controlsRef, enabled, min, max,
}: {
  controlsRef: React.RefObject<any>;
  enabled: boolean;
  min: [number, number, number];
  max: [number, number, number];
}) {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster()).current;
  const ndc = useRef(new THREE.Vector2()).current;

useEffect(() => {
  if (!enabled) return;

  const computeZoomDistance = (hit: THREE.Intersection) => {
    const name = (hit.object?.name || '').toLowerCase();
    const isTinyDetail = /handle|puxador|frame|perfil|alum/i.test(name);
    // go VERY close on details, a bit farther on big surfaces
    const d = hit.distance;
    return isTinyDetail
      ? THREE.MathUtils.clamp(d * 0.12, 0.05, 0.22) // ultra close
      : THREE.MathUtils.clamp(d * 0.22, 0.12, 0.55);
  };

  const pickValidHit = (hits: THREE.Intersection[]) =>
    hits.find(h => {
      const n = (h.object?.name || '');
      // skip overlays / our injected swap roots / helpers
      return h.object.visible && !/SilkOverlay|HandleSwapRoot|helper/i.test(n);
    });

  const onDbl = (e: MouseEvent) => {
    if (!controlsRef.current?.enabled) return;

    const rect = gl.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = pickValidHit(hits);
    if (!hit) return;

    const dir = raycaster.ray.direction.clone();
    const dist = computeZoomDistance(hit);

    const endLookRaw = hit.point.clone();
    const endPosRaw  = hit.point.clone().add(dir.multiplyScalar(-dist));

    // clamp look into AABB
    const endLook = new THREE.Vector3(
      THREE.MathUtils.clamp(endLookRaw.x, min[0], max[0]),
      THREE.MathUtils.clamp(endLookRaw.y, min[1], max[1]),
      THREE.MathUtils.clamp(endLookRaw.z, min[2], max[2])
    );

    // keep the same offset direction/length from look → camera
    const offset = endPosRaw.clone().sub(endLookRaw).normalize().multiplyScalar(dist);
    const endPos = endLook.clone().add(offset);

    window.dispatchEvent(new CustomEvent('go-to-cam-pose', {
      detail: { pos: endPos.toArray(), look: endLook.toArray(), duration: 0.75 }
    }));
  };

  gl.domElement.addEventListener('dblclick', onDbl);
  return () => gl.domElement.removeEventListener('dblclick', onDbl);
}, [enabled, camera, gl, scene, controlsRef, min, max]);
  return null;
}
function ClampControls({
  controlsRef, enabled, min, max,
}: {
  controlsRef: React.RefObject<any>;
  enabled: boolean;
  min: [number, number, number];
  max: [number, number, number];
}) {
  useFrame(() => {
    if (!enabled) return;
    const c = controlsRef.current;
    if (!c) return;

    c.target.x = THREE.MathUtils.clamp(c.target.x, min[0], max[0]);
    c.target.y = THREE.MathUtils.clamp(c.target.y, min[1], max[1]);
    c.target.z = THREE.MathUtils.clamp(c.target.z, min[2], max[2]);
  });
  return null;
}
function ShowerHotspot({
  position,
  onClick,
  visible,
}: {
  position: [number, number, number];
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <Html position={position} center sprite style={{ pointerEvents: 'auto', zIndex: 40 }}>
      <button
        onClick={onClick}
        aria-label="Zoom in"
        style={{
          width: 24, height: 24,
          position: 'relative',
          borderRadius: '9999px',
          background: 'rgba(254, 203, 31,0.95)',
          border: '2px solid rgba(0,0,0,0.25)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          cursor: 'pointer'
        }}
      >
        {/* pulsing ring */}
        <span
          style={{
            position: 'absolute', inset: -3,
            borderRadius: '9999px',
            border: '3px solid rgba(254, 203, 31,0.9)',
            animation: 'hotspot-pulse 1.5s ease-out infinite'
          }}
        />
      </button>
    </Html>
  );
}

// Normalize names once
const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');

// matches the hinge nodes and the new material name
const isShelfHingeName  = (name: string) => norm(name).startsWith('shelf_hinge');
const isShelfFixMat = (m: any) => {
  const n = (m?.name ?? '').toLowerCase().trim();
  // normalize accents and spaces
  const nn = n.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '');
  // starts with "alum" is enough (alum, aluminum, aluminio, alum.001, etc.)
  return nn.startsWith('alum');
};
// keep a copy of originals so "Padrão" restores correctly
const origByMat_FixBar  = new WeakMap<THREE.Material, THREE.Material>();
const origByMat_Shelf   = new WeakMap<THREE.Material, THREE.Material>();

// copy sample → target (safer than t.copy(sample) when types differ)
function paintWithSample(
  sample: THREE.MeshStandardMaterial,
  mm: any
) {
  if (!mm || !(mm.isMeshStandardMaterial || mm.isMeshPhysicalMaterial)) return;
  if (sample.color && mm.color?.copy) mm.color.copy(sample.color);
  mm.map          = sample.map ?? null;
  mm.normalMap    = (sample as any).normalMap ?? null;
  mm.roughnessMap = (sample as any).roughnessMap ?? null;

  if ('metalness' in mm) mm.metalness = (sample as any).metalness ?? mm.metalness;
  if ('roughness' in mm) mm.roughness = (sample as any).roughness ?? mm.roughness;

  if (mm.normalScale && (sample as any).normalScale?.x !== undefined) {
    mm.normalScale.copy((sample as any).normalScale);
  }
  (mm as any).envMapIntensity =
    (sample as any).envMapIntensity ?? (mm as any).envMapIntensity ?? 1.0;

  mm.needsUpdate = true;
}

// restore from our snapshot
function restoreFromSnapshot(mm: any, snap?: THREE.Material | null) {
  if (!snap || !mm || !(mm.isMaterial && snap.isMaterial)) return;
  // Both Standard and Physical implement copy()
  if (typeof (mm as any).copy === 'function') {
    (mm as any).copy(snap);
    // colors on MeshPhysicalMaterial sometimes need an explicit copy
    if ((snap as any).color && (mm as any).color?.copy) {
      (mm as any).color.copy((snap as any).color);
    }
    (mm as any).needsUpdate = true;
  }
}

function Product() {

    // ---------- scene selection ----------
  const model = useSim((s) => s.model);  // e.g. "DiplomataGold_V5"
  const stage = useSim((s) => s.stage);  // 1 | 2
  const sceneFile = `/glb/SCENE_${stage}_${model}.glb`;

  const gltf = useGLTF(sceneFile);
  // Preload both stages for the *current* model (lightweight + snappy switching)
  useGLTF.preload(`/glb/SCENE_1_${model}.glb`);
  useGLTF.preload(`/glb/SCENE_2_${model}.glb`);

  const currentSwapRoots = useRef<Set<THREE.Object3D>>(new Set()); // Handle

  const shelfCorner = useSim(s => s.shelfCorner);

  const shelfGltf = useGLTF('/shelves/side_shelf.glb');
  const shelfRoot = useRef<THREE.Group>(new THREE.Group());

  const finishJobId = useRef(0); //For hinge color

    useEffect(() => {
    // make sure our group is attached to the current scene root
    gltf.scene.add(shelfRoot.current);
    return () => {
      // detach on unmount / when scene changes
      gltf.scene.remove(shelfRoot.current);
    };
  }, [gltf.scene]);

  //Shelf
  const shelfHingeMatsRef = useRef<any[]>([]);
  const isUnderShelf = (o: THREE.Object3D) => {
    let a: THREE.Object3D | null = o;
    const root = shelfRoot.current;
    while (a) { if (a === root) return true; a = a.parent as any; }
    return false;
  };
  // all outer glass meshes (Glass_material)
  const outerGlass = useRef<GlassMesh[]>([]);
  // original-outer -> inner-shell clone
  const innerByOuter = useRef(new WeakMap<GlassMesh, GlassMesh>());

  function ensureInnerShellFor(outer: GlassMesh): GlassMesh {
    const map = innerByOuter.current;
    let inner = map.get(outer);
    if (inner) return inner;

    const innerMat = outer.material.clone();
    innerMat.side = THREE.BackSide;                 // back-face only
    innerMat.polygonOffset = true;                  // avoid z-fighting
    innerMat.polygonOffsetFactor = -0.5;

    inner = new THREE.Mesh(outer.geometry, innerMat);
    inner.name = `${outer.name || 'Glass'}__inner`;
    inner.renderOrder = (outer.renderOrder ?? 1) + 0.01;

    // place exactly on top (same local transform)
    outer.add(inner);
    map.set(outer, inner);
    return inner;
  }

  // Softer frosted with a *tiny* blur, lightweight
  function applyFrostedOuter(outer: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>) {
    const m = outer.material as THREE.MeshPhysicalMaterial;

    // OUTER (viewer side): mild frost
    m.roughness = 0.64;           // tiny blur (was 0.72 in the ultra-soft version)
    m.transmission = 0.78;        // a little clearer than before
    m.ior = 1.03;                 // low distortion
    m.thickness = 0.006;
    m.attenuationColor.set(0xffffff);
    m.attenuationDistance = 0.32; // a hair less milky than before
    m.clearcoat = 0.0;
    m.clearcoatRoughness = 0.0;
    (m as any).envMapIntensity = 0.55;

    // micro-noise normal to softly scatter reflections
    m.normalMap = FROST_NOISE;
    m.normalScale.set(0.14, 0.14);   // **small** jitter = subtle blur
    m.side = THREE.FrontSide;
    m.depthWrite = true;
    m.depthTest  = true;
    m.needsUpdate = true;

    // INNER (backface): slightly stronger blur → averages into a faint background blur
    const inner = ensureInnerShellFor(outer);
    inner.visible = true;
    const im = inner.material as THREE.MeshPhysicalMaterial;
    im.copy(m);
    im.side = THREE.BackSide;

    // push a touch more blur inside
    im.roughness = 0.7;             // +0.06 vs outer
    im.transmission = 0.74;         // a tad less see-through than outer
    im.normalMap = FROST_NOISE;
    im.normalScale.set(0.18, 0.18); // inner jitter slightly stronger
    // slight polygon offset to help stability
    im.polygonOffset = true;
    im.polygonOffsetFactor = -0.5;

    im.needsUpdate = true;
  }
  const resetToClearGlass = (outer: THREE.Mesh) => {
  const mp = outer.material as THREE.MeshPhysicalMaterial;

  // Restore your baseline glass (wipes absorption & clearcoat tweaks too)
  tuneGlass(mp);
  mp.side = THREE.FrontSide;

  // Hide/remove the inner acrylic shell
  const inner = innerByOuter.current.get(outer as any);
  if (inner) inner.visible = false;

  mp.needsUpdate = true;
  };
  const clearAcrylicMapsButKeepBase = (outer: THREE.Mesh) => {
    const om = outer.material as THREE.MeshPhysicalMaterial;
    om.normalMap = null;
    om.roughnessMap = null as any;
    (om as any).thicknessMap = null as any;
    (om as any).clearcoatNormalMap = null as any;
    om.needsUpdate = true;
  };
  const applyGlassFinishNow = (outer: THREE.MeshPhysicalMaterial, finish: 'transparent' | 'frosted') => {
    if (finish === 'transparent') {
      outer.roughness = 0.02;
      outer.transmission = 1.0;
      outer.clearcoat = 0.5;
      outer.clearcoatRoughness = 0.06;
      (outer as any).envMapIntensity = 1.2;
    } else {
      outer.roughness = 0.55;
      outer.transmission = 0.85;
      outer.clearcoat = 0.0;
      outer.clearcoatRoughness = 0.0;
      (outer as any).envMapIntensity = 0.7;
    }
    outer.needsUpdate = true;
  };
  const glassFinish = useSim(s => s.glassFinish);
  const setGlassFinish = useSim(s => s.setGlassFinish);
  type GlassMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;

  // Sharp aluminum profile fixing
  const gl = useThree(s => s.gl);
  const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy()); // 8 is a sweet spot

  // ===== PLAY/PAUSE =====
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), [gltf.scene]);
  const animPlaying = useSim((s) => s.animPlaying);

  useEffect(() => {
    const clip = gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
    return () => { mixer.stopAllAction(); };
  }, [gltf.animations, mixer]);

  useFrame((_, dt) => { if (animPlaying) mixer.update(dt); });

const isPanelGlassMat = (m: any) =>
  typeof m?.name === 'string' && norm(m.name).startsWith('glass_material');

  // ===== ONE-TIME MATERIAL TUNING =====
  useEffect(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as any;
      if (!mat) return;

      // only tune the shower panes, not every “glass*”
    if (mat.isMeshPhysicalMaterial && isPanelGlassMat(mat)) {
      if (isUnderShelf(mesh)) return;
      tuneGlass(mat);
      mat.side = THREE.FrontSide;
    } else if (isAluminum(mat) && mat.isMeshStandardMaterial) {
      tuneAluminum(mat);
    }
    });
  }, [gltf.scene]);



  /*Aluminum profile customizations*/ 

  const aluminumMats = useRef<Set<THREE.MeshStandardMaterial>>(new Set());
  useEffect(() => {
    const aSet = new Set<THREE.MeshStandardMaterial>();
    gltf.scene.traverse((o) => {
      const m: any = (o as any).material;
      const grab = (mat: any) => { if (isAluminum(mat) && mat.isMeshStandardMaterial) aSet.add(mat); };
      if (Array.isArray(m)) m.forEach(grab); else if (m) grab(m);
    });
    aluminumMats.current = aSet;
  }, [gltf.scene]);

  const finish = useSim(s => s.finish);
  function repaintShelfHinges(sample: THREE.MeshStandardMaterial | null) {
  if (!sample) return;
  const mats = shelfHingeMatsRef.current;
  if (!mats.length) return;

  mats.forEach(mm => {
    if (!origByMat_Shelf.has(mm)) {
      origByMat_Shelf.set(mm, (mm as THREE.Material).clone());
    }
    paintWithSample(sample, mm);
  });
}
  useEffect(() => {
  const mats = Array.from(aluminumMats.current);
  if (!mats.length) return;

  const myId = ++finishJobId.current; // mark this run as the latest

  (async () => {
    await applyFinishToMats(mats, finish as FinishName, aniso);
    if (myId !== finishJobId.current) return; // stale run → bail

    const sample = mats[0] ?? null;
    lastAluminumSample.current = sample;
    
    if (sample && fixBarMode === 'finish') {
      // repaint already-collected Fixing Bar materials with the new finish
      fixBarMatsRef.current.forEach(mm => paintWithSample(sample, mm));
    }

    // repaint any swapped handles with fresh sample
    if (sample && currentSwapRoots.current.size) {
      currentSwapRoots.current.forEach(root => applyFinishToNode(root, sample));
    }
    // repaint shelf (only mat__aluminum parts)
        if (sample && shelfRoot.current.children.length > 0) {
          applyFinishToNode(shelfRoot.current, sample, isMat__Aluminum);
        }

        // ✅ NEW: immediately repaint hinges/fix bars if their mode is “finish”
        if (sample && shelfMode === 'finish')  repaintShelfHinges(sample);
      })();


}, [gltf.scene, finish, aniso]);



// Remember original handle material & the swapped handle's aluminum mats
const lastAluminumSample = useRef<THREE.MeshStandardMaterial | null>(null);

function copyFinishFromSample(sample: THREE.MeshStandardMaterial, targets: THREE.MeshStandardMaterial[]) {
  targets.forEach(t => {
    t.copy(sample);
    t.color.copy(sample.color);
    (t as any).envMapIntensity = (sample as any).envMapIntensity ?? 1.0;
    t.needsUpdate = true;
  });
}

// ===== HANDLE SWAP (preserve animated node "Handle") =====
const handleUrl = useSim(s => s.handleUrl);
const handleDepth = useSim(s => s.handleDepth); // you already have this in state
const hasFlipToken = (s: string) => /\bflip\b/i.test(s); // matches "...flip", "_flip", ".flip", etc.

// keep originals per mesh (material + drawRange)
const originalMatByMesh = useRef(new WeakMap<THREE.Mesh, THREE.Material|THREE.Material[]>());
const originalRangeByMesh = useRef(new WeakMap<THREE.Mesh, {start:number,count:number}>());

useEffect(() => {
  const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');

  // top-level “Handle*” nodes (so we attach the swap to the handle node itself)
  const roots: THREE.Object3D[] = [];
  gltf.scene.traverse(o => {
    const n = norm(o.name);
    if (!n.startsWith('handle')) return;
    if (n.startsWith('handleswap')) return; // never touch our injected kid
    const pn = norm(o.parent?.name || '');
    if (pn.startsWith('handle') && !pn.startsWith('handleswap')) return; // keep topmost
    roots.push(o);
  });
  if (!roots.length) return;

  // helpers ---------------------------------------------------------------
  const clearPreviousSwap = (root: THREE.Object3D) => {
    for (let i = root.children.length - 1; i >= 0; i--) {
      const c = root.children[i];
      if (norm(c.name).startsWith('handleswap')) {
        root.remove(c);
        // NEW: ensure it’s no longer tracked
        currentSwapRoots.current.delete(c);
      }
    }
  };

  const hideOriginalGeometry = (root: THREE.Object3D) => {
    root.traverse(n => {
      if (!(n as any).isMesh) return;
      const m = n as THREE.Mesh;
      // remember original material
      if (!originalMatByMesh.current.has(m)) originalMatByMesh.current.set(m, m.material);
      // remember original draw range (if any)
      const geo: any = m.geometry;
      if (geo?.drawRange) {
        const { start, count } = geo.drawRange;
        if (!originalRangeByMesh.current.has(m)) originalRangeByMesh.current.set(m, { start, count });
      }
      // 1) zero the draw range (safe even if shared material)
      if (geo?.setDrawRange) geo.setDrawRange(0, 0);
      // 2) swap to a cloned material flagged invisible (so the mesh stays “visible:true”)
      const cloneOne = (mat: THREE.Material) => {
        const c = mat.clone() as any;
        c.visible = false;
        return c as THREE.Material;
      };
      m.material = Array.isArray(m.material)
        ? m.material.map(cloneOne)
        : cloneOne(m.material as THREE.Material);
    });
  };

  const restoreOriginalGeometry = (root: THREE.Object3D) => {
    root.traverse(n => {
      if (!(n as any).isMesh) return;
      const m = n as THREE.Mesh;
      const origMat = originalMatByMesh.current.get(m);
      if (origMat) m.material = origMat;
      const origRange = originalRangeByMesh.current.get(m);
      const geo: any = m.geometry;
      if (geo?.setDrawRange) {
        if (origRange) geo.setDrawRange(origRange.start, origRange.count);
        else geo.setDrawRange(0, Infinity);
      }
    });
  };

  const applyAluminumFinish = (node: THREE.Object3D) => {
    const sample = lastAluminumSample.current;
    if (!sample) return;
    const targets: THREE.MeshStandardMaterial[] = [];
    node.traverse(x => {
      const mat: any = (x as any).material;
      const grab = (mm: any) => { if (mm?.isMeshStandardMaterial && isAluminum(mm)) targets.push(mm); };
      Array.isArray(mat) ? mat.forEach(grab) : grab(mat);
    });
    targets.forEach(t => {
      t.copy(sample);
      t.color.copy(sample.color);
      (t as any).envMapIntensity = (sample as any).envMapIntensity ?? 1.0;
      t.needsUpdate = true;
    });
  };
  // ----------------------------------------------------------------------

  // “default handle” selected → put originals back
  if (!handleUrl) {
    roots.forEach(r => { clearPreviousSwap(r); restoreOriginalGeometry(r); });
    return;
  }

  const loader = new GLTFLoader();
  let cancelled = false;

  loader.load(
    handleUrl, // e.g. "/handles/Handle_2.glb"
    src => {
      if (cancelled) return;

      roots.forEach(r => {
        clearPreviousSwap(r);
        hideOriginalGeometry(r);

        const swap = src.scene.clone(true);
        swap.name = 'HandleSwapRoot';
        
        // --- token-based flip/offset ---------------------------------------------
        const rawLower = (r.name || '').trim().toLowerCase();

        // Only long grab handles (5–7) need flipping logic.
        // If you want it for all, you can drop the isGrabHandle guard.
        const isGrabHandle = /handle_(5|6|7)(?:\.glb)?$/i.test(handleUrl ?? '');

        // Flip tokens: "_flip", "_flipx", "_flipz"
        const hasFlip = /(^|[^a-z])flip([^a-z]|$)/i.test(rawLower);
        const flipX   = /(^|[^a-z])flipx([^a-z]|$)/i.test(rawLower);
        const flipZ   = /(^|[^a-z])flipz([^a-z]|$)/i.test(rawLower);

        const flipAxis: 'x' | 'z' | null = isGrabHandle
          ? (flipX ? 'x' : (flipZ || hasFlip ? 'z' : null))
          : null;

        // Optional extra standoff in mm via "_dNN" (e.g. _d6)
        const depthTok = rawLower.match(/(^|[^a-z])d(\d+(?:\.\d+)?)([^a-z]|$)/i);
        const extraDepthMM = depthTok ? parseFloat(depthTok[2]) : 0;

        // Reset transform
        swap.position.set(0, 0, 0);
        swap.rotation.set(0, 0, 0);
        swap.scale.set(1, 1, 1);

        // Apply flip when requested
        if (flipAxis === 'x') swap.rotateX(Math.PI);
        if (flipAxis === 'z') swap.rotateZ(Math.PI);

        // Single outward offset (no double-translate)
        const DOT_EXTRA = 0.04; // small stand-off for grab handles when flipped
        const base = handleDepth;
        const extraMeters = (extraDepthMM / 1000) + (flipAxis ? DOT_EXTRA : 0);
        const d = base + extraMeters;
        if (d) swap.translateY(d);
        // attach and paint
        r.add(swap);
        currentSwapRoots.current.add(swap);
        applyFinishToNode(swap, lastAluminumSample.current);
      });
    },
    undefined,
    e => console.error('Handle load error:', e)
  );

  return () => { cancelled = true; };
}, [handleUrl, handleDepth, gltf.scene]);

// ===== SERIGRAPHY APPLY (by MT_silkscreen or glass_silk_*) =====
const silk = useSim((s) => s.silk);

useEffect(() => {
  const outers =  outerGlass.current;
  if (!outers.length) return;
  const removeOverlay = (outer: THREE.Mesh) => {
    const old = outer.getObjectByName('SilkOverlay') as THREE.Mesh | null;
    if (old) old.parent?.remove(old);
  };

  // if no silk → remove overlays and stop
  if (!silk?.url) {
    outers.forEach(removeOverlay);
    return;
  }
  if (silk?.url && glassFinish !== 'transparent') {
    setGlassFinish('transparent');
    return; // the effect will re-run with transparent selected
  }

  new THREE.TextureLoader().load(silk.url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

    const inkMat = new THREE.MeshStandardMaterial({
      name: 'SilkOverlayMat',
      map: tex,                       // PNG color + alpha
      color: 0xc9ced3,                // light grey (less white)
      transparent: true,
      alphaTest: 0.5,                 // crisp mask edges (keeps it stable)
      side: THREE.DoubleSide,
      metalness: 0.0,
      roughness: 0.9,                 // much more matte → “fosco”
      envMapIntensity: 0.0,           // no shiny reflections on the ink
      opacity: 0.95,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    outers.forEach((outer) => {
      // hard-stop any acrylic leftovers
      clearAcrylicMapsButKeepBase(outer);
      // ✅ re-assert current glass type immediately so “Fosco” stays frosted
      applyGlassFinishNow(outer.material as THREE.MeshPhysicalMaterial, glassFinish);

      removeOverlay(outer);
      const overlay = new THREE.Mesh(outer.geometry, inkMat);
      overlay.name = 'SilkOverlay';
      overlay.renderOrder = (outer.renderOrder ?? 1) + 0.01;
      outer.add(overlay);
    });
  });
}, [silk?.url, glassFinish, gltf.scene]);

  // Collect unique Glass_material (MeshPhysicalMaterial) for acrylic tweaks
  const glassMats = useRef<THREE.MeshPhysicalMaterial[]>([]);

useEffect(() => {
  const set = new Set<GlassMesh>();
  gltf.scene.traverse((o) => {
    const m: any = (o as any).material;
    const grab = (mat: any) => {
      if (isGlass(mat) && mat.isMeshPhysicalMaterial && isPanelGlassMat(mat) && !isUnderShelf(o)) {
        set.add(o as GlassMesh);             // ← do not treat shelf as “outer glass”
      }
    };
    if (Array.isArray(m)) m.forEach(grab); else if (m) grab(m);
  });
  outerGlass.current = [...set];
}, [gltf.scene]);


// ===== ACRYLIC: apply patterns to Glass_material =====
const removeSilkOverlayFrom = (mesh: THREE.Mesh) => {
  // try on this mesh
  let node = mesh.getObjectByName('SilkOverlay') as THREE.Mesh | null;
  // if not found, try on its parent (outer), in case 'mesh' is the inner shell
  if (!node && mesh.parent) {
    node = (mesh.parent as THREE.Object3D).getObjectByName('SilkOverlay') as THREE.Mesh | null;
  }
  if (node) node.parent?.remove(node);
};

const acrylic = useSim(s => s.acrylic);

useEffect(() => {
  const outers =  outerGlass.current;
  if (!outers.length) return;

  const loader = new THREE.TextureLoader();
  const loadLinear = (url: string) =>
    new Promise<THREE.Texture>((res, rej) => {
      loader.load(
        url,
        (t) => {
          // normals/roughness/thickness are linear
          t.colorSpace = THREE.LinearSRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(3, 3);                     // make the pattern obvious; tweak
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.generateMipmaps = true;
          res(t);
        },
        undefined,
        rej
      );
    });
// CLEAR branch
  if (acrylic === 'clear') {
    outers.forEach(outer => {
      removeSilkOverlayFrom(outer); // exclusivity
      resetToClearGlass(outer);     // full material reset
      const inner = innerByOuter.current.get(outer);
      const om = outer.material as THREE.MeshPhysicalMaterial;
      om.normalMap = null;
      om.roughnessMap = null as any;
      (om as any).thicknessMap = null as any;
      (om as any).clearcoatNormalMap = null as any;
      om.roughness = 0.02;
      om.transmission = 1.0;
      om.needsUpdate = true;
      if (inner) inner.visible = false;
    });
    return;
  }

  
  if (acrylic === 'aguaviva') {
    Promise.all([
      loadLinear('/acrylics/aguaviva/normal.png'),
      loadLinear('/acrylics/aguaviva/roughness.png'),
    ]).then(([n, r]) => {
      const strength = 1.6;
      const maxT = 0.003;
      const atten = 0.6;

      outers.forEach(outer => {
        removeSilkOverlayFrom(outer);            // ← ensure exclusivity
        const inner = ensureInnerShellFor(outer);
        inner.visible = true;

        const apply = (m: THREE.MeshPhysicalMaterial, flipY = false) => {
           // 1) surface relief
          m.normalMap = n;
          m.normalScale.set(strength, flipY ? -strength : strength);

          // 2) micro-roughness variation (keeps it visible when static)
          m.roughnessMap = r;
          m.roughness = 0.12;           // 0.10–0.16 works well

          // 3) keep transmission crystal clear (no absorption)
          m.transmission = 1.0;
          m.thickness = 0.004;          // real pane thickness only
          m.attenuationColor.set(0xffffff);
          m.attenuationDistance = 100;  // large = no “milky” absorption

          // optional: nice specular sparkle from the relief
          m.clearcoat = 0.6;
          m.clearcoatRoughness = 0.08;
          (m as any).clearcoatNormalMap = n;

          (m as any).envMapIntensity = 1.4;
          m.metalness = 0.0;
          m.needsUpdate = true;
        };

        apply(outer.material as THREE.MeshPhysicalMaterial, false);
        const im = inner.material as THREE.MeshPhysicalMaterial;
        im.copy(outer.material);
        im.side = THREE.BackSide;
        im.polygonOffset = true;
        im.polygonOffsetFactor = -0.5;
        apply(im, true);
      });
    });
  }
}, [acrylic, gltf.scene]);

useEffect(() => {
  const targets: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    if (!(o as any).isMesh) return;
    const name = (o as THREE.Object3D).name || '';
    const isMirror = /\bmirror\b/i.test(name);            // "Mirror", "Round mirror", etc.
    const looksLikeBack = /\bled\b|light|back|\.00\d\b/i.test(name);
    if (isMirror && !looksLikeBack) targets.push(o as THREE.Mesh);
  });
  if (!targets.length) return;

  const makeMat = () => {
    const m = new THREE.MeshPhongMaterial({
      color: 0xb3bac2,
      shininess: 6,
      specular: 0x111111,
    });
    // kill IBL/PMREM so HDRI doesn’t show up
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        `
        #include <lights_fragment_begin>
        reflectedLight.indirectDiffuse  = vec3(0.10);
        reflectedLight.indirectSpecular = vec3(0.0);
        `
      );
    };
    return m;
  };

  targets.forEach((mesh) => {
    if (Array.isArray(mesh.material)) {
      mesh.material = (mesh.material as THREE.Material[]).map(() => makeMat());
    } else {
      mesh.material = makeMat();
    }
  });
}, [gltf.scene, model, stage]);

// Glass finishes


useEffect(() => {
  const outers = outerGlass.current;
  if (!outers.length) return;

  // Only drive base glass when acrylic is "clear"
  if (acrylic !== 'clear') return;

  outers.forEach((outer) => {
    const m = outer.material as THREE.MeshPhysicalMaterial;

    if (glassFinish === 'transparent') {
      // baseline clear (match your tuneGlass vibe)
      m.roughness = 0.02;
      m.transmission = 1.0;
      m.clearcoat = 0.5;
      m.clearcoatRoughness = 0.06;
      (m as any).envMapIntensity = 1.2;
      m.needsUpdate = true;
    } else {
      // frosted look
      outerGlass.current.forEach((outer) => {
      // remove overlay if present
      const overlay = outer.getObjectByName('SilkOverlay') as THREE.Mesh | null;
      if (overlay) overlay.parent?.remove(overlay);

      // ensure frosted look is actually applied
      // (use whichever you’re using: applyFrostedOuter or applyFrostedTransmission)
      applyFrostedOuter(outer as any);
    });
      
    }
  });
}, [glassFinish, acrylic, gltf.scene]);

  // ---- S H E L F   L O G I C  (top-level effect; NOT nested) ----
  const shelfMode = useSim(s => s.shelfMetalColor);
  useEffect(() => {
    const root = shelfRoot.current;
    if (!root) return;

    // Show / hide
    if (shelfCorner === 0) {
      root.visible = false;
      return;
    }
    root.visible = true;

    // Ensure a single child exists
    if (root.children.length === 0) {
      const shelfClone = shelfGltf.scene.clone(true);
      shelfClone.name = 'CornerShelf';
      root.add(shelfClone);

      // Paint only mat__aluminum parts of the shelf with the current finish on spawn
      if (lastAluminumSample.current) {
        applyFinishToNode(shelfClone, lastAluminumSample.current, isMat__Aluminum);
      }
    }

    // Position/orientation from preset
    // Position/orientation from preset
    const preset = getShelfPresetForModel(model);
    const wantCorner2 = (shelfCorner === 2);
    const rawPose = wantCorner2 ? (preset.corner2 ?? preset.corner1) : preset.corner1;

    // Normalize (handles legacy tiltX → rotX + defaults)
    const pose = {
      rotX: (rawPose as any).rotX ?? (rawPose as any).tiltX ?? -Math.PI / 2,
      rotY: (rawPose as any).rotY ?? 0,
      rotZ: (rawPose as any).rotZ ?? 0,
      ...rawPose
    };

    // Reset transform first
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);

    // Apply rotations in one go
    root.rotation.set(pose.rotX, pose.rotY, pose.rotZ);

    // Optional “invert” for corner 2
    if (wantCorner2 && pose.flipOnCorner2) {
      root.rotateY(Math.PI);
      root.rotateZ(Math.PI);
    }

    // Stage 2: allow a different Z for Corner 1
    const useZ = (stage === 2 && (pose as any).zStage2 !== undefined)
      ? (pose as any).zStage2
      : pose.pos[2];

    root.position.set(pose.pos[0], pose.pos[1], useZ);

    // Optional nudge for Corner 2
    if (wantCorner2 && pose.corner2Offset) {
      const [ox, oy, oz] = pose.corner2Offset;
      root.position.add(new THREE.Vector3(ox, oy, oz));
    }

    const s = pose.scale ?? 1;
    root.scale.set(s, s, s);
  }, [model, stage, shelfCorner, shelfGltf.scene, shelfMode]);

  useEffect(() => {
    const mats: any[] = [];
    const root = shelfRoot.current;
    if (!root) { shelfHingeMatsRef.current = []; return; }

    root.traverse(o => {
      if (!(o as any).isMesh) return;
      if (!isShelfHingeName(o.name)) return;                // only shelf_hinge*
      const m: any = (o as any).material;
      const push = (mm: any) => { if (isShelfFixMat(mm)) mats.push(mm); }; // only "alum"
      Array.isArray(m) ? m.forEach(push) : push(m);
    });

  shelfHingeMatsRef.current = mats;
}, [shelfGltf.scene, shelfCorner]);

  /*Fixing Bar and Shelf Hinge colors*/

// We store exact meshes + slots to change, and original materials to restore.
const isFixBarAncestor = (obj: THREE.Object3D | null) => {
  const re = /\b(fix(ing)?[\s_-]*bar|fixbar|barra\s*fixa|barra\s*de\s*fixa[cç][aã]o)\b/i;
  while (obj) {
    if (re.test(obj.name ?? '')) return true;
    obj = obj.parent as any;
  }
  return false;
};
// materials we’ll repaint in place
const fixBarMatsRef = useRef<any[]>([]);
const setHasFixingBar = useSim(s => s.setHasFixingBar);
const setFixBarColor  = useSim(s => s.setFixBarColor);
// scan once per scene change
useEffect(() => {
  // clear previous cache whenever the scene object changes
  fixBarMatsRef.current = [];

  const mats: any[] = [];
  const looksLikeBar = (name: string) =>
    /\b(bar|barra|fixbar|fix[-_\s]*bar|barra\s*fixa|barra\s*de\s*fixa[cç][aã]o)\b/i.test(name);

  gltf.scene.traverse(o => {
    if (!(o as any).isMesh) return;

    const ok = isFixBarAncestor(o) || looksLikeBar(o.name ?? '');
    if (!ok) return;

    const m: any = (o as any).material;
    const pushIf = (mm: any) => { if (isShelfFixMat(mm)) mats.push(mm); };
    Array.isArray(m) ? m.forEach(pushIf) : pushIf(m);
  });

  fixBarMatsRef.current = mats;
  const has = mats.length > 0;
  setHasFixingBar(has);
  if (!has) setFixBarColor('default');

  // no explicit cleanup needed; next run clears the ref above
}, [gltf.scene, setHasFixingBar, setFixBarColor]);
// repaint / restore based on mode or finish change
const fixBarMode = useSim(s => s.fixBarColor); // 'standard' | 'finish'

useEffect(() => {
  const mats = fixBarMatsRef.current;
  if (!mats.length) return;

  const sample = lastAluminumSample.current;
  if (fixBarMode === 'finish' && sample) {
    mats.forEach(mm => {
      if (!origByMat_FixBar.has(mm)) {
        origByMat_FixBar.set(mm, (mm as THREE.Material).clone());
      }
      paintWithSample(sample, mm); // ← in-place copy of look
    });
  } else {
    mats.forEach(mm => restoreFromSnapshot(mm, origByMat_FixBar.get(mm)));
  }
}, [fixBarMode, finish, gltf.scene]);


  useEffect(() => {
    const mats = shelfHingeMatsRef.current;
    if (!mats.length) return;

    const sample = lastAluminumSample.current;
    if (shelfMode === 'finish' && sample) {
      mats.forEach(mm => {
        if (!origByMat_Shelf.has(mm)) {
          origByMat_Shelf.set(mm, (mm as THREE.Material).clone()); // snapshot once
        }
        paintWithSample(sample, mm);                                // copy look now
      });
    } else {
      // restore original materials on "Padrão"
      mats.forEach(mm => restoreFromSnapshot(mm, origByMat_Shelf.get(mm)));
    }
  }, [shelfMode, finish, shelfGltf.scene, shelfCorner]);

    return <primitive object={gltf.scene} dispose={null} />;
  }


// after:
function FixedCamera({
  controlsRef,
  preset,
}: {
  controlsRef: React.RefObject<any>;
  preset: ReturnType<typeof getPresetForModel>;
}) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    // 1) place the camera
    camera.position.set(...preset.overview.pos);
    camera.updateProjectionMatrix();

    // 2) set OrbitControls target (this is what really matters)
    const ctrls = controlsRef.current;
    if (ctrls) {
      ctrls.target.set(...preset.overview.look);
      ctrls.update();
    } else {
      camera.lookAt(new THREE.Vector3(...preset.overview.look));
    }
  }, [camera, controlsRef, preset]);

  return null;
}

function clampPoseToDistance(
  pose: { pos: [number, number, number]; look: [number, number, number] },
  minD: number,
  maxD: number
) {
  const p = new THREE.Vector3(...pose.pos);
  const l = new THREE.Vector3(...pose.look);
  const dist = p.distanceTo(l);
  const d = THREE.MathUtils.clamp(dist, minD, maxD);
  if (Math.abs(d - dist) < 1e-4) return pose; // already OK
  const newPos = l.clone().add(p.sub(l).setLength(d)).toArray() as [number, number, number];
  return { pos: newPos, look: pose.look };
}

export default function Viewer() {
  const controlsRef = useRef<any>(null);
  const [mode, setMode] = React.useState<'overview' | 'shower'>('overview');
  const firstMount = useRef(true);
  const model = useSim(s => s.model);
  const preset = React.useMemo(() => getPresetForModel(model), [model]);
  const plannedDist = React.useMemo(() => {
    const p = new THREE.Vector3(...preset.shower.pose.pos);
    const l = new THREE.Vector3(...preset.shower.pose.look);
    return p.distanceTo(l);
  }, [preset]);

  const minDistance = preset.shower.minDistance ?? 0.07;
const maxDistance = preset.shower.maxDistance ?? Math.max(plannedDist + 0.01, 1.2);

  // Allow configuring per-model if you want; otherwise keep your current values
  const setFixBarColor     = useSim(s => s.setFixBarColor);     // 'default' | 'finish'
  const setShelfMetalColor = useSim(s => s.setShelfMetalColor); // 'default' | 'finish'
  useEffect(() => {
    // snap back to the model's overview when the model changes
    setMode('overview');
    window.dispatchEvent(new CustomEvent('go-to-cam-pose', {
      detail: { pos: preset.overview.pos, look: preset.overview.look, duration: 0.35 }
    }));
    setFixBarColor('default');
    setShelfMetalColor('default');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);
  const { min, max } = React.useMemo(
    () => clampBoxFrom(preset.shower.pose.look, preset.shower.clampExtents),
    [preset]
  );
  
useEffect(() => {
  const snap = firstMount.current;
  firstMount.current = false;

  if (mode === 'overview') {
    window.dispatchEvent(new CustomEvent('go-to-cam-pose', {
      detail: { pos: preset.overview.pos, look: preset.overview.look, duration: snap ? 0.0 : 0.6 }
    }));
  } else {
    // Clamp shower pose to OrbitControls limits so there's no post-anim snap
    const showerClamped = clampPoseToDistance(preset.shower.pose, minDistance, maxDistance);
    window.dispatchEvent(new CustomEvent('go-to-cam-pose', {
      detail: { pos: showerClamped.pos, look: showerClamped.look, duration: 0.6 }
    }));
  }
}, [mode, preset, minDistance, maxDistance]);

  const [animating, setAnimating] = React.useState(false);
  useEffect(() => {
    const start = () => setAnimating(true);
    const done  = () => setAnimating(false);
    window.addEventListener('cam-anim-start', start);
    window.addEventListener('cam-anim-done',  done);
    return () => {
      window.removeEventListener('cam-anim-start', start);
      window.removeEventListener('cam-anim-done',  done);
    };
  }, []);

  return (
    
    <div className="relative w-full h-[100vh]">
      {/* Return button */}
      {mode === 'shower' && (
        <button
          onClick={() => setMode('overview')}
          className="absolute left-3 top-3 z-50 px-3 py-1 rounded bg-black text-white/95 hover:bg-black/90"
        >
          Voltar
        </button>
      )}

      <Canvas className="absolute inset-0" dpr={[1.25, 2]} gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          // @ts-ignore
          gl.physicallyCorrectLights = true;
        }}
      >
        {/* Controls:
            - overview: locked (enabled=false)
            - shower: limited free movement */}
        <OrbitControls
          ref={controlsRef}
          enabled={true} //mode === 'shower' && !animating
          enablePan={true}
          // allow super close inspections
          /*minDistance={mode === 'shower' ? minDistance : 0.01}
          maxDistance={mode === 'shower' ? maxDistance  : 50}
          minPolarAngle={THREE.MathUtils.degToRad(35)}
          maxPolarAngle={THREE.MathUtils.degToRad(110)}
          zoomSpeed={1.2}
          rotateSpeed={0.95}*/
        />
        <FixedCamera controlsRef={controlsRef} preset={preset} />
        <CameraSnap controlsRef={controlsRef} />
        <CameraGoto controlsRef={controlsRef} />

        {/* Only allow double-click zooms while inside the shower view */}
        <ClickToZoom
          controlsRef={controlsRef}
          enabled={mode === 'shower'}
          min={min}
          max={max}
        />
        {/* Hotspot visible only in overview; clicking it enters shower mode */}
        <ShowerHotspot
          position={preset.hotspot}
          visible={mode === 'overview'}
          onClick={() => setMode('shower')}
        />


        {/* Clamp the target while in shower mode */}
       <ClampControls
          controlsRef={controlsRef}
          enabled={mode === 'shower' && !animating}
          min={min}
          max={max}
        />

        <Environment files="/hdris/bathroom_4k.hdr" background blur={0.35} />
        <Product />

        <EffectComposer multisampling={4} enableNormalPass={false}>
          <SMAA preset={SMAAPreset.HIGH} />
        </EffectComposer>
      </Canvas>
      <style jsx global>{`
        @keyframes hotspot-pulse {
          0%   { transform: scale(0.8); opacity: .7; }
          70%  { transform: scale(2.0); opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
    
  );
}

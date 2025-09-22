'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF, OrbitControls } from '@react-three/drei';
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

      if (duration <= 0) {
        camera.position.set(...pos);
        const tgt = controlsRef.current?.target;
        if (tgt) { tgt.set(...look); controlsRef.current.update(); }
        else { camera.lookAt(new THREE.Vector3(...look)); }
        return;
      }

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

    camera.position.lerpVectors(a.startP, a.endP, k);
    const tgt = controlsRef.current?.target;
    if (tgt) {
      tgt.lerpVectors(a.startL, a.endL, k);
      controlsRef.current.update();
    } else {
      const tmp = new THREE.Vector3().lerpVectors(a.startL, a.endL, k);
      camera.lookAt(tmp);
    }
    if (k >= 1) anim.current = null;
  });

  return null;
}

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


function Product() {

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

  type GlassMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;

  // Return all meshes that use a "glass-like" physical material right now
  function getGlassMeshes(): GlassMesh[] {
    const out: GlassMesh[] = [];
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat: any = (mesh as any).material;
      const pick = (m: any) => { if (m && isGlass(m) && m.isMeshPhysicalMaterial) out.push(mesh as GlassMesh); };
      Array.isArray(mat) ? mat.forEach(pick) : pick(mat);
    });
    return out;
  }

  const gltf = useGLTF('/glb/SCENE_1_BASE3.glb');

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

  // ===== ONE-TIME MATERIAL TUNING =====
  useEffect(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as any;
      if (!mat) return;

      if (isGlass(mat) && mat.isMeshPhysicalMaterial) {
        tuneGlass(mat);
        mat.side = THREE.FrontSide; // base glass, acrylics live here
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

  useEffect(() => {
    const mats = Array.from(aluminumMats.current);
    if (!mats.length) return;
    (async () => {
      await applyFinishToMats(mats, finish as FinishName, aniso);
    })();

    const name = finish as FinishName;
    const basePath = `/finishes/${name}/${name}`;

    const loader = new THREE.TextureLoader();
    const load = (url: string) =>
      new Promise<THREE.Texture | null>(resolve => {
        loader.load(
          url,
          t => {
            const isBase = url.toLowerCase().includes('basecolor');
            t.colorSpace = isBase ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;

            // quality to texture
            t.anisotropy = aniso;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            t.generateMipmaps = true;

            resolve(t);
          },
          undefined,
          () => resolve(null) // → treat as missing
        );
      });

    (async () => {
      const [map, normalMap, roughnessMap] = await Promise.all([
        load(`${basePath}_BaseColor.png`),
        load(`${basePath}_Normal.png`),
        load(`${basePath}_Roughness.png`),
      ]);

      const meta = FINISH_META[name] ?? {};
      const src = {
        base: map
          ? { source: 'file', detail: `${basePath}_BaseColor.png` }
          : meta.hex !== undefined
            ? { source: 'FINISH_META', detail: `hex=${meta.hex}` }
            : { source: 'default', detail: 'hex=#ffffff' },

        normal: normalMap
          ? { source: 'file', detail: `${basePath}_Normal.png` }
          : meta.normalScale !== undefined
            ? { source: 'FINISH_META', detail: `normalScale=${meta.normalScale}` }
            : { source: 'default', detail: 'no normal' },

        roughness: roughnessMap
          ? { source: 'file', detail: `${basePath}_Roughness.png` }
          : meta.roughness !== undefined
            ? { source: 'FINISH_META', detail: `roughness=${meta.roughness}` }
            : { source: 'default', detail: 'roughness=0.25' },

        metalness: (meta.metalness !== undefined)
          ? { source: 'FINISH_META', detail: `metalness=${meta.metalness}` }
          : { source: 'default', detail: 'metalness=0' },   // ← default non-metal
      } as const;

      if (DEBUG_FINISH_LOGS) {
        console.groupCollapsed(`%c[Finish] ${name}`, 'background:#111;color:#fff;padding:2px 6px;border-radius:4px');
        console.info('BaseColor →', src.base.source, '—', src.base.detail);
        console.info('Normal    →', src.normal.source, '—', src.normal.detail);
        console.info('Roughness →', src.roughness.source, '—', src.roughness.detail);
        console.info('Metalness →', src.metalness.source, '—', src.metalness.detail);
        console.groupEnd();
        console.log('[Acrylic]', acrylic, 'mats:', glassMats.current.length);
      }

      mats.forEach((m) => {
        // === Color & maps ===
        m.map = map || null;
        m.color.set(map ? '#ffffff' : (meta.hex ?? '#ffffff'));

        m.normalMap = normalMap || null;
        const ns = meta.normalScale ?? 0.3;
        m.normalScale = new THREE.Vector2(ns, ns);

        m.roughnessMap = roughnessMap || null;

        // === Material model ===
        const metallic = meta.metalness ?? 0;          // only Cromado/Anodizado = 1
        m.metalness = metallic;

        // Base roughness (if no map), with a floor to avoid sparkly pinprick highlights
        const baseR = meta.roughness ?? 0.25;
        m.roughness = roughnessMap ? m.roughness : baseR;

        // 👉 Clamp micro-roughness: a touch higher for metals reduces shimmer
        if (metallic) m.roughness = Math.max(m.roughness, 0.08);
        else          m.roughness = Math.max(m.roughness, 0.12);

        // Reflections: calmer for paint, punchier for chrome/anodized
        (m as any).envMapIntensity = metallic ? 1.1 : 0.85;

        // Small niceties
        m.dithering = true;                // reduces banding/temporal crawl
        m.side = THREE.FrontSide;
        m.needsUpdate = true;
      });
    })();
  }, [finish, aniso]);


// Remember original handle material & the swapped handle's aluminum mats
const originalHandleMats = useRef(new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>());
const swappedAluminumByHost = useRef(new WeakMap<THREE.Mesh, THREE.MeshStandardMaterial[]>());

function copyFinishFromSample(sample: THREE.MeshStandardMaterial, targets: THREE.MeshStandardMaterial[]) {
  targets.forEach(t => {
    // copy() clones most relevant props (including maps pointers)
    t.copy(sample);
    t.color.copy(sample.color);
    (t as any).envMapIntensity = (sample as any).envMapIntensity ?? 1.0;
    t.needsUpdate = true;
  });
}

// ===== HANDLE SWAP (preserve animated node "Handle") =====
const handleUrl = useSim((s) => s.handleUrl);

useEffect(() => {
  const restoreOriginalHandle = () => {
    gltf.scene.traverse((obj) => {
      if (obj.name !== 'Handle') return;
      const host = obj as THREE.Mesh;

      // Remove any swapped child
      for (let i = host.children.length - 1; i >= 0; i--) {
        const c = host.children[i];
        if (c.name === 'HandleMesh' || c.name?.startsWith('HandleSwap')) host.remove(c);
      }

      // Restore original material object (not a clone)
      const orig = originalHandleMats.current.get(host);
      if (orig) host.material = orig;

      // Re-enable drawing the original geometry
      const geo: any = host.geometry;
      if (geo?.setDrawRange) geo.setDrawRange(0, Infinity);

      // Remove the swapped handle's aluminum materials from the global Set
      const swapped = swappedAluminumByHost.current.get(host) || [];
      swapped.forEach(m => aluminumMats.current.delete(m));
      swappedAluminumByHost.current.delete(host);
    });
  };

  if (!handleUrl) { // “Default” selected
    restoreOriginalHandle();
    return;
  }

  const loader = new GLTFLoader();
  let cancelled = false;

  loader.load(
    handleUrl,
    async (h) => {
      if (cancelled) return;

      const replacement = h.scene;
      gltf.scene.traverse((obj) => {
        if (obj.name !== 'Handle') return;
        const host = obj as THREE.Mesh;

        // Store original material pointer once
        if (!originalHandleMats.current.has(host)) {
          originalHandleMats.current.set(host, host.material);
        }

        // Hide the original handle **geometry only** (keep material reference!)
        const geo: any = host.geometry;
        if (geo?.setDrawRange) geo.setDrawRange(0, 0);

        // Remove previous swap children
        for (let i = host.children.length - 1; i >= 0; i--) {
          const c = host.children[i];
          if (c.name === 'HandleMesh' || c.name?.startsWith('HandleSwap')) host.remove(c);
        }

        const offY =
          handleUrl === '/handles/Handle_2.glb' ? -0.020 /* your value */ : 0.0;

        // Add the new handle
        const newHandle = replacement.clone(true);
        newHandle.name = 'HandleMesh';
        newHandle.position.set(0, 0, 0);
        newHandle.quaternion.identity();
        newHandle.scale.set(1, 1, 1);
        newHandle.translateY(offY); // your offset
        host.add(newHandle);

        // Collect aluminum materials in the new handle
        const newAlu: THREE.MeshStandardMaterial[] = [];
        newHandle.traverse((o) => {
          const mat: any = (o as any).material;
          const grab = (m: any) => { if (m && isAluminum(m) && m.isMeshStandardMaterial) newAlu.push(m); };
          if (Array.isArray(mat)) mat.forEach(grab); else if (mat) grab(mat);
        });
        swappedAluminumByHost.current.set(host, newAlu);
        newAlu.forEach(m => aluminumMats.current.add(m));

        // Instant look – copy current finish from any existing aluminum mat
        const sample = Array.from(aluminumMats.current).find(m => newAlu.indexOf(m) === -1);
        if (sample) copyFinishFromSample(sample, newAlu);

        // And ensure full finish textures are applied (no-ops if same)
        applyFinishToMats(newAlu, finish as FinishName, aniso);
      });
    },
    undefined,
    (err) => console.error('Handle load error:', err)
  );

  return () => { cancelled = true; };
}, [handleUrl, gltf.scene, finish, aniso]);
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
      resetToClearGlass(outer);

      removeOverlay(outer);
      const overlay = new THREE.Mesh(outer.geometry, inkMat);
      overlay.name = 'SilkOverlay';
      overlay.renderOrder = (outer.renderOrder ?? 1) + 0.01;
      outer.add(overlay);
    });
  });
}, [silk?.url, gltf.scene]);

  // Collect unique Glass_material (MeshPhysicalMaterial) for acrylic tweaks
  const glassMats = useRef<THREE.MeshPhysicalMaterial[]>([]);

  useEffect(() => {
    const set = new Set<GlassMesh>();
    gltf.scene.traverse((o) => {
      const m: any = (o as any).material;
      const grab = (mat: any) => {
        if (isGlass(mat) && mat.isMeshPhysicalMaterial) set.add(o as GlassMesh);
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
  // Collect mirror meshes (skip your LED/back strip "Mirror.002")
  const targets: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    if (!(o as any).isMesh) return;
    const mesh = o as THREE.Mesh;
    const name = mesh.name || '';
    const parent = mesh.parent?.name || '';
    const mats = Array.isArray(mesh.material)
      ? (mesh.material as THREE.Material[])
      : [mesh.material as THREE.Material];

    const byMat = mats.some(m => m && m.name === 'Material.003');
    const byNode =
      /^Mirror(?!\.002)\b/i.test(name) || /^Mirror(?!\.002)\b/i.test(parent);

    if (byMat || byNode) targets.push(mesh);
  });
  if (!targets.length) {
    console.warn('[mirror] no meshes matched Mirror*/Material.003');
    return;
  }

  const makeMat = () => {
    const m = new THREE.MeshPhongMaterial({
  color: 0xb3bac2,  // mid grey
  shininess: 6,     // soft highlight from lights
  specular: 0x111111
});

    // Kill IBL (env) contribution AFTER lights are computed
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        `
        #include <lights_fragment_begin>
        // Remove all image-based lighting (scene.environment / PMREM)
        reflectedLight.indirectDiffuse  = vec3(0.10); // tiny ambient so it’s not black
        reflectedLight.indirectSpecular = vec3(0.0);  // no glossy env specular
        `
      );
    };

    // Safety: nothing that could reintroduce HDR or transparency
    (m as any).map = null;
    (m as any).normalMap = null;
    (m as any).roughnessMap = null;
    (m as any).metalnessMap = null;
    (m as any).alphaMap = null;

    return m;
  };

  targets.forEach((mesh) => {
    if (Array.isArray(mesh.material)) {
      mesh.material = (mesh.material as THREE.Material[]).map(() => makeMat());
    } else {
      mesh.material = makeMat();
    }
  });
}, [gltf.scene]);


  return <primitive object={gltf.scene} dispose={null} />;
}
useGLTF.preload('/glb/SCENE_1_BASE3.glb');

// Pick a pose that works for your room

// Pick a pose that works for your room
const CAM_POS: [number, number, number] = [0.667, 1.588, 2.036];
const CAM_LOOK: [number, number, number] = [0.570, 1.304, -0.389];

function FixedCamera({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    // 1) place the camera
    camera.position.set(...CAM_POS);
    camera.updateProjectionMatrix();

    // 2) set OrbitControls target (this is what really matters)
    const ctrls = controlsRef.current;
    if (ctrls) {
      ctrls.target.set(...CAM_LOOK);
      ctrls.update(); // apply immediately
    } else {
      // fallback if controls aren't mounted yet
      camera.lookAt(new THREE.Vector3(...CAM_LOOK));
    }
  }, [camera, controlsRef]);

  return null;
}

export default function Viewer() {

  const controlsRef = useRef<any>(null);
  return (
    <Canvas dpr={[1.25, 2]} gl={{ antialias: true }}
      onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      // @ts-ignore older three
      gl.physicallyCorrectLights = true;
    }}
    >


      <OrbitControls ref={controlsRef} enabled />
      <FixedCamera controlsRef={controlsRef} />
      <CameraSnap controlsRef={controlsRef} />
      <CameraGoto controlsRef={controlsRef} />
      <Environment files="/hdris/bathroom_4k.hdr" background blur={0.35} />
      <Product />

      <EffectComposer multisampling={4} enableNormalPass={false}>
        <SMAA preset={SMAAPreset.HIGH} />
      </EffectComposer>
    </Canvas>
  );
}

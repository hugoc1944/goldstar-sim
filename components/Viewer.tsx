'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { isAluminum, isGlass, isSilk, tuneAluminum, tuneGlass, tuneSilk } from '@/lib/materials';
import { useSim } from '@/state/sim';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FINISH_META } from '@/lib/finishes';
import type { FinishName } from '@/lib/finishes';
const DEBUG_FINISH_LOGS = true; // flip to false to silence logs

THREE.Cache.enabled = true;

function Product() {
  const gltf = useGLTF('/glb/SCENE_1_BASE.glb');

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
      if (isGlass(mat) && mat.isMeshPhysicalMaterial) tuneGlass(mat);
      else if (isSilk(mat) && mat.isMeshStandardMaterial) tuneSilk(mat);
      else if (isAluminum(mat) && mat.isMeshStandardMaterial) tuneAluminum(mat);

      if (mesh.name?.startsWith('glass_silk_') && mat?.isMeshStandardMaterial && !isSilk(mat)) {
        tuneSilk(mat);
      }
      if (isGlass(mat) && mat.isMeshPhysicalMaterial) {
        tuneGlass(mat);
        (obj as any).renderOrder = 1; // glass first
      }

      if (isSilk(mat) && mat.isMeshStandardMaterial) {
        tuneSilk(mat);
        (obj as THREE.Mesh).visible = false; // hidden by default
        (mat as any).depthWrite = false;     // never writes depth
        (obj as any).renderOrder = 2;        // drawn after glass
      }
    });
  }, [gltf.scene]);


// ===== HANDLE SWAP (preserve animated node "Handle") =====
const handleUrl = useSim((s) => s.handleUrl);

useEffect(() => {
  if (!handleUrl) return;

  // Per-handle local offsets [x,y,z] in meters (y = “forward” in your scene)
  const HANDLE_OFFSETS: Record<string, [number, number, number]> = {
    '/handles/Handle_2.glb': [0, 0.012, 0], // +1.2 cm along local Y
  };
  const DEFAULT_OFFSET: [number, number, number] = [0, 0.012, 0];

  const loader = new GLTFLoader();
  let cancelled = false;

  loader.load(
    handleUrl,
    (h) => {
      if (cancelled) return;
      const replacement = h.scene;
      const [dx, dy, dz] = HANDLE_OFFSETS[handleUrl] ?? DEFAULT_OFFSET;

      gltf.scene.traverse((obj) => {
        if (obj.name !== 'Handle') return;

        const mesh = obj as THREE.Mesh;
        const origMat: any = (mesh as any).material;

        // Clone materials so we hide only THIS mesh (shared mat with frame stays visible)
        if (origMat) {
          if (Array.isArray(origMat)) {
            (mesh as any).material = origMat.map((m: any) => {
              const c = m.clone(); c.visible = false; return c;
            });
          } else {
            (mesh as any).material = origMat.clone();
            ((mesh as any).material as any).visible = false;
          }
        }

        // Keep geometry but draw nothing (keeps boundingSphere intact)
        const geo: any = (mesh as any).geometry;
        if (geo?.setDrawRange) geo.setDrawRange(0, 0);

        // Remove any previous swapped child
        for (let i = obj.children.length - 1; i >= 0; i--) {
          const c = obj.children[i];
          if (c.name === 'HandleMesh' || c.name?.startsWith('HandleSwap')) obj.remove(c);
        }

        // Add the new handle as a child so it follows the animation
        const newHandle = replacement.clone(true);
        newHandle.name = 'HandleMesh';
        newHandle.position.set(0, 0, 0);
        newHandle.quaternion.identity();
        newHandle.scale.set(1, 1, 1);

        // Apply local offset (your scene uses Y as outward)
        if (dx) newHandle.translateX(dx);
        if (dy) newHandle.translateY(dy);
        if (dz) newHandle.translateZ(dz);

        obj.add(newHandle);
      });
    },
    undefined,
    (err) => console.error('Handle load error:', err)
  );

  return () => { cancelled = true; };
}, [handleUrl, gltf.scene]);

// ===== SERIGRAPHY APPLY (by MT_silkscreen or glass_silk_*) =====
const silk = useSim((s) => s.silk);
useEffect(() => {
  const isSilkMesh = (mesh: THREE.Mesh, mat: any) =>
    mesh.name?.startsWith('glass_silk_') || mat?.name === 'MT_silkscreen';

  // If URL is empty -> hide planes and clear the map (affects only the silk planes)
  if (!silk?.url) {
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat: any = (mesh as any).material;
      if (!mat) return;

      const clear = (m: any) => {
        if (!isSilkMesh(mesh, m)) return;
        // Hide this mesh so it contributes nothing
        mesh.visible = false;
        // Also clear any leftover map/state
        m.map = null;
        m.opacity = 0.0;
        m.transparent = true;
        m.depthWrite = false;
        m.needsUpdate = true;
      };

      Array.isArray(mat) ? mat.forEach(clear) : clear(mat);
    });
    return;
  }

  // Apply a PNG to the silk planes
  const tex = new THREE.TextureLoader().load(silk.url, () => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const [rx, ry] = silk.repeat ?? [1, 1];
    const [ox, oy] = silk.offset ?? [0, 0];
    tex.repeat.set(rx, ry);
    tex.offset.set(ox, oy);

    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat: any = (mesh as any).material;
      if (!mat) return;

      const apply = (m: any) => {
        if (!isSilkMesh(mesh, m)) return;
        // Make sure the plane renders and carries only the print
        mesh.visible = true;
        m.map = tex;
        m.color?.set?.(0xffffff);     // avoid tint
        m.transparent = true;
        m.opacity = silk.opacity ?? 1;
        m.roughness = silk.roughness ?? 0.2;
        m.depthWrite = false;
        m.alphaTest = 0.0;
        m.side = THREE.DoubleSide;    // visible from both directions
        (mesh as any).renderOrder = 2; // draw after the glass
        m.needsUpdate = true;
      };

      Array.isArray(mat) ? mat.forEach(apply) : apply(mat);
    });
  });
}, [silk?.url, silk?.opacity, silk?.roughness, silk?.repeat, silk?.offset, gltf.scene]);


  /*Aluminum profile customizations*/ 
   const aluminumMats = useRef<THREE.MeshStandardMaterial[]>([]);
  useEffect(() => {
    const aSet = new Set<THREE.MeshStandardMaterial>();
    gltf.scene.traverse((o) => {
      const m: any = (o as any).material;
      const grab = (mat: any) => { if (isAluminum(mat) && mat.isMeshStandardMaterial) aSet.add(mat); };
      if (Array.isArray(m)) m.forEach(grab); else if (m) grab(m);
    });
    aluminumMats.current = [...aSet];
  }, [gltf.scene]);

  const finish = useSim(s => s.finish);

useEffect(() => {
  const mats = aluminumMats.current;
  if (!mats.length) return;

  const name = finish as FinishName;
  const basePath = `/finishes/${name}/${name}`;

  const loader = new THREE.TextureLoader();
  const load = (url: string) =>
    new Promise<THREE.Texture | null>(resolve => {
      loader.load(
        url,
        t => {
          t.colorSpace = url.toLowerCase().includes('basecolor')
            ? THREE.SRGBColorSpace
            : THREE.LinearSRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
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
    }

    mats.forEach((m) => {
      // base color / albedo
      m.map = map || null;
      m.color.set(map ? '#ffffff' : (meta.hex ?? '#ffffff'));

      // normals
      m.normalMap = normalMap || null;
      const ns = meta.normalScale ?? 0.3;
      m.normalScale = new THREE.Vector2(ns, ns);

      // roughness
      m.roughnessMap = roughnessMap || null;
      m.roughness = roughnessMap ? m.roughness : (meta.roughness ?? 0.25);

      // ✅ metalness per finish (only Anodizado/Cromado = 1)
      const metallic = meta.metalness ?? 0;
      m.metalness = metallic;

      // reflection punch — stronger for metals
      (m as any).envMapIntensity = metallic ? 1.4 : 0.9;

      m.side = THREE.FrontSide;
      m.needsUpdate = true;
    });
  })();
}, [finish]);

  return <primitive object={gltf.scene} dispose={null} />;
}
useGLTF.preload('/glb/SCENE_1_BASE.glb');

export default function Viewer() {
  return (
    <Canvas camera={{ fov: 35, position: [3.8, 1.9, 4.2] }} dpr={[1, 2]} gl={{ antialias: true }}
      onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      // @ts-ignore older three
      gl.physicallyCorrectLights = true;
    }}
    >
      <ambientLight intensity={0.1} />
      <Environment files="/hdris/bathroom_4k.hdr" background blur={0.35} />
      <Product />

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={6}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.45}
      />
    </Canvas>
  );
}

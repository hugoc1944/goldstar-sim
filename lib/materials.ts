import * as THREE from 'three';

export const isAluminum = (m?: THREE.Material) =>
  !!m && 'name' in m && typeof (m as any).name === 'string' &&
  ((m as any).name === 'mat_aluminum' || (m as any).name?.startsWith('mat_aluminum'));

export const isGlass = (m?: THREE.Material) =>
  !!m && (m as any).name === 'Glass_material';

export const isSilk = (m?: THREE.Material) =>
  !!m && (m as any).name === 'MT_silkscreen';
export function tuneGlass(m: THREE.MeshPhysicalMaterial) {
  // Wipe any stray maps that can add haze
  (m as any).map = null;
  (m as any).roughnessMap = null;
  (m as any).metalnessMap = null;
  (m as any).alphaMap = null;

  m.color.set(0xffffff);
  m.metalness = 0.0;
  m.roughness = 0.0;             // razor-sharp highlights
  m.ior = 1.45;
  m.thickness = 0.004;           // ~4 mm
  m.attenuationColor = new THREE.Color(0xffffff);
  m.attenuationDistance = 100;   // essentially clear

  m.transparent = true;
  m.transmission = 1.0;          // max light through
  m.opacity = 1.0;

  // Let glass write to the depth buffer (prevents additive "fog")
  m.depthWrite = true;
  m.depthTest  = true;

  // Single-sided avoids double refractions from back faces
  m.side = THREE.FrontSide;

  // Nice, crisp env reflections
  (m as any).envMapIntensity = 1.6;
  m.clearcoat = 0.02;
  m.clearcoatRoughness = 0.02;

  // Optional new PBR params (if your three version supports them)
  (m as any).specularIntensity = 0.45;
  (m as any).specularColor = new THREE.Color(1, 1, 1);

  m.needsUpdate = true;
}

export function tuneSilk(m: THREE.MeshStandardMaterial) {
  m.transparent = true;
  m.opacity = 1.0;
  m.alphaTest = 0.0;
  m.depthWrite = false;
  m.side = THREE.FrontSide;    // silk planes face camera; front is enough
  m.roughness = 0.2;           // matte ink feel
  (m as any).envMapIntensity = 0.0;
  m.needsUpdate = true;
}

export function tuneAluminum(m: THREE.MeshStandardMaterial) {
  // Default “Cromado” if no texture customization yet
  m.metalness = 1.0;
  m.roughness = 0.04;
  (m as any).envMapIntensity = 1.0;
  m.needsUpdate = true;
}

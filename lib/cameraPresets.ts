// /lib/cameraPresets.ts
export type Vec3 = [number, number, number];

export type Pose = {
  pos: Vec3;
  look: Vec3;
};

export type ClampExtents = { x: number; y: number; z: number };

export type ShowerPreset = {
  pose: Pose;
  clampExtents: ClampExtents;     // how far the target is allowed to move around the shower
  minDistance?: number;           // optional per-model OrbitControls minDistance in shower mode
  maxDistance?: number;           // optional per-model OrbitControls maxDistance in shower mode
};

export type ModelPreset = {
  overview: Pose;                 // initial fixed camera
  shower: ShowerPreset;           // zoom-in pose/limits
  hotspot: Vec3;                  // where to render the pulsing button
};

// ---- Fill this map for your 22 models (same config applies to both scenes) ----
const PRESETS: Record<string, ModelPreset> = {
  // EXAMPLES (use your real model ids)
  DiplomataGold_V3: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.725, 1.310, 0.240],
        look: [0.717, 1.271, -0.510],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.72, 1.3, -0.15],
  },
// Pick a pose that works for your room

  Sterling_V1: {
    overview: {
      pos:  [-0.641, 1.414,  1.840],
      look: [0.159, 1.133, -0.589],
    },
    shower: {
      pose: {
        pos:  [-0.291, 1.404, 0.648],
        look: [0.465, 1.213, -0.680],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.61, 1.28, -0.18],
  },

  // …add your other 20 models here…
};

// A sensible fallback if a model is missing above:
const DEFAULT_PRESET: ModelPreset = {
  overview: {
    pos:  [0.450, 1.511, 0.544],
    look: [0.473, 1.471, -0.355],
  },
  shower: {
    pose: {
      pos:  [0.725, 1.310, 0.240],
      look: [0.717, 1.271, -0.510],
    },
    clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
    minDistance: 0.07,
    maxDistance: 1.2,
  },
  hotspot: [0.72, 1.20, -0.15],
};

export function getPresetForModel(modelId: string): ModelPreset {
  // key lookup is case-sensitive; normalize if you want
  return PRESETS[modelId] ?? DEFAULT_PRESET;
}

// Convenience: turn clamp extents into a min/max AABB around a look point
export function clampBoxFrom(look: Vec3, e: ClampExtents) {
  const min: Vec3 = [look[0] - e.x, look[1] - e.y, look[2] - e.z];
  const max: Vec3 = [look[0] + e.x, look[1] + e.y, look[2] + e.z];
  return { min, max };
}

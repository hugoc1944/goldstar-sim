// /lib/cameraPresets.ts
import * as THREE from 'three';
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
  azimuth?: { min: number; max: number }; // radians, optional (limits left/right rotation)
  polar?:   { min: number; max: number }; // up/down  (radians)
};

export type ModelPreset = {
  overview: Pose;                 // initial fixed camera
  shower: ShowerPreset;           // zoom-in pose/limits
  hotspot: Vec3;                  // where to render the pulsing button
};

// ---- Fill this map for your 22 models (same config applies to both scenes) ----
const PRESETS: Record<string, ModelPreset> = {
  // EXAMPLES (use your real model ids)
  DiplomataGold_V1: {
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
  DiplomataGold_V2: {
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
  DiplomataGold_V4: {
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
  DiplomataGold_V5: {
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
  /*// Pick a pose that works for your room
// Pick a pose that works for your room
const CAM_POS: [number, number, number] = [-0.679, 1.398, 0.984];
const CAM_LOOK: [number, number, number] = [0.419, 1.193, -0.681];*/
  DiplomataGold_V6: {
    overview: {
      pos:  [-0.641, 1.414,  1.840],
      look: [0.159, 1.133, -0.589],
    },
    shower: {
      pose: {
        pos:  [-0.129, 1.424, 1.016],
        look: [0.465, 1.213, -0.680],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.61, 1.28, -0.18],
  },
  DiplomataGold_V7: {
    overview: {
      pos:  [-0.641, 1.414,  1.840],
      look: [0.159, 1.133, -0.589],
    },
    shower: {
      pose: {
        pos:  [-0.679, 1.398, 0.984],
        look: [0.419, 1.193, -0.681],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.61, 1.28, -0.18],
  },
  DiplomataGold_V8: {
    overview: {
      pos:  [-0.641, 1.414,  1.840],
      look: [0.159, 1.133, -0.589],
    },
    shower: {
      pose: {
        pos:  [-0.129, 1.424, 1.016],
        look: [0.465, 1.213, -0.680],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.61, 1.28, -0.18],
  },
  DiplomataGold_V9: {
    overview: {
      pos:  [-0.641, 1.414,  1.840],
      look: [0.159, 1.133, -0.589],
    },
    shower: {
      pose: {
        pos:  [-0.214, 1.402, 0.889],
        look: [0.457, 1.225, -0.683],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.61, 1.28, -0.18],
  },// Pick a pose that works for your room
  DiplomataGold_V10: {
    overview: {
      pos:  [1.336, 1.529, 1.734],
      look: [0.457, 1.225, -0.683],
    },
    shower: {
      pose: {
        pos:  [0.514, 1.417, 1.103],
        look: [0.471, 1.194, -0.679],
      },
      clampExtents: { x: 0.18, y: 0.15, z: 0.10 },
      minDistance: 0.07,
      maxDistance: 1.8,// Pick a pose that works for your room
      azimuth: { min: -0.55, max: 0.55 },      // optional: limit rotation ±31°
      polar:   { min: THREE.MathUtils.degToRad(75), max: THREE.MathUtils.degToRad(110) },
    },
    hotspot: [0.61, 1.28, -0.18],
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
  Sterling_V2: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.725, 1.310, 0.240],
        look: [0.717, 1.271, -0.510],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.61, 1.28, -0.18],
  },
  Sterling_V3: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.725, 1.310, 0.240],
        look: [0.717, 1.271, -0.510],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.61, 1.28, -0.18],
  },
  Sterling_V4: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {/*// Pick a pose that works for your room
// Pick a pose that works for your room
const CAM_POS: [number, number, number] = [0.786, 1.302, 1.277];
const CAM_LOOK: [number, number, number] = [0.792, 1.242, -0.354];;*/
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.95, 1.28, -0.18],
  },

  //Europa// Pick a pose that works for your room// Pick a pose that works for your room
  Europa_V1: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.688, 1.371, 0.220],
        look: [0.686, 1.322, -0.333],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.72, 1.3, -0.15],
  },// Pick a pose that works for your room
  Europa_V2: {
    overview: {
      pos:  [-0.996, 1.499, 1.978],
      look: [0.075, 1.366, -0.356],
    },
    shower: {
      pose: {
        pos:  [0.659, 1.392, 1.278],
        look: [0.679, 1.183, -0.506],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.7,
    },
    hotspot: [0.66, 1.3, -0.15],
  },
  // Pick a pose that works for your room
  Europa_V3: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
  },
  Europa_V4: {
    overview: {
      pos:  [-0.996, 1.499, 1.978],
      look: [0.075, 1.366, -0.356],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.60, 1.28, -0.18],
  },
  //Strong
  Strong_V1: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.688, 1.371, 0.220],
        look: [0.686, 1.322, -0.333],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.72, 1.3, -0.15],
  },// Pick a pose that works for your room
  Strong_V2: {
    overview: {
      pos:  [0.405, 1.460, 2.350],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.688, 1.371, 0.220],
        look: [0.686, 1.322, -0.333],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.2,
    },
    hotspot: [0.66, 1.3, -0.15],
  },
  // Pick a pose that works for your room
  Strong_V3: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
  },
  Strong_V4: {
    overview: {
      pos:  [-0.996, 1.499, 1.978],
      look: [0.075, 1.366, -0.356],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.60, 1.28, -0.18],
  },
  //Painel Fixo

  PainelFixo_V1: {
    overview: {
      pos:  [-0.420, 1.558, 2.200],
      look: [0.473, 1.536, -0.355],
    },
    shower: {
      pose: {
        pos:  [0.222, 1.548, 1.127],
        look: [0.686, 1.322, -0.333],
      },
      clampExtents: { x: 0.25, y: 0.20, z: 0.25 },
      minDistance: 0.07,
      maxDistance: 1.8,
    },
    hotspot: [0.72, 1.3, -0.15],
  },
  //Painel
  Painel_V1: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
  },
  Painel_V2: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
  },
  Painel_V3: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
  },
  Painel_V4: {
    overview: {
      pos:  [-0.798, 1.453, 2.037],
      look: [0.480, 1.359, -0.347],
    },
    shower: {
      pose: {
        pos:  [0.786, 1.302, 1.277],
        look: [0.792, 1.242, -0.354],
      },
      clampExtents: { x: 0.28, y: 0.22, z: 0.28 },
      minDistance: 0.07,
      maxDistance: 1.9,
    },
    hotspot: [0.63, 1.28, -0.18],
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

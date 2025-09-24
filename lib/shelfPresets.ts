export type Vec3 = [number, number, number];

export type ShelfCornerPose = {
  pos: Vec3;          // world/scene coords (same for Stage 1 & 2 of a model)
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: number;     // optional uniform scale
  tiltX?: number;             // keep supporting this (defaults to -Math.PI/2)
  flipOnCorner2?: boolean;    // if Canto 2 is picked, add a 180° yaw
  corner2Offset?: [number, number, number]; // extra nudge on Canto 2
  zStage2?: number;
};

export type ShelfPreset = {
  allowCorner2: boolean;
  corner1: ShelfCornerPose;      // required
  corner2?: ShelfCornerPose;     // optional (only if allowCorner2)
};

// === Fill these with your real numbers per model ===
// (examples shown for 2 models; copy/paste for the other 20)
/*// Pick a pose that works for your room
const CAM_POS: [number, number, number] = [0.725, 1.530, 0.662];
const CAM_LOOK: [number, number, number] = [0.717, 1.271, -0.510];*/
const PRESETS: Record<string, ShelfPreset> = {
  DiplomataGold_V3: {
    allowCorner2: true,
    corner1: { pos: [1.455, 1.230, -2.415], zStage2: -2.135, rotY: 0, scale: 1.0 },
    corner2: { pos: [1.455, 1.230, -1.618], rotY: 0, scale: 1.0, flipOnCorner2: true, },
  },
  Sterling_V1: {
    allowCorner2: true,
    corner1: { pos: [1.55, 1.06, -1.22], zStage2:-1.2, rotY: 0, scale: 1.0},
    corner2: { pos: [0.67, 1.06, -1.22], zStage2:-1.2, rotY: 1*Math.PI, rotX: 0.5*Math.PI, scale: 1.0, flipOnCorner2: true, },
  },

  // …add the other models here…
};

const FALLBACK: ShelfPreset = {
  allowCorner2: false,
  corner1: { pos: [0, 0, 0], rotY: 0, scale: 1 },
};

export function getShelfPresetForModel(model: string): ShelfPreset {
  return PRESETS[model] ?? FALLBACK;
}
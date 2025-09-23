import { create } from 'zustand';
import type { FinishName } from '@/lib/finishes';

type Acrylic = 'clear' | 'aguaviva';

// e.g. "DiplomataGold_V3", "Sterling_V2", etc.
// Keep this as a free string so you can add models without code changes.
type ModelId = string;

type Stage = 1 | 2;
const DEFAULT_FINISH: FinishName = 'Cromado';

type SilkCfg = {
  url: string;
  opacity: number;
  roughness: number;
  repeat: [number, number];
  offset: [number, number];
};
const DEFAULT_SILK: SilkCfg = {
  url: '',
  opacity: 1,
  roughness: 0.2,
  repeat: [1, 1],
  offset: [0, 0],
};

// --- NEW: parse a key from a handle URL (basename without extension)
const keyFromUrl = (url?: string) => {
  if (!url) return '';
  const m = url.match(/([^/]+?)(?:\.glb)?$/i);
  return m ? m[1] : url;
};

type SimState = {
  // scene selection
  model: ModelId;         // e.g. "DiplomataGold_V5"
  stage: Stage;           // 1 or 2
  setModel: (m: ModelId) => void;
  setStage: (s: Stage) => void;

  animPlaying: boolean;
  toggleAnim: () => void;

  handleUrl?: string;
  handleKey?: string;
  setHandle: (url?: string) => void; // undefined = default handle

 // per-handle depth
  handleDepth: number;
  handleDepthByKey: Record<string, number>; // NEW
  setHandleDepth: (v: number) => void;      // now writes to current handle's key
  setHandleDepthFor: (key: string, v: number) => void; // optional helper

  finish: FinishName;
  setFinish: (f: FinishName) => void;

  acrylic: Acrylic;
  setAcrylic: (a: Acrylic) => void;

  silk?: SilkCfg;
  setSilk: (cfg: Partial<SilkCfg> & { url?: string }) => void;
};

// --- NEW: defaults you set once per handle (edit these!)
const DEFAULT_HANDLE_DEPTHS: Record<string, number> = {
  Handle_1: -0.018,
  Handle_2: -0.018,
  Handle_3: -0.018,
  Handle_4: 0.012,
  Handle_5: 0.012,
  Handle_6: 0.022,
  Handle_7: 0.021,
  Handle_8: -0.01,
  // keep adding as you add files
};

export const useSim = create<SimState>((set, get) => ({
  // -------- scene selection --------
  model: 'DiplomataGold_V3',
  stage: 1,
  setModel: (model) => {
    // Reset EVERYTHING when the *model* changes
    set({
      model,
      stage: 1,                 // optional: keep or reset, your call
      // handle
      handleUrl: '',
      handleKey: undefined,
      handleDepth: -0.018,
      handleDepthByKey: {},     // clear per-handle depths
      // finish & materials
      finish: DEFAULT_FINISH,
      acrylic: 'clear',
      silk: { ...DEFAULT_SILK },
      // misc
      animPlaying: false,
    });
  },
  setStage: (stage) => set({ stage }), // switching stage keeps all customizations

  // -------- animation --------
  animPlaying: false,
  toggleAnim: () => set((s) => ({ animPlaying: !s.animPlaying })),

  // -------- handle selection + per-handle depth --------
  handleUrl: '',
  handleKey: undefined,

  // When selecting a handle, auto-restore its saved depth (or its default)
  setHandle: (url) => {
    // default/original handle
    if (!url) {
      set({ handleUrl: '', handleKey: undefined });
      return;
    }
    const key = keyFromUrl(url); // e.g. "/handles/Handle_5.glb" → "Handle_5"
    const map = get().handleDepthByKey;
    const depth =
      (key && map[key] !== undefined)
        ? map[key]
        : (DEFAULT_HANDLE_DEPTHS[key] ?? get().handleDepth);

    set({ handleUrl: url, handleKey: key, handleDepth: depth });
  },

  handleDepth: -0.018,
  handleDepthByKey: {},

  // Update the current handle’s depth *and* remember it by key
  setHandleDepth: (v) =>
    set((s) => {
      const key = s.handleKey || '';
      const byKey = { ...s.handleDepthByKey };
      if (key) byKey[key] = v;
      return { handleDepth: v, handleDepthByKey: byKey };
    }),

  // Optional helper if you want to set a depth by key explicitly
  setHandleDepthFor: (key, v) =>
    set((s) => ({
      handleDepthByKey: { ...s.handleDepthByKey, [key]: v },
      ...(s.handleKey === key ? { handleDepth: v } : null),
    })),

  // -------- finishes / materials --------
  finish: DEFAULT_FINISH,
  setFinish: (f) => set({ finish: f }),

  acrylic: 'clear',
  setAcrylic: (a) =>
    set((s) => {
      if (a !== 'clear') return { acrylic: a, silk: { ...DEFAULT_SILK, url: '' } };
      return { acrylic: 'clear' };
    }),

  silk: DEFAULT_SILK,
  setSilk: (cfg) => {
    const current = get().silk ?? DEFAULT_SILK;
    const next = { ...current, ...cfg };
    if (next.url) set({ acrylic: 'clear' });
    set({ silk: next });
  },
}));
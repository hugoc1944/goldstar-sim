import { create } from 'zustand';
import type { FinishName } from '@/lib/finishes';

type Acrylic = 'clear' | 'aguaviva';                // extend later

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

type SimState = {
  animPlaying: boolean;
  toggleAnim: () => void;

  handleUrl?: string;
  setHandle: (url: string) => void;

  handleDepth: number;
  setHandleDepth: (v: number) => void;

  finish: FinishName;
  setFinish: (f: FinishName) => void;

  acrylic: Acrylic;
  setAcrylic: (a: Acrylic) => void;

  silk?: SilkCfg;
  setSilk: (cfg: Partial<SilkCfg> & { url?: string }) => void;
};


export const useSim = create<SimState>((set, get) => ({
  animPlaying: false,
  toggleAnim: () => set(s => ({ animPlaying: !s.animPlaying })),

  setHandle: (url) => set({ handleUrl: url }),

  handleDepth: 0.012,
  setHandleDepth: (v) => set({ handleDepth: v }),

  finish: 'Cromado',
  setFinish: (f) => set({ finish: f }),

  acrylic: 'clear',
  setAcrylic: (a) => set(s => {
    // If you choose any acrylic other than "clear", *always* clear the silk
    if (a !== 'clear') return { acrylic: a, silk: { ...DEFAULT_SILK, url: '' } };
    return { acrylic: 'clear' }; // just reset acrylic; leave silk as-is
  }),

  silk: DEFAULT_SILK,
  setSilk: (cfg) => {
    const current = get().silk ?? DEFAULT_SILK;
    const next = { ...current, ...cfg } as SilkCfg;
    // If you apply a silk (has url), force acrylic back to "clear"
    if (next.url) set({ acrylic: 'clear' });
    set({ silk: next });
  },
}));
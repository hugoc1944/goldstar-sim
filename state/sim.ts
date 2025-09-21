import { create } from 'zustand';
import type { FinishName } from '@/lib/finishes';

type Finish = 'cromado' | 'preto' | 'bronze';       // extend later
type Acrylic = 'clear' | 'aguaviva';                // extend later

type SilkCfg = {
  url: string;
  opacity: number;
  roughness: number;
  repeat: [number, number];
  offset: [number, number];
};

type SimState = {
  animPlaying: boolean;
  toggleAnim: () => void;

  handleUrl?: string;
  setHandle: (url: string) => void;

  /** +Z in the handle's local space (meters). Try ~0.01–0.02 */
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
  animPlaying: true,
  toggleAnim: () => set(s => ({ animPlaying: !s.animPlaying })),

  setHandle: (url) => set({ handleUrl: url }),

  handleDepth: 0.012,                  // default ~1.2 cm forward
  setHandleDepth: (v) => set({ handleDepth: v }),

  finish: 'Cromado',
  setFinish: (f) => set({ finish: f }),

  acrylic: 'clear',
  setAcrylic: (a) => set({ acrylic: a }),

  setSilk: (cfg) => {
    const current: SilkCfg = get().silk ?? {
      url: '',
      opacity: 1,
      roughness: 0.2,
      repeat: [1, 1],
      offset: [0, 0],
    };
    set({ silk: { ...current, ...cfg } as SilkCfg });
  },
}));

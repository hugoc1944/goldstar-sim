// /lib/modelCatalog.ts
export type ModelSection = 'Portas de Abrir' | 'Portas de Correr' | 'Portas Dobráveis' | 'Fixos';

export type ModelVariant = {
  name: string;        // e.g. "Sterling_V1"
  comingSoon?: boolean;
  rules?: ModelRules;
};

export type ModelRules = {
  /** Remove these finishes by name (must match names in FINISHES) */
  removeFinishes?: string[];
  /** Which glass choices are allowed. If omitted: 'transparent' is always allowed, and 'frosted' is allowed by default. */
  allowGlass?: Array<'transparent' | 'frosted' | 'monochrome'>;
  /** Hide the whole "Acrílicos" section */
  hideAcrylics?: boolean;
  hideHandles?: boolean;
};

export type ModelEntry = {
  section: ModelSection;
  baseName: string;         // e.g. "Sterling"
  variants: ModelVariant[]; // e.g. [{name:"Sterling_V1"}, {name:"Sterling_V2", comingSoon:true}]
  comingSoonImage?: string; // shown when ANY selected variant is comingSoon
  rules?: ModelRules;
};



// --- EDIT HERE: put each ModelName under a section, list its variants ---
export const MODEL_CATALOG: ModelEntry[] = [
  {
    section: 'Portas de Abrir',
    baseName: 'Sterling',
    variants: [
      { name: 'Sterling_V1' },
      { name: 'Sterling_V2' },
      { name: 'Sterling_V3' },
      { name: 'Sterling_V4' },
      // { name: 'Sterling_V2' },
      // { name: 'Sterling_V3', comingSoon: true },
    ],
    comingSoonImage: '/coming-soon/sterling.jpg',
    rules: {
        hideAcrylics: true, 
    }
  },
  {
    section: 'Portas de Abrir',
    baseName: 'DiplomataGold',
    variants: [
      { name: 'DiplomataGold_V1' },
      { name: 'DiplomataGold_V2' },
      { name: 'DiplomataGold_V3' },
      { name: 'DiplomataGold_V4' },
      { name: 'DiplomataGold_V5' },
      { name: 'DiplomataGold_V6' },
      { name: 'DiplomataGold_V7' },
      { name: 'DiplomataGold_V8' },
      { name: 'DiplomataGold_V9' },
      { name: 'DiplomataGold_V10' },
      // { name: 'DiplomataGold_V4', comingSoon: true },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        hideAcrylics: true, 
    }
  },
  {
    section: 'Portas de Correr',
    baseName: 'Europa',
    variants: [
      { name: 'Europa_V1' },
      { name: 'Europa_V2' },
      { name: 'Europa_V3' },
      { name: 'Europa_V4' },
      // { name: 'DiplomataGold_V4', comingSoon: true },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        removeFinishes: ['Cromado'],
        hideHandles: true,
    }
  },
  {
    section: 'Fixos',
    baseName: 'Painel Fixo',
    variants: [
      { name: 'PainelFixo_V1' },
      // { name: 'DiplomataGold_V4', comingSoon: true },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        removeFinishes: ['Cromado'],
        hideAcrylics: true, 
        hideHandles: true,
    }
  },
  //Painel
  {
    section: 'Fixos',
    baseName: 'Painel',
    variants: [
      { name: 'Painel_V1', rules: { hideHandles: true } },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        hideAcrylics: true, 
    }
  },
  {
    section: 'Portas de Abrir',
    baseName: 'Painel',
    variants: [
      { name: 'Painel_V2' },
      { name: 'Painel_V3' },
      { name: 'Painel_V4' },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        hideAcrylics: true,
    }
  },
  {
    section: 'Portas de Correr',
    baseName: 'Strong',
    variants: [
      { name: 'Strong_V1' },
      { name: 'Strong_V2' },
      { name: 'Strong_V3' },
      { name: 'Strong_V4' },
      // { name: 'DiplomataGold_V4', comingSoon: true },
    ],
    comingSoonImage: '/coming-soon/diplomata.jpg',
    rules: {
        removeFinishes: ['Cromado'],
        hideAcrylics: true
    }
  },
  // Add more base models here…
];

// Utils
export function parseModelBase(modelOrSceneName: string): string {
  const m = modelOrSceneName.replace(/^SCENE_\d+_/i, '');
  const rx = /^(.*)_v[0-9a-z]+$/i; // <- accept _v or _V and any alnum suffix
  const match = m.match(rx);
  return match ? match[1] : m;
}

export function getEntryByBase(base: string): ModelEntry | undefined {
  return MODEL_CATALOG.find(e => e.baseName === base);
}

export function getEntryByVariant(variant: string): ModelEntry | undefined {
  const byScan = MODEL_CATALOG.find(e => e.variants.some(v => v.name === variant));
  if (byScan) return byScan;
  // fallback via base name (in case of older catalogs)
  const base = parseModelBase(variant);
  return getEntryByBase(base);
}

export function isVariantComingSoon(variant: string): boolean {
  const entry = getEntryByVariant(variant);
  if (!entry) return false;
  const v = entry.variants.find(v => v.name === variant);
  return !!v?.comingSoon;
}
export function getRulesForVariant(variant: string): ModelRules {
  const entry = getEntryByVariant(variant);
  if (!entry) return {};
  const variantRules = entry.variants.find(v => v.name === variant)?.rules ?? {};
  return { ...(entry.rules ?? {}), ...variantRules };
}
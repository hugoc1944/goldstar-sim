export const FINISHES = [
  'Amarelo','Anodizado','AzulClaro','AzulEscuro','AzulTurquesa',
  'Bordeaux','Branco','BrancoMate','Bronze','Castanho','Cinza',
  'CremeClaro','CremeEscuro','Cromado','Preto','PretoBrilho',
  'PretoMate','PretoMate2','Rosa','VerdeAgua','VerdeFloresta','Vermelho',
] as const;
export type FinishName = typeof FINISHES[number];

/** Visual defaults when a specific map is missing. Tweak any value as you like. */
export const FINISH_META: Record<FinishName, {
  hex?: string;
  roughness?: number;
  normalScale?: number;
  metalness?: number;   // ← add this
}> = {
  Amarelo:{hex:'#d7b400',roughness:0.35,metalness:0},
  Anodizado:{hex:'#c8c8c8',roughness:0.22,normalScale:0.4,metalness:0.8},  // ← metal
  AzulClaro:{hex:'#7aa7ff',roughness:0.3,metalness:0},
  AzulEscuro:{hex:'#2e4f9b',roughness:0.28,metalness:0},
  AzulTurquesa:{hex:'#2fa8a8',roughness:0.3,metalness:0},
  Bordeaux:{hex:'#5c1a24',roughness:0.32,metalness:0},
  Branco:{hex:'#ffffff',roughness:0.18,metalness:0},
  BrancoMate:{hex:'#efefef',roughness:0.5,metalness:0},
  Bronze:{hex:'#8c6c3f',roughness:0.28,metalness:0},
  Castanho:{hex:'#5a4638',roughness:0.33,metalness:0},
  Cinza:{hex:'#a0a0a0',roughness:0.25,metalness:0},
  CremeClaro:{hex:'#f1e6c9',roughness:0.32,metalness:0},
  CremeEscuro:{hex:'#cbb68a',roughness:0.34,metalness:0},
  Cromado:{hex:'#ffffff',roughness:0.04,normalScale:0.2,metalness:1},     // ← metal
  Preto:{hex:'#111111',roughness:0.25,metalness:0},
  PretoBrilho:{hex:'#151515',roughness:0.15,normalScale:0.35,metalness:0},
  PretoMate:{hex:'#0f0f0f',roughness:0.6,metalness:0},
  PretoMate2:{hex:'#111111',roughness:0.5,metalness:0},
  Rosa:{hex:'#ff7aa8',roughness:0.32,metalness:0},
  VerdeAgua:{hex:'#43c6b4',roughness:0.3,metalness:0},
  VerdeFloresta:{hex:'#236b3c',roughness:0.32,metalness:0},
  Vermelho:{hex:'#b81818',roughness:0.28,metalness:0},
};
'use client';
import { useSim } from '@/state/sim';
import { FINISHES } from '@/lib/finishes';
import { getShelfPresetForModel } from '@/lib/shelfPresets';
import type { FinishName } from '@/lib/finishes';

export default function Panels() {
  const animPlaying = useSim(s => s.animPlaying);
  const toggleAnim  = useSim(s => s.toggleAnim);
  const setHandle   = useSim(s => s.setHandle);
  const silk = useSim(s => s.silk);
  const setSilk     = useSim(s => s.setSilk);
  const glassFinish    = useSim(s => s.glassFinish);
  const setGlassFinish = useSim(s => s.setGlassFinish);
  const finish = useSim(s => s.finish);
  const setFinish = useSim(s => s.setFinish);
  const acrylic     = useSim(s => s.acrylic);
  const setAcrylic  = useSim(s => s.setAcrylic);
  const shelfMetalColor = useSim(s => s.shelfMetalColor);
  const setShelfMetalColor = useSim(s => s.setShelfMetalColor);
  const fixBarColor = useSim(s => s.fixBarColor);      // 'default' | 'finish'
  const setFixBarColor = useSim(s => s.setFixBarColor);
  
  const model = useSim(s => s.model);
  const stage = useSim(s => s.stage);
  const setModel = useSim(s => s.setModel);
  const setStage = useSim(s => s.setStage);

  // helper to split finishes
  const METALLICS: Set<FinishName> = new Set(['Cromado', 'Anodizado']);
  const lacados   = FINISHES.filter(n => !METALLICS.has(n));
  const metalicos = Array.from(METALLICS).filter(n => FINISHES.includes(n as any));

  const shelfCorner = useSim(s => s.shelfCorner);
  const setShelfCorner = useSim(s => s.setShelfCorner);
  const shelfPreset = getShelfPresetForModel(model);
  return (
    <div className="space-y-6 text-sm">
       
      {/*<section className="mb-4">
        <h3 className="font-semibold mb-2">Focar</h3>
        <button
          onClick={() => {
            const detail = {
              pos: [0.725, 1.310, 0.240] as [number, number, number],
              look: [0.717, 1.271, -0.510] as [number, number, number],
              duration: 0.6, // seconds (tween). Use 0 for instant jump.
            };
            window.dispatchEvent(new CustomEvent('go-to-cam-pose', { detail } as any));
          }}
          className="px-3 py-1 rounded border hover:bg-black/5"
        >
          Zoom In
        </button>
      </section>*/}

      <section>
        <h3 className="font-semibold mb-2">Animação</h3>
        <button
          onClick={toggleAnim}
          className="px-3 py-1 rounded border hover:bg-black/5"
        >
          {animPlaying ? 'Pausar' : 'Reproduzir'}
        </button>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Puxadores</h3>

        {/** state */}
        {(() => {
          const handleKey = useSim(s => s.handleKey);           // e.g. "Handle_2" or undefined for default
          const setHandle = useSim(s => s.setHandle);

          // Helper: which button is active?
          const isActive = (k?: string) => (k ? handleKey === k : !handleKey);

          // List your buttons once; `key` is just the basename without .glb
          const HANDLES = [
            { label: 'Puxador 1', key: 'Handle_1', url: '/handles/Handle_1.glb' },
            { label: 'Puxador 2', key: 'Handle_2', url: '/handles/Handle_2.glb' },
            { label: 'Puxador 3', key: 'Handle_3', url: '/handles/Handle_3.glb' },
            { label: 'Puxador 4', key: undefined, url: '' }, // default/original
            { label: 'Puxador 5', key: 'Handle_5', url: '/handles/Handle_5.glb' },
            { label: 'Puxador 6', key: 'Handle_6', url: '/handles/Handle_6.glb' },
            { label: 'Puxador 7', key: 'Handle_7', url: '/handles/Handle_7.glb' },
            // { label: 'Puxador 8', key: 'Handle_8', url: '/handles/Handle_8.glb' },
          ];

          return (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
              {HANDLES.map(h => (
                <button
                  key={h.key ?? 'default'}
                  onClick={() => setHandle(h.url)}
                  className={`px-3 py-1 rounded border text-left ${
                    isActive(h.key) ? 'bg-black text-white' : 'hover:bg-black/5'
                  }`}
                  aria-pressed={isActive(h.key)}
                  title={h.label}
                >
                  {h.label}
                </button>
              ))}
            </div>
          );
        })()}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Acabamentos</h3>

        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase text-black/60 mb-1">Metálicos</div>
            <div className="grid grid-cols-2 gap-2">
              {metalicos.map(name => (
                <button
                  key={name}
                  onClick={() => setFinish(name)}
                  className={`px-3 py-1 rounded border text-left ${finish===name ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-black/60 mb-1">Lacados</div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto pr-1">
              {lacados.map(name => (
                <button
                  key={name}
                  onClick={() => setFinish(name)}
                  className={`px-3 py-1 rounded border text-left ${finish===name ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {/* Cor barra fixação — moved here */}
          <div>
            <div className="text-xs uppercase text-black/60 mb-1">Barra de fixação</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFixBarColor('default')}
                className={`px-3 py-1 rounded border ${fixBarColor==='default' ? 'bg-black text-white' : 'hover:bg-black/5'}`}
              >
                Padrão
              </button>
              <button
                onClick={() => setFixBarColor('finish')}
                className={`px-3 py-1 rounded border ${fixBarColor==='finish' ? 'bg-black text-white' : 'hover:bg-black/5'}`}
              >
                Cor do acabamento
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Prateleira de Canto</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShelfCorner(0)}
            className={`px-3 py-1 rounded border ${shelfCorner===0 ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
            Nenhum
          </button>
          <button onClick={() => setShelfCorner(1)}
            className={`px-3 py-1 rounded border ${shelfCorner===1 ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
            Canto 1
          </button>
          {shelfPreset.allowCorner2 && (
            <button onClick={() => setShelfCorner(2)}
              className={`px-3 py-1 rounded border ${shelfCorner===2 ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
              Canto 2
            </button>
          )}
        </div>

        {/* --- show only when a corner is active --- */}
        {shelfCorner !== 0 && (
          <>
            <div className="mt-3 text-xs uppercase text-black/60">Cor prateleira</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setShelfMetalColor('default')}
                className={`px-3 py-1 rounded border ${shelfMetalColor==='default' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
                Padrão
              </button>
              <button
                onClick={() => setShelfMetalColor('finish')}
                className={`px-3 py-1 rounded border ${shelfMetalColor==='finish' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
                Cor do acabamento
              </button>
            </div>
          </>
        )}
      </section>

        <section>
          <h3 className="font-semibold mb-2">Vidro</h3>

          {/* Glass type (Transparente/Fosco) */}
          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => setGlassFinish('transparent')}
              className={`px-3 py-1 rounded border ${
                glassFinish === 'transparent' ? 'bg-black text-white' : 'hover:bg-black/5'
              }`}
            >
              Transparente
            </button>

            <button
              onClick={() => { setAcrylic('clear'); setGlassFinish('frosted'); }}  // ← add setAcrylic('clear')
              className={`px-3 py-1 rounded border ${
                glassFinish === 'frosted' ? 'bg-black text-white' : 'hover:bg-black/5'
              }`}
            >
              Fosco
            </button>
          </div>

          {/* Subsection: Acrílicos */}
          <div className="text-xs uppercase text-black/60 mb-1">Acrílicos</div>
          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => { setAcrylic('clear'); setGlassFinish('transparent'); }}
              className={`px-3 py-1 rounded border ${
                acrylic === 'clear' ? 'bg-black text-white' : 'hover:bg-black/5'
              }`}
            >
              Nenhum
            </button>

            <button
              onClick={() => { setAcrylic('aguaviva'); setGlassFinish('transparent'); }}
              className={`px-3 py-1 rounded border ${
                acrylic === 'aguaviva' ? 'bg-black text-white' : 'hover:bg-black/5'
              }`}
            >
              Água Viva
            </button>
          </div>

          {/* Subsection: Serigrafias */}
          <div className="text-xs uppercase text-black/60 mb-1">Serigrafias</div>
          {(() => {
            const silkUrl = silk?.url ?? ''; // safe default

            return (
              <div className="flex flex-wrap gap-2">
                {/* Nenhum (default) */}
                <button
                  onClick={() => setSilk({ url: '' })}
                  className={`px-3 py-1 rounded border ${
                    silkUrl === '' ? 'bg-black text-white' : 'hover:bg-black/5'
                  }`}
                >
                  Nenhum
                </button>

                {/* SER001 */}
                <button
                  onClick={() => setSilk({ url: '/silkscreens/SER001_silkscreen.png' })}
                  className={`px-3 py-1 rounded border ${
                    silkUrl === '/silkscreens/SER001_silkscreen.png'
                      ? 'bg-black text-white'
                      : 'hover:bg-black/5'
                  }`}
                >
                  SER001
                </button>

                {/* (Futuras) outras serigrafias — copie o padrão acima
                <button
                  onClick={() => setSilk({ url: '/silkscreens/SER002_silkscreen.png' })}
                  className={`px-3 py-1 rounded border ${
                    silkUrl === '/silkscreens/SER002_silkscreen.png'
                      ? 'bg-black text-white'
                      : 'hover:bg-black/5'
                  }`}
                >
                  SER002
                </button> */}
              </div>
            );
          })()}
        </section>
    </div>
  );
}

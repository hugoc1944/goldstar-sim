'use client';
import { useSim } from '@/state/sim';
import { FINISHES } from '@/lib/finishes';

export default function Panels() {
  const animPlaying = useSim(s => s.animPlaying);
  const toggleAnim  = useSim(s => s.toggleAnim);
  const setHandle   = useSim(s => s.setHandle);
  const setSilk     = useSim(s => s.setSilk);
  const finish = useSim(s => s.finish);
  const setFinish = useSim(s => s.setFinish);
  const acrylic     = useSim(s => s.acrylic);
  const setAcrylic  = useSim(s => s.setAcrylic);

  const model = useSim(s => s.model);
  const stage = useSim(s => s.stage);
  const setModel = useSim(s => s.setModel);
  const setStage = useSim(s => s.setStage);

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
        <h3 className="font-semibold mb-2">Acabamento (Alumínio)</h3>
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
          {FINISHES.map(name => (
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
      </section>

        <section>
        <h3 className="font-semibold mb-2">Acrílico do Vidro</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setAcrylic('clear')}
            className={`px-3 py-1 rounded border ${
              acrylic === 'clear' ? 'bg-black text-white' : 'hover:bg-black/5'
            }`}
          >
            Liso / Transparente
          </button>
          <button
            onClick={() => setAcrylic('aguaviva')}
            className={`px-3 py-1 rounded border ${
              acrylic === 'aguaviva' ? 'bg-black text-white' : 'hover:bg-black/5'
            }`}
          >
            Água Viva
          </button>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Serigrafia</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSilk({ url: '/silkscreens/SER001_silkscreen.png' })}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Aplicar SER001
          </button>
          <button
            onClick={() => setSilk({ url: '' })}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Limpar
          </button>
        </div>
      </section>
    </div>
  );
}

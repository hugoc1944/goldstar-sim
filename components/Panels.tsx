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

  return (
    <div className="space-y-6 text-sm">
      <section className="mb-4">
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
      </section>

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
        <h3 className="font-semibold mb-2">Puxador</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setHandle('')}   // ← empty = restore original
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Padrão
          </button>
          <button
            onClick={() => setHandle('/handles/Handle_2.glb')}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Handle 2
          </button>
        </div>
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

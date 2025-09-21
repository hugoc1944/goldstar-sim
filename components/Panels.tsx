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

  return (
    <div className="space-y-6 text-sm">
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
            onClick={() => setHandle('/handles/Handle_2.glb')}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Usar Handle 2
          </button>
        </div>
        <p className="opacity-60 mt-1">Coloque o ficheiro em <code>/public/handles/Handle_2.glb</code>.</p>
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
        <h3 className="font-semibold mb-2">Serigrafia</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSilk({ url: '/silkscreens/SER001_silkscreen.png' })}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Aplicar SER001
          </button>
          <button
            onClick={() => setSilk({ url: '', opacity: 1 })}
            className="px-3 py-1 rounded border hover:bg-black/5"
          >
            Limpar
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block">
            Opacidade
            <input
              type="range" min={0} max={1} step={0.05}
              onChange={(e) => setSilk({ opacity: Number(e.target.value) })}
              defaultValue={1}
              className="w-full"
            />
          </label>
          <label className="block">
            Rugosidade (ink)
            <input
              type="range" min={0} max={1} step={0.05}
              onChange={(e) => setSilk({ roughness: Number(e.target.value) })}
              defaultValue={0.2}
              className="w-full"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Estado</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Vidro otimizado para web.</li>
          <li>Planos <code>glass_silk_x</code> em Alpha Blend.</li>
          <li>Alumínio base “Cromado”.</li>
        </ul>
      </section>
    </div>
  );
}

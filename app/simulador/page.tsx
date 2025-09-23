// app/simulador/page.tsx
'use client';
export const dynamic = 'force-static';
import Viewer from '@/components/Viewer';
import Panels from '@/components/Panels';
import { useSim } from '@/state/sim';

// --- NEW: client-only sidebar (embedded component)
function Sidebar() {


  const stage = useSim(s => s.stage);
  const setStage = useSim(s => s.setStage);
  const model = useSim(s => s.model);
  const setModel = useSim(s => s.setModel);

  // Put the models you want visible here (order = display order)
  const MODELS: string[] = [
    'DiplomataGold_V3',
    'Sterling_V1',
    // 'DiplomataGold_V4', 'Sterling_V2', ...
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h2 className="font-semibold mb-3">Modelos</h2>
      </div>

      {/* Scene selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setStage(1)}
          className={`px-3 py-1 rounded border ${stage===1 ? 'bg-black text-white' : 'hover:bg-black/5'}`}
        >
          Scene 1
        </button>
        <button
          onClick={() => setStage(2)}
          className={`px-3 py-1 rounded border ${stage===2 ? 'bg-black text-white' : 'hover:bg-black/5'}`}
        >
          Scene 2
        </button>
      </div>

      {/* Model list */}
      <div className="flex-1 overflow-auto pr-1">
        <ul className="space-y-2">
          {MODELS.map(m => (
            <li key={m}>
              <button
                onClick={() => setModel(m)}
                className={`w-full text-left px-3 py-1 rounded border ${model===m ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                title={m}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="w-screen h-screen grid grid-cols-[320px_1fr_360px] overflow-hidden">
      <aside className="border-r px-4 py-3 overflow-auto">
        <Sidebar />
      </aside>

      <main className="relative">
        <div className="absolute inset-0"><Viewer /></div>
      </main>

      <aside className="border-l px-4 py-3 overflow-auto">
        <Panels />
      </aside>
    </div>
  );
}

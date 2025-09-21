export const dynamic = 'force-static'; // ok to keep

// Simplest: normal imports
import Viewer from '@/components/Viewer';
import Panels from '@/components/Panels';

export default function Page() {
  return (
    <div className="w-screen h-screen grid grid-cols-[320px_1fr_360px] overflow-hidden">
      <aside className="border-r px-4 py-3 overflow-auto">
        <h2 className="font-semibold mb-3">Modelos</h2>
        <p className="text-sm opacity-70">Cena: SCENE_1 • Base</p>
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

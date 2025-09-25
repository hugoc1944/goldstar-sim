// app/simulador/page.tsx
'use client';
export const dynamic = 'force-static';

import Viewer from '@/components/Viewer';
import Panels from '@/components/Panels';
import { useSim } from '@/state/sim';
import {
  MODEL_CATALOG,
  ModelSection,
  getEntryByVariant,
  isVariantComingSoon,
} from '@/lib/modelCatalog';

import React from 'react';

const SECTIONS: ModelSection[] = [
  'Portas de Abrir',
  'Portas de Correr',
  'Portas Dobráveis',
  'Fixos',
];

function Accordion({
  open,
  onToggle,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-3 py-2 flex items-center justify-between text-left font-medium
                   hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        <span>{title}</span>

        {/* Chevron icon: down when open, left when closed */}
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* chevron-down (default) */}
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 011.08 1.04l-4.24 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && <div className="p-3">{children}</div>}
    </div>
  );
}


function variantLabel(variantName: string) {
  // Accepts: "DiplomataGold_V3", "Sterling_V12", even "Model_V1A"
  const m = variantName.match(/_V([A-Za-z0-9]+)$/i);
  return m ? `Variação ${m[1]}` : 'Variação';
}

function Sidebar() {
  const stage = useSim(s => s.stage);
  const setStage = useSim(s => s.setStage);
  const model = useSim(s => s.model);
  const setModel = useSim(s => s.setModel);

  // Simple controlled accordion (one open at a time)
  const [open, setOpen] = React.useState<string | null>(SECTIONS[0]);

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

      {/* Accordions */}
      <div className="flex-1 overflow-auto pr-1 space-y-2">
        {SECTIONS.map(section => {
          const entries = MODEL_CATALOG.filter(e => e.section === section);
          const isOpen = open === section;
          return (
            <Accordion
              key={section}
              title={section}
              open={isOpen}
              onToggle={() => setOpen(isOpen ? null : section)}
            >
              {entries.map(entry => (
                <div key={entry.baseName} className="mb-3">
                  <div className="text-xs uppercase text-black/60 mb-1">{entry.baseName}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {entry.variants.map(v => {
                      const active = model === v.name;
                      const soon = !!v.comingSoon;
                      const label = variantLabel(v.name);
                      return (
                        <button
                          key={v.name}
                          onClick={() => setModel(v.name)}
                          className={`px-3 py-1 rounded border text-left ${active ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                          title={v.name}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{label}</span>
                            {soon && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 text-black/70">
                                Em breve
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-black/50 text-sm">Sem modelos nesta categoria.</div>
              )}
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  const model = useSim(s => s.model);
  const entry = getEntryByVariant(model);
  const comingSoon = isVariantComingSoon(model);

  // If "Em breve", show the image full-bleed in the main area and omit Panels on the right.
  return (
    <div className={`w-screen h-screen grid ${comingSoon
      ? 'grid-cols-[320px_1fr]'       // hide right panel
      : 'grid-cols-[320px_1fr_360px]' // normal
    } overflow-hidden`}>

      <aside className="border-r px-4 py-3 overflow-auto">
        <Sidebar />
      </aside>

      <main className="relative">
        {comingSoon ? (
          <div className="absolute inset-0 bg-black">
            <img
              src={entry?.comingSoonImage ?? '/coming-soon/placeholder.jpg'}
              alt="Em breve"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0"><Viewer /></div>
        )}
      </main>

      {!comingSoon && (
        <aside className="border-l px-4 py-3 overflow-auto">
          <Panels />
        </aside>
      )}
    </div>
  );
}

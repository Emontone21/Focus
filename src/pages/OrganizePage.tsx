import { useState } from 'react';
import { Header } from '@/components/Header';
import { PARAView } from '@/features/organize/PARAView';
import { EisenhowerMatrix } from '@/features/organize/EisenhowerMatrix';
import { WeeklyReview } from '@/features/organize/WeeklyReview';
import { ProjectDetail } from '@/features/organize/ProjectDetail';

type Mode = 'para' | 'matrix' | 'review';

export function OrganizePage() {
  const [mode, setMode] = useState<Mode>('para');
  const [openProjectId, setOpenProjectId] = useState<number | null>(null);

  return (
    <div className="h-full flex flex-col">
      <Header title="Organizar" />
      <div className="px-4 pt-2">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 border border-ios-sep/40 dark:border-ios-sepDark text-xs font-semibold">
          {(['para', 'matrix', 'review'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setOpenProjectId(null); }}
              className={`py-1.5 rounded-lg ${mode === m ? 'bg-ios-card dark:bg-ios-cardDark shadow-ios' : 'text-ios-muted'}`}
            >
              {m === 'para' ? 'PARA' : m === 'matrix' ? 'Eisenhower' : 'Revisión'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 scroll-y px-4 py-3">
        {mode === 'para' && (
          openProjectId !== null
            ? <ProjectDetail projectId={openProjectId} onBack={() => setOpenProjectId(null)} />
            : <PARAView onOpenProject={setOpenProjectId} />
        )}
        {mode === 'matrix' && <EisenhowerMatrix />}
        {mode === 'review' && <WeeklyReview />}
      </div>
    </div>
  );
}

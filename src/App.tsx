import { useEffect } from 'react';
import { DeviceFrame } from '@/components/DeviceFrame';
import { TabBar } from '@/components/TabBar';
import { FAB } from '@/components/FAB';
import { CaptureSheet } from '@/features/inbox/CaptureSheet';
import { Toasts } from '@/components/Toasts';
import { InboxPage } from '@/pages/InboxPage';
import { OrganizePage } from '@/pages/OrganizePage';
import { BoardPage } from '@/pages/BoardPage';
import { TodayPage } from '@/pages/TodayPage';
import { NotesPage } from '@/pages/NotesPage';
import { MapPage } from '@/pages/MapPage';
import { useUI } from '@/store/useUI';
import { useSettings } from '@/store/useSettings';

export default function App() {
  const tab = useUI((s) => s.tab);
  const load = useSettings((s) => s.load);
  const ready = useSettings((s) => s.ready);

  useEffect(() => { load(); }, [load]);

  if (!ready) {
    return (
      <div className="h-full w-full flex items-center justify-center text-ios-muted">
        Cargando…
      </div>
    );
  }

  return (
    <DeviceFrame>
      <div className="relative h-full w-full bg-ios-bg dark:bg-ios-bgDark text-ios-bgDark dark:text-white overflow-hidden">
        <div className="absolute inset-0 pb-[72px]">
          {tab === 'inbox' && <InboxPage />}
          {tab === 'organize' && <OrganizePage />}
          {tab === 'board' && <BoardPage />}
          {tab === 'today' && <TodayPage />}
          {tab === 'notes' && <NotesPage />}
          {tab === 'map' && <MapPage />}
        </div>
        <FAB />
        <TabBar />
        <CaptureSheet />
        <Toasts />
      </div>
    </DeviceFrame>
  );
}

import { useEffect, useState } from 'react';

// Show an iPhone 11 mockup (414x896 pt) when the viewport is wide enough that
// we're clearly on desktop. On true mobile / Capacitor we render full-bleed.
//
// Detection: width > 600px AND not running inside Capacitor.
const isCapacitor = () =>
  // Capacitor sets a global; protocols are 'capacitor:' or 'ionic:'.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  !!(window as any).Capacitor || location.protocol === 'capacitor:';

export function DeviceFrame({ children }: { children: React.ReactNode }) {
  const [framed, setFramed] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth > 600 && !isCapacitor(),
  );

  useEffect(() => {
    const onResize = () => setFramed(window.innerWidth > 600 && !isCapacitor());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!framed) {
    return <div className="h-full w-full">{children}</div>;
  }

  // iPhone 11 logical resolution: 414 x 896 pt. We add a chrome bezel.
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-900 p-6">
      <div
        className="relative shrink-0"
        style={{
          width: 432,
          height: 914,
          borderRadius: 56,
          background: '#0a0a0a',
          padding: 9,
          boxShadow:
            '0 30px 60px rgba(0,0,0,0.35), 0 0 0 2px #1f1f22 inset, 0 0 0 4px #2c2c2e inset',
        }}
      >
        <div
          className="relative overflow-hidden bg-ios-bg dark:bg-ios-bgDark"
          style={{ width: 414, height: 896, borderRadius: 48 }}
        >
          {/* notch */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50"
            style={{
              width: 210,
              height: 30,
              background: '#000',
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
            }}
          >
            <div
              className="absolute right-7 top-2 rounded-full"
              style={{ width: 10, height: 10, background: '#111', boxShadow: 'inset 0 0 2px #333' }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 top-3 rounded-full"
              style={{ width: 50, height: 5, background: '#0c0c0c' }}
            />
          </div>
          <div className="h-full w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

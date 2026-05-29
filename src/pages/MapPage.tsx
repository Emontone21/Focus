import { GraphView } from '@/features/graph/GraphView';

export function MapPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-2xl font-bold">Mapa</h1>
        <p className="text-[11px] text-ios-muted">
          Tu sistema como grafo. Tocá un nodo para ver detalles, arrastrá para mover, pellizcá para hacer zoom.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <GraphView />
      </div>
    </div>
  );
}

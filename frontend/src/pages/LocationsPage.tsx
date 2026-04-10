import type { EntityFilter } from '../layouts/AppShell';

interface Props {
  entityFilter: EntityFilter;
}

export default function LocationsPage({ entityFilter }: Props) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-headline italic text-4xl text-on-surface">Asset Locations</h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          Jurisdictional custody map ·{' '}
          <span className="text-primary capitalize">{entityFilter}</span>
        </p>
      </div>
      <div className="glass-panel rounded-xl p-8 border border-outline-variant/20">
        <p className="text-on-surface-variant/60 text-sm">Phase 7 · Coming soon</p>
        <p className="text-on-surface-variant/40 text-xs mt-1">
          World map · Gold pulse pins · Inventory table · Location CRUD
        </p>
      </div>
    </div>
  );
}

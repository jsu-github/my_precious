import { Search } from 'lucide-react';

export type EntityFilter = 'personal' | 'business' | 'global';

const ENTITY_TABS: { id: EntityFilter; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'business', label: 'Business' },
  { id: 'global',   label: 'Global'   },
];

interface TopHeaderProps {
  entityFilter: EntityFilter;
  onEntityChange: (filter: EntityFilter) => void;
}

export default function TopHeader({ entityFilter, onEntityChange }: TopHeaderProps) {
  return (
    <header className="h-16 bg-background/70 backdrop-blur-xl border-b border-outline-variant/30 flex items-center px-6 gap-4 sticky top-0 z-10 shrink-0">
      {/* Entity toggle */}
      <div className="flex items-center gap-1 bg-surface-high/50 rounded-lg p-1 border border-outline-variant/20">
        {ENTITY_TABS.map(({ id, label }) => {
          const active = entityFilter === id;
          return (
            <button
              key={id}
              onClick={() => onEntityChange(id)}
              className={
                active
                  ? 'px-4 py-1.5 rounded text-sm font-medium text-primary bg-primary/10 border border-primary/20 transition-all'
                  : 'px-4 py-1.5 rounded text-sm text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Market Connected status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary/20 bg-secondary/5">
        <span className="w-2 h-2 bg-secondary rounded-full animate-pulse shrink-0" />
        <span className="text-xs text-secondary font-medium tracking-wide">Market Connected</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search assets…"
          className="bg-surface-high/50 border border-outline-variant/30 rounded-lg pl-9 pr-4 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/35 focus:outline-none focus:border-primary/40 focus:bg-surface-high/70 w-52 transition-all"
        />
      </div>

      {/* User avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
        <span className="text-primary text-xs font-semibold font-label tracking-tight">JP</span>
      </div>
    </header>
  );
}

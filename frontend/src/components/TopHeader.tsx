import { Search, Bell, Mail, LayoutGrid } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-8 py-3 gap-4 shrink-0">

      {/* Search — left side */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search assets, entities…"
          className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40 focus:bg-white w-64 transition-all"
        />
      </div>

      <div className="flex-1" />

      {/* Entity toggle */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
        {ENTITY_TABS.map(({ id, label }) => {
          const active = entityFilter === id;
          return (
            <button
              key={id}
              onClick={() => onEntityChange(id)}
              className={
                active
                  ? 'px-4 py-1.5 rounded-md text-sm font-semibold text-on-surface bg-white shadow-sm transition-all'
                  : 'px-4 py-1.5 rounded-md text-sm text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Market Connected status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
        <span className="text-xs text-emerald-700 font-medium tracking-wide">USD / Active</span>
      </div>

      {/* Notification icons */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-slate-100 transition-colors">
          <Mail className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-slate-100 transition-colors">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* User avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
        <span className="text-primary text-xs font-semibold tracking-tight">JP</span>
      </div>
    </header>
  );
}

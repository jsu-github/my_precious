import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Building2,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier';

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'ledger',    label: 'Ledger',               icon: BookOpen        },
  { id: 'analytics', label: 'Analytics',            icon: TrendingUp      },
  { id: 'locations', label: 'Locations',            icon: MapPin          },
  { id: 'tax',       label: 'Tax & Compliance',     icon: ShieldCheck     },
  { id: 'entity',    label: 'Business vs Personal', icon: Building2       },
];

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export default function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-surface-low border-r border-outline-variant/40 flex flex-col fixed left-0 top-0 z-20">
      {/* Wordmark */}
      <div className="px-6 py-5 border-b border-outline-variant/30">
        <span className="font-headline italic text-xl text-primary tracking-tight">
          The Vault
        </span>
        <p className="text-[10px] text-on-surface-variant/50 mt-0.5 tracking-[0.18em] uppercase">
          Sovereign Risk Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={
                active
                  ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded border-l-2 border-primary text-primary bg-surface-high/60 text-sm font-medium transition-all'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded border-l-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-high/30 text-sm transition-all'
              }
            >
              <Icon
                className={active ? 'w-4 h-4 shrink-0 text-primary' : 'w-4 h-4 shrink-0'}
              />
              <span className="flex-1 text-left">{label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 shrink-0 text-primary/50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Transfer Funds CTA */}
      <div className="px-4 pb-4">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded text-primary text-sm font-medium transition-colors">
          <ArrowLeftRight className="w-4 h-4" />
          Transfer Funds
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-outline-variant/30 flex items-center gap-4">
        <span className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant cursor-pointer transition-colors">
          About
        </span>
        <span className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant cursor-pointer transition-colors">
          Status
        </span>
        <span className="ml-auto text-[10px] text-outline-variant/60 font-mono">v1.0</span>
      </div>
    </aside>
  );
}

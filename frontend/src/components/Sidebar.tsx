import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Building2,
  Layers,
  Store,
  Landmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier' | 'dealer';

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'entity',    label: 'Business vs. Personal', icon: Building2       },
  { id: 'analytics', label: 'Analytics',             icon: TrendingUp      },
  { id: 'ledger',    label: 'Ledger',                icon: BookOpen        },
  { id: 'locations', label: 'Locations',             icon: MapPin          },
  { id: 'tax',       label: 'Tax',                   icon: ShieldCheck     },
  { id: 'tier',      label: 'Tier System',           icon: Layers          },
  { id: 'dealer',    label: 'Dealer & Prices',       icon: Store           },
];

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export default function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-slate-50 flex flex-col fixed left-0 top-0 z-20">

      {/* Wordmark */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-headline font-bold text-sm text-on-surface tracking-tight block leading-tight">
              Wealth Command
            </span>
            <p className="text-[9px] text-on-surface-variant/50 mt-0.5 tracking-[0.15em] uppercase">
              The Financial Atelier
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={
                active
                  ? 'w-full flex items-center gap-3 px-3 py-2.5 border-r-2 border-primary bg-primary/10 text-primary font-semibold text-sm transition-all rounded-l-lg'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 border-r-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-slate-100/80 text-sm transition-all rounded-l-lg'
              }
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : ''}`} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 space-y-3 border-t border-slate-200">
        <button
          className="w-full px-4 py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
        >
          Manage Portfolio
        </button>
        <div className="flex items-center gap-4 px-1">
          <span className="text-[11px] text-on-surface-variant/60 hover:text-on-surface cursor-pointer transition-colors">
            Settings
          </span>
          <span className="text-[11px] text-on-surface-variant/60 hover:text-on-surface cursor-pointer transition-colors">
            Support
          </span>
        </div>
      </div>
    </aside>
  );
}

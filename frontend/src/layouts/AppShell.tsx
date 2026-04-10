import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import type { View } from '../components/Sidebar';
import type { EntityFilter } from '../components/TopHeader';

// Re-export types so pages can import from one place
export type { View, EntityFilter };

interface AppShellProps {
  view: View;
  entityFilter: EntityFilter;
  onNavigate: (view: View) => void;
  onEntityChange: (filter: EntityFilter) => void;
  children: ReactNode;
}

export default function AppShell({
  view,
  entityFilter,
  onNavigate,
  onEntityChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Fixed sidebar */}
      <Sidebar view={view} onNavigate={onNavigate} />

      {/* Main content — offset by sidebar width */}
      <div className="flex flex-col flex-1 overflow-hidden ml-64">
        <TopHeader entityFilter={entityFilter} onEntityChange={onEntityChange} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

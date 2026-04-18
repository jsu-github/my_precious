import { useState } from 'react';
import AppShell from './layouts/AppShell';
import type { View, EntityFilter } from './layouts/AppShell';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LocationsPage from './pages/LocationsPage';
import TaxPage from './pages/TaxPage';
import EntityPage from './pages/EntityPage';
import TierPage from './pages/TierPage';
import DealerPage from './pages/DealerPage';

export default function App() {
  const [view, setView] = useState<View>(() => (localStorage.getItem('nav-view') as View) ?? 'dashboard');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>(() => (localStorage.getItem('nav-entity') as EntityFilter) ?? 'global');

  function handleNavigate(v: View) {
    localStorage.setItem('nav-view', v);
    setView(v);
  }

  function handleEntityChange(f: EntityFilter) {
    localStorage.setItem('nav-entity', f);
    setEntityFilter(f);
  }

  function renderPage() {
    switch (view) {
      case 'dashboard':  return <DashboardPage entityFilter={entityFilter} onNavigate={handleNavigate} />;
      case 'ledger':     return <LedgerPage entityFilter={entityFilter} onNavigate={handleNavigate} />;
      case 'dealer':     return <DealerPage />;
      case 'analytics':  return <AnalyticsPage entityFilter={entityFilter} />;
      case 'locations':  return <LocationsPage entityFilter={entityFilter} />;
      case 'tax':        return <TaxPage entityFilter={entityFilter} />;
      case 'entity':     return <EntityPage entityFilter={entityFilter} />;
      case 'tier':
        return <TierPage entityFilter={entityFilter} />;
    }
  }

  return (
    <AppShell
      view={view}
      entityFilter={entityFilter}
      onNavigate={handleNavigate}
      onEntityChange={handleEntityChange}
    >
      {renderPage()}
    </AppShell>
  );
}

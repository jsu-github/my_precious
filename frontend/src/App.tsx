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
  const [view, setView] = useState<View>('dashboard');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('global');

  function renderPage() {
    switch (view) {
      case 'dashboard':  return <DashboardPage entityFilter={entityFilter} onNavigate={setView} />;
      case 'ledger':     return <LedgerPage entityFilter={entityFilter} onNavigate={setView} />;
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
      onNavigate={setView}
      onEntityChange={setEntityFilter}
    >
      {renderPage()}
    </AppShell>
  );
}

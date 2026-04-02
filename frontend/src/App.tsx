import React, { useState } from 'react';
import { AssetsPage } from './pages/AssetsPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { DimensionsPage } from './pages/DimensionsPage';
import { TagsPage } from './pages/TagsPage';
import { TagOverviewPage } from './pages/TagOverviewPage';
import { DashboardPage } from './pages/DashboardPage';

type View =
  | { page: 'portfolio' }
  | { page: 'dashboard' }
  | { page: 'dimensions' }
  | { page: 'tags' }
  | { page: 'tag-overview' }
  | { page: 'asset-detail'; assetId: string };

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ page: 'portfolio' });

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {view.page === 'portfolio' && (
        <AssetsPage
          onNavigateToDimensions={() => setView({ page: 'dimensions' })}
          onNavigateToTags={() => setView({ page: 'tags' })}
          onNavigateToAsset={(assetId) => setView({ page: 'asset-detail', assetId })}
          onNavigateToDashboard={() => setView({ page: 'dashboard' })}
        />
      )}
      {view.page === 'dashboard' && (
        <DashboardPage onBack={() => setView({ page: 'portfolio' })} />
      )}
      {view.page === 'dimensions' && (
        <DimensionsPage
          onBack={() => setView({ page: 'portfolio' })}
        />
      )}
      {view.page === 'tags' && (
        <TagsPage
          onBack={() => setView({ page: 'portfolio' })}
          onNavigateToOverview={() => setView({ page: 'tag-overview' })}
        />
      )}
      {view.page === 'tag-overview' && (
        <TagOverviewPage
          onBack={() => setView({ page: 'tags' })}
        />
      )}
      {view.page === 'asset-detail' && (
        <AssetDetailPage
          assetId={view.assetId}
          onBack={() => setView({ page: 'portfolio' })}
        />
      )}
    </div>
  );
}

export default App;

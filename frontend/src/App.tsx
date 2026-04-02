import React, { useState } from 'react';
import { AssetsPage } from './pages/AssetsPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { DimensionsPage } from './pages/DimensionsPage';

type View =
  | { page: 'portfolio' }
  | { page: 'dimensions' }
  | { page: 'asset-detail'; assetId: string };

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ page: 'portfolio' });

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {view.page === 'portfolio' && (
        <AssetsPage
          onNavigateToDimensions={() => setView({ page: 'dimensions' })}
          onNavigateToAsset={(assetId) => setView({ page: 'asset-detail', assetId })}
        />
      )}
      {view.page === 'dimensions' && (
        <DimensionsPage
          onBack={() => setView({ page: 'portfolio' })}
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

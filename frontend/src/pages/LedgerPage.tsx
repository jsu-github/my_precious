import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Plus, Upload, Store } from 'lucide-react';
import { api } from '../api';
import type { LedgerRow, AssetClass, TaxStatus, Asset, Entity, AssetLocation, Dealer } from '../types';
import type { EntityFilter } from '../layouts/AppShell';
import AcquisitionModal from '../components/modals/AcquisitionModal';
import Modal from '../components/modals/Modal';
import ImportWizard from '../components/ImportWizard';
import DealerManagementModal from '../components/modals/DealerManagementModal';

// ─── Asset class labels ───────────────────────────────────────────────────────
const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  precious_metals: 'Precious Metals',
  real_estate:     'Real Estate',
  equities:        'Equities',
  crypto:          'Crypto',
  private_equity:  'Private Equity',
  fixed_income:    'Fixed Income',
  cash:            'Cash',
  exotics:         'Exotics',
};

const ALL_ASSET_CLASSES: AssetClass[] = [
  'precious_metals', 'real_estate', 'equities', 'crypto',
  'private_equity', 'fixed_income', 'cash', 'exotics',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number, compact = false): string {
  if (compact && value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRoiPct(pct: number): string {
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

/**
 * Compute proportional current value for an acquisition:
 *   proportion = cost_basis / sum(all_cost_bases for this asset)
 *   proportional_cv = proportion * asset_current_value
 */
function buildEnrichedRows(rows: LedgerRow[]) {
  // Sum cost_basis per asset_id
  const assetCostBasisSum = new Map<number, number>();
  rows.forEach(r => {
    const prev = assetCostBasisSum.get(r.asset_id) ?? 0;
    assetCostBasisSum.set(r.asset_id, prev + parseFloat(r.cost_basis));
  });

  return rows.map(r => {
    const cb = parseFloat(r.cost_basis);
    const assetTotal = assetCostBasisSum.get(r.asset_id) ?? cb;
    const assetCv = parseFloat(r.asset_current_value);
    const proportion = assetTotal > 0 ? cb / assetTotal : 0;
    const currentValue = proportion * assetCv;
    const roi = currentValue - cb;
    const roiPct = cb > 0 ? (roi / cb) * 100 : 0;
    return { ...r, currentValue, roi, roiPct };
  });
}

function exportCSV(rows: ReturnType<typeof buildEnrichedRows>) {
  const headers = [
    'Purchase Date', 'Asset', 'Class', 'Entity', 'Tax Status',
    'Cost Basis', 'Current Value', 'ROI $', 'ROI %', 'Quantity', 'Notes',
  ];
  const data = rows.map(r => [
    fmtDate(r.purchase_date),
    r.asset_name,
    ASSET_CLASS_LABELS[r.asset_class],
    r.entity_name,
    r.tax_status,
    r.cost_basis,
    r.currentValue.toFixed(2),
    r.roi.toFixed(2),
    r.roiPct.toFixed(2) + '%',
    r.quantity,
    r.description ?? '',
  ]);
  const csv = [headers, ...data]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function LedgerPage({ entityFilter }: Props) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [showDealerModal, setShowDealerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxFilter, setTaxFilter] = useState<TaxStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<AssetClass | 'all'>('all');
  const [subClassFilter, setSubClassFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [addAcqAsset, setAddAcqAsset] = useState<Asset | null>(null);
  const [showImport, setShowImport] = useState(false);

  function loadDealers() {
    api.dealers.list().then(setDealers).catch(() => {});
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([api.ledger.list(), api.assets.list(), api.entities.list(), api.locations.list(), api.dealers.list()])
      .then(([r, a, e, l, d]) => { setRows(r); setAssets(a); setEntities(e); setLocations(l); setDealers(d); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const selectedDealer = useMemo(
    () => dealers.find(d => d.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId],
  );

  const pricedDealers = useMemo(
    () => dealers.filter(d =>
      d.we_buy_gold_per_gram || d.we_buy_gold_coin_per_gram ||
      d.we_buy_silver_bar_per_gram || d.we_buy_silver_coin_per_gram ||
      d.we_buy_platinum_per_gram || d.we_buy_palladium_per_gram
    ),
    [dealers],
  );

  // ─── Filter pipeline ───────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (entityFilter !== 'global' && r.entity_type !== entityFilter) return false;
      if (taxFilter !== 'all' && r.tax_status !== taxFilter) return false;
      if (classFilter !== 'all' && r.asset_class !== classFilter) return false;
      if (subClassFilter !== 'all' && r.sub_class !== subClassFilter) return false;
      if (productTypeFilter !== 'all' && r.product_type !== productTypeFilter) return false;
      return true;
    });
  }, [rows, entityFilter, taxFilter, classFilter, subClassFilter, productTypeFilter]);

  // Derive available sub_class / product_type options from current rows (respecting class filter)
  const classFilteredRows = useMemo(() => rows.filter(r => {
    if (entityFilter !== 'global' && r.entity_type !== entityFilter) return false;
    if (classFilter !== 'all' && r.asset_class !== classFilter) return false;
    return true;
  }), [rows, entityFilter, classFilter]);

  const availableSubClasses = useMemo(() => {
    const vals = [...new Set(classFilteredRows.map(r => r.sub_class).filter(Boolean) as string[])];
    return vals.sort();
  }, [classFilteredRows]);

  const availableProductTypes = useMemo(() => {
    const vals = [...new Set(classFilteredRows.map(r => r.product_type).filter(Boolean) as string[])];
    return vals.sort();
  }, [classFilteredRows]);

  const enrichedRows = useMemo(() => buildEnrichedRows(filteredRows), [filteredRows]);

  // ─── Summary totals ────────────────────────────────────────────────────────
  const totalCostBasis = useMemo(
    () => enrichedRows.reduce((s, r) => s + parseFloat(r.cost_basis), 0),
    [enrichedRows],
  );
  const totalCurrentValue = useMemo(
    () => enrichedRows.reduce((s, r) => s + r.currentValue, 0),
    [enrichedRows],
  );
  const totalRoi = totalCurrentValue - totalCostBasis;
  const totalRoiPct = totalCostBasis > 0 ? (totalRoi / totalCostBasis) * 100 : 0;

  // Whether any visible row has sub_class / product_type
  const hasSubClass    = useMemo(() => enrichedRows.some(r => r.sub_class),    [enrichedRows]);
  const hasProductType = useMemo(() => enrichedRows.some(r => r.product_type), [enrichedRows]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm tracking-wide">Loading ledger…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
      </div>
    );
  }

  const selectClass = "bg-surface-high/60 border border-outline-variant/30 rounded text-sm text-on-surface-variant py-1.5 pl-3 pr-8 focus:outline-none focus:border-primary/40 appearance-none cursor-pointer";

  return (
    <>
    <div className="p-6 space-y-4">

      {/* ── Page header + actions ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Transaction Ledger</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            {enrichedRows.length} records · <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manage Dealers */}
          <button
            onClick={() => setShowDealerModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-sm text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <Store className="w-3.5 h-3.5" />
            Dealers
          </button>
          {/* Import */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-sm text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          {/* Add acquisition — user picks asset from inline select */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-surface-high/60 border border-outline-variant/30 rounded text-xs text-on-surface-variant py-2 pl-3 pr-7 focus:outline-none focus:border-primary/40 appearance-none cursor-pointer"
              defaultValue=""
              onChange={e => {
                const asset = assets.find(a => a.id === Number(e.target.value)) ?? null;
                setAddAcqAsset(asset);
                e.target.value = '';
              }}
            >
              <option value="" disabled>Add to asset…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={() => assets.length > 0 && setAddAcqAsset(assets[0])}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => exportCSV(enrichedRows)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-sm text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 py-3">
        <Filter className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
        <div className="relative">
          <select
            value={taxFilter}
            onChange={e => setTaxFilter(e.target.value as TaxStatus | 'all')}
            className={selectClass}
          >
            <option value="all">All Tax Status</option>
            <option value="settled">Settled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={classFilter}
            onChange={e => {
              setClassFilter(e.target.value as AssetClass | 'all');
              setSubClassFilter('all');
              setProductTypeFilter('all');
            }}
            className={selectClass}
          >
            <option value="all">All Asset Classes</option>
            {ALL_ASSET_CLASSES.map(c => (
              <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
            ))}
          </select>
        </div>
        {availableSubClasses.length > 0 && (
          <div className="relative">
            <select
              value={subClassFilter}
              onChange={e => setSubClassFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Metals</option>
              {availableSubClasses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        {availableProductTypes.length > 0 && (
          <div className="relative">
            <select
              value={productTypeFilter}
              onChange={e => setProductTypeFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Types</option>
              {availableProductTypes.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        {/* Dealer picker — drives Liquidation Value column */}
        <div className="ml-auto relative">
          <select
            value={selectedDealerId ?? ''}
            onChange={e => setSelectedDealerId(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">No dealer — Liq. Value hidden</option>
            {pricedDealers.map(d => (
              <option key={d.id} value={d.id}>
                {(() => {
                  const metals = [
                    d.we_buy_gold_per_gram && 'Au',
                    d.we_buy_silver_bar_per_gram && 'Ag',
                    d.we_buy_platinum_per_gram && 'Pt',
                    d.we_buy_palladium_per_gram && 'Pd',
                  ].filter(Boolean).join('/');
                  return metals ? `${d.name} · ${metals}` : d.name;
                })()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden">
        {enrichedRows.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant/40 text-sm">
            No records match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Asset</th>
                {hasSubClass    && <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Metal</th>}
                {hasProductType && <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Type</th>}
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Cost Basis</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Current Value</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Net ROI</th>
                {selectedDealer && <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Liq. Value</th>}
                <th className="px-5 py-3 text-center text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {enrichedRows.map(r => (
                <tr key={r.id} className="group hover:bg-surface-high/30 transition-colors">
                  <td className="px-5 py-3.5 text-on-surface-variant/60 text-xs whitespace-nowrap">
                    {fmtDate(r.purchase_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-on-surface font-medium">{r.asset_name}</div>
                    <div className="text-[11px] text-on-surface-variant/40 mt-0.5">
                      {ASSET_CLASS_LABELS[r.asset_class]} · {r.entity_name}
                    </div>
                  </td>
                  {hasSubClass && (
                    <td className="px-5 py-3.5">
                      {r.sub_class
                        ? <span className="capitalize text-xs text-on-surface-variant">{r.sub_class}</span>
                        : <span className="text-on-surface-variant/20">—</span>}
                    </td>
                  )}
                  {hasProductType && (
                    <td className="px-5 py-3.5">
                      {r.product_type
                        ? <span className="capitalize text-xs text-on-surface-variant">{r.product_type}</span>
                        : <span className="text-on-surface-variant/20">—</span>}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right tabular-nums text-on-surface-variant">
                    {fmtCurrency(parseFloat(r.cost_basis))}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-on-surface">
                    {fmtCurrency(r.currentValue)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    <div className={r.roi >= 0 ? 'text-secondary' : 'text-error'}>
                      {fmtCurrency(r.roi, true)}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${r.roiPct >= 0 ? 'text-secondary/60' : 'text-error/60'}`}>
                      {fmtRoiPct(r.roiPct)}
                    </div>
                  </td>
                  {selectedDealer && (() => {
                    // Pick buy-back price based on sub_class + product_type
                    const sc = r.sub_class?.toLowerCase();
                    const pt = r.product_type?.toLowerCase();
                    let price: number | null = null;
                    if (sc === 'gold') {
                      price = pt === 'coin' && selectedDealer.we_buy_gold_coin_per_gram
                        ? parseFloat(selectedDealer.we_buy_gold_coin_per_gram)
                        : selectedDealer.we_buy_gold_per_gram ? parseFloat(selectedDealer.we_buy_gold_per_gram) : null;
                    } else if (sc === 'silver') {
                      price = pt === 'coin' && selectedDealer.we_buy_silver_coin_per_gram
                        ? parseFloat(selectedDealer.we_buy_silver_coin_per_gram)
                        : selectedDealer.we_buy_silver_bar_per_gram ? parseFloat(selectedDealer.we_buy_silver_bar_per_gram) : null;
                    } else if (sc === 'platinum') {
                      price = selectedDealer.we_buy_platinum_per_gram ? parseFloat(selectedDealer.we_buy_platinum_per_gram) : null;
                    } else if (sc === 'palladium') {
                      price = selectedDealer.we_buy_palladium_per_gram ? parseFloat(selectedDealer.we_buy_palladium_per_gram) : null;
                    }
                    const weight = r.weight_per_unit_grams ? parseFloat(r.weight_per_unit_grams) : null;
                    const liqValue = price && weight
                      ? parseFloat(r.quantity) * weight * price
                      : null;
                    const costBasis = parseFloat(r.cost_basis);
                    const isProfit = liqValue !== null && liqValue > costBasis;
                    return (
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {liqValue !== null ? (
                          <span className={isProfit ? 'text-secondary' : 'text-error'}>
                            {fmtCurrency(liqValue)}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/25">—</span>
                        )}
                      </td>
                    );
                  })()}
                  <td className="px-5 py-3.5 text-center">
                    {r.tax_status === 'settled' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-secondary-container/20 border border-secondary/20 text-secondary">
                        Settled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium border border-error/20 text-error">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      {enrichedRows.length > 0 && (
        <div className="flex items-center justify-end gap-8 px-5 py-3 bg-surface-high/30 rounded-xl border border-outline-variant/15">
          <div className="text-xs text-on-surface-variant/50 uppercase tracking-wider">Summary</div>
          <div className="text-right">
            <div className="text-[11px] text-on-surface-variant/40">Total Cost Basis</div>
            <div className="text-sm font-medium text-on-surface tabular-nums">{fmtCurrency(totalCostBasis, true)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-on-surface-variant/40">Current Value</div>
            <div className="text-sm font-medium text-on-surface tabular-nums">{fmtCurrency(totalCurrentValue, true)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-on-surface-variant/40">Net Unrealised ROI</div>
            <div className={`text-sm font-medium tabular-nums ${totalRoi >= 0 ? 'text-secondary' : 'text-error'}`}>
              {fmtCurrency(totalRoi, true)} · {fmtRoiPct(totalRoiPct)}
            </div>
          </div>
        </div>
      )}

    </div>
    {addAcqAsset && (
      <AcquisitionModal
        asset={addAcqAsset}
        onClose={() => setAddAcqAsset(null)}
        onSaved={async () => {
          setAddAcqAsset(null);
          const updated = await api.ledger.list();
          setRows(updated);
        }}
      />
    )}
    {showImport && (
      <Modal title="Import from Spreadsheet" onClose={() => setShowImport(false)} width="max-w-2xl">
        <ImportWizard
          entities={entities}
          locations={locations}
          onImportComplete={async count => {
            if (count > 0) {
              const updated = await api.ledger.list();
              setRows(updated);
            }
            setShowImport(false);
          }}
        />
      </Modal>
    )}
    {showDealerModal && (
      <DealerManagementModal
        onClose={() => setShowDealerModal(false)}
        onDealersChanged={loadDealers}
      />
    )}
    </>
  );
}

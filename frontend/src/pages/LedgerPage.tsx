import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Plus, Upload, Store } from 'lucide-react';
import { api } from '../api';
import type { LedgerRow, AssetClass, TaxStatus, Asset, Entity, AssetLocation, Dealer } from '../types';
import type { EntityFilter, View } from '../layouts/AppShell';
import { getDealerRate, toGrams } from '../utils/metalPricing';
import AcquisitionModal from '../components/modals/AcquisitionModal';
import Modal from '../components/modals/Modal';
import ImportWizard from '../components/ImportWizard';

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
  onNavigate?: (view: View) => void;
}

export default function LedgerPage({ entityFilter, onNavigate }: Props) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
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

  // Whether any visible row has sub_class / product_type — removed: name now encodes metal+type

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
        <div className="glass-panel p-6 border border-red-200 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const selectClass = "bg-white border border-slate-200 rounded-lg text-sm text-on-surface-variant py-2 pl-3 pr-8 focus:outline-none focus:border-primary/40 appearance-none cursor-pointer";

  return (
    <>
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Transaction Ledger</p>
          <p className="font-headline font-extrabold leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
            {fmtCurrency(totalCurrentValue, true)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-sm font-semibold tabular-nums ${totalRoi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmtCurrency(totalRoi, true)} · {fmtRoiPct(totalRoiPct)}
            </span>
            <span className="text-xs text-on-surface-variant/40">{enrichedRows.length} records · <span className="capitalize">{entityFilter}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('dealer')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors"
          >
            <Store className="w-4 h-4" />
            Dealers
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => exportCSV(enrichedRows)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="flex items-center gap-2">
            <select
              className="border border-slate-200 bg-white rounded-lg text-sm text-on-surface-variant py-2 pl-3 pr-8 focus:outline-none focus:border-primary/40 appearance-none cursor-pointer"
              defaultValue=""
              onChange={e => {
                const asset = assets.find(a => a.id === Number(e.target.value)) ?? null;
                setAddAcqAsset(asset);
                e.target.value = '';
              }}
            >
              <option value="" disabled>Add acquisition…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={() => assets.length > 0 && setAddAcqAsset(assets[0])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main: 9-col table + 3-col sidebar ────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Table column — col-span-9 */}
        <div className="col-span-12 lg:col-span-9">

          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
            <select value={taxFilter} onChange={e => setTaxFilter(e.target.value as TaxStatus | 'all')} className={selectClass}>
              <option value="all">All Status</option>
              <option value="settled">Settled</option>
              <option value="pending">Pending</option>
            </select>
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value as AssetClass | 'all'); setSubClassFilter('all'); setProductTypeFilter('all'); }} className={selectClass}>
              <option value="all">All Asset Classes</option>
              {ALL_ASSET_CLASSES.map(c => <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>)}
            </select>
            {availableSubClasses.length > 0 && (
              <select value={subClassFilter} onChange={e => setSubClassFilter(e.target.value)} className={selectClass}>
                <option value="all">All Metals</option>
                {availableSubClasses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            )}
            {availableProductTypes.length > 0 && (
              <select value={productTypeFilter} onChange={e => setProductTypeFilter(e.target.value)} className={selectClass}>
                <option value="all">All Types</option>
                {availableProductTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            )}
            <div className="ml-auto">
              <select
                value={selectedDealerId ?? ''}
                onChange={e => setSelectedDealerId(e.target.value ? Number(e.target.value) : null)}
                className={selectClass}
              >
                <option value="">Liq. Value: Off</option>
                {pricedDealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            {enrichedRows.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant/40 text-sm">
                No records match the current filters.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Date</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Asset</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Qty</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Cost Basis</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Current Value</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Net ROI</th>
                    {selectedDealer && <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Liq. Value</th>}
                    <th className="px-5 py-3 text-center text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrichedRows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-on-surface-variant/60 text-xs whitespace-nowrap">
                        {fmtDate(r.purchase_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-on-surface font-semibold">{r.asset_name}</div>
                        <div className="text-[11px] text-on-surface-variant/40 mt-0.5">
                          {ASSET_CLASS_LABELS[r.asset_class]} · {r.entity_name}{r.location_name ? ` · ${r.location_name}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-on-surface-variant/60 text-xs">{r.quantity}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-on-surface-variant">{fmtCurrency(parseFloat(r.cost_basis))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-on-surface font-medium">{fmtCurrency(r.currentValue)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <div className={r.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmtCurrency(r.roi, true)}</div>
                        <div className={`text-[11px] mt-0.5 ${r.roiPct >= 0 ? 'text-emerald-600/60' : 'text-red-500/60'}`}>{fmtRoiPct(r.roiPct)}</div>
                      </td>
                      {selectedDealer && (() => {
                        const rate = getDealerRate(selectedDealer, r.sub_class, r.product_type, rawWeight, r.weight_unit);
                        const rawWeight = r.weight_per_unit ? parseFloat(r.weight_per_unit) : null;
                        const weightInGrams = rawWeight != null ? toGrams(rawWeight, r.weight_unit) : null;
                        const liqValue = rate && weightInGrams ? parseFloat(r.quantity) * weightInGrams * rate : null;
                        const costBasis = parseFloat(r.cost_basis);
                        const isProfit = liqValue !== null && liqValue > costBasis;
                        return (
                          <td className="px-5 py-3.5 text-right tabular-nums">
                            {liqValue !== null ? (
                              <span className={isProfit ? 'text-emerald-600' : 'text-red-500'}>{fmtCurrency(liqValue)}</span>
                            ) : (
                              <span className="text-on-surface-variant/25">—</span>
                            )}
                          </td>
                        );
                      })()}
                      <td className="px-5 py-3.5 text-center">
                        {r.tax_status === 'settled' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700">Settled</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary bar */}
          {enrichedRows.length > 0 && (
            <div className="flex items-center justify-end gap-8 px-5 py-3 mt-3 glass-panel">
              <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mr-auto">Summary · {enrichedRows.length} records</div>
              <div className="text-right">
                <div className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">Cost Basis</div>
                <div className="text-sm font-bold text-on-surface tabular-nums">{fmtCurrency(totalCostBasis, true)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">Current Value</div>
                <div className="text-sm font-bold text-on-surface tabular-nums">{fmtCurrency(totalCurrentValue, true)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">Net ROI</div>
                <div className={`text-sm font-bold tabular-nums ${totalRoi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmtCurrency(totalRoi, true)} · {fmtRoiPct(totalRoiPct)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — col-span-3 */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">

          {/* Legacy Portfolio card */}
          <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(145deg, #2e3a4a 0%, #1a242f 100%)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Legacy Portfolio</p>
            <p className="font-headline font-bold text-lg leading-snug text-white">Pre-2020 Holdings</p>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">Assets acquired before systematic tracking. May require manual reconciliation.</p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Estimated value</span>
                <span className="text-white/80 font-bold tabular-nums">—</span>
              </div>
            </div>
          </div>

          {/* Order Insight */}
          <div className="glass-panel p-5 sticky top-24">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Order Insight</p>
            <div className="space-y-3">
              {[
                { label: 'Largest position', value: enrichedRows.length > 0 ? enrichedRows.reduce((m, r) => r.currentValue > m.currentValue ? r : m, enrichedRows[0]).asset_name : '—' },
                { label: 'Avg. ROI', value: fmtRoiPct(totalRoiPct) },
                { label: 'Pending taxes', value: String(enrichedRows.filter(r => r.tax_status === 'pending').length) },
                { label: 'Total records', value: String(enrichedRows.length) },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-baseline">
                  <span className="text-[11px] text-on-surface-variant/50">{item.label}</span>
                  <span className="text-xs font-bold text-on-surface tabular-nums truncate ml-2 max-w-[110px] text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
}

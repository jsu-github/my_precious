import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Plus, Upload } from 'lucide-react';
import { api } from '../api';
import type { LedgerRow, AssetClass, TaxStatus, Asset, Entity, AssetLocation } from '../types';
import type { EntityFilter } from '../layouts/AppShell';
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
  if (compact && value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxFilter, setTaxFilter] = useState<TaxStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<AssetClass | 'all'>('all');
  const [addAcqAsset, setAddAcqAsset] = useState<Asset | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.ledger.list(), api.assets.list(), api.entities.list(), api.locations.list()])
      .then(([r, a, e, l]) => { setRows(r); setAssets(a); setEntities(e); setLocations(l); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  // ─── Filter pipeline ───────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (entityFilter !== 'global' && r.entity_type !== entityFilter) return false;
      if (taxFilter !== 'all' && r.tax_status !== taxFilter) return false;
      if (classFilter !== 'all' && r.asset_class !== classFilter) return false;
      return true;
    });
  }, [rows, entityFilter, taxFilter, classFilter]);

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
            onChange={e => setClassFilter(e.target.value as AssetClass | 'all')}
            className={selectClass}
          >
            <option value="all">All Asset Classes</option>
            {ALL_ASSET_CLASSES.map(c => (
              <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
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
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Cost Basis</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Current Value</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Net ROI</th>
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
    </>
  );
}

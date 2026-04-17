import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Tag } from 'lucide-react';
import { api } from '../api';
import type { Asset, FiscalTag, Entity, CreateFiscalTag } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '€' + (value / 1_000).toFixed(1) + 'K';
  return '€' + value.toFixed(0);
}

const CURRENT_FISCAL_YEAR = new Date().getFullYear();

function exportFiscalCSV(assets: Asset[], tags: Map<number, FiscalTag[]>) {
  const headers = ['Asset', 'Entity', 'Class', 'Current Value', 'Fiscal Year', 'Category', 'Jurisdiction', 'Notes'];
  const rows = assets.map(a => {
    const assetTags = tags.get(a.id) ?? [];
    const currentTag = assetTags.find(t => t.fiscal_year === CURRENT_FISCAL_YEAR) ?? assetTags[0];
    return [
      a.name, a.entity_name ?? '', a.asset_class, a.current_value,
      currentTag?.fiscal_year ?? '', currentTag?.fiscal_category ?? 'UNTAGGED',
      currentTag?.jurisdiction ?? '', currentTag?.notes ?? '',
    ];
  });
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fiscal-report-${CURRENT_FISCAL_YEAR}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Inline tag edit ──────────────────────────────────────────────────────────
interface TagCellProps {
  asset: Asset;
  tag: FiscalTag | undefined;
  onSaved: (tag: FiscalTag) => void;
}

function TagCell({ asset, tag, onSaved }: TagCellProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CreateFiscalTag>({
    fiscal_year: CURRENT_FISCAL_YEAR,
    fiscal_category: tag?.fiscal_category ?? '',
    jurisdiction: tag?.jurisdiction ?? '',
    notes: tag?.notes ?? null,
  });
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return tag ? (
      <button
        onClick={() => setEditing(true)}
        className="text-left group"
      >
        <span className="text-xs text-on-surface">{tag.fiscal_category}</span>
        <span className="text-[11px] text-on-surface-variant/40 ml-2">{tag.jurisdiction}</span>
        <span className="ml-2 text-[10px] text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </button>
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] text-on-surface-variant/30 hover:text-primary/60 flex items-center gap-1 transition-colors"
      >
        <Tag className="w-3 h-3" />
        Add tag
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <input
          autoFocus
          className="w-full bg-surface-highest border border-primary/30 rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
          placeholder="Category (e.g. CapitalAsset)"
          value={form.fiscal_category}
          onChange={e => setForm(f => ({ ...f, fiscal_category: e.target.value }))}
        />
        <input
          className="w-full bg-surface-highest border border-outline-variant/30 rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
          placeholder="Jurisdiction (e.g. US-CA)"
          value={form.jurisdiction}
          onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))}
        />
      </div>
      <button
        disabled={saving || !form.fiscal_category}
        onClick={async () => {
          setSaving(true);
          try {
            const saved = await api.assets.fiscalTags.create(asset.id, form);
            onSaved(saved);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
        className="px-3 py-1 bg-primary/15 border border-primary/25 rounded text-[11px] text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="px-2 py-1 text-[11px] text-on-surface-variant/40 hover:text-on-surface transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function TaxPage({ entityFilter }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tagMap, setTagMap] = useState<Map<number, FiscalTag[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.assets.list(), api.entities.list()])
      .then(async ([a, e]) => {
        setAssets(a);
        setEntities(e);
        // Fetch fiscal tags for each asset in parallel
        const tagResults = await Promise.all(a.map(asset => api.assets.fiscalTags.list(asset.id)));
        const map = new Map<number, FiscalTag[]>();
        a.forEach((asset, i) => map.set(asset.id, tagResults[i]));
        setTagMap(map);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filteredAssets = useMemo(() => {
    if (entityFilter === 'global') return assets;
    const entityType = entityFilter;
    const matchingIds = new Set(entities.filter(e => e.type === entityType).map(e => e.id));
    return assets.filter(a => matchingIds.has(a.entity_id));
  }, [assets, entities, entityFilter]);

  // Compliance: % of assets with a tag for the current fiscal year
  const taggedCount = useMemo(
    () => filteredAssets.filter(a => (tagMap.get(a.id) ?? []).some(t => t.fiscal_year === CURRENT_FISCAL_YEAR)).length,
    [filteredAssets, tagMap],
  );
  const complianceScore = filteredAssets.length > 0
    ? Math.round((taggedCount / filteredAssets.length) * 100)
    : 0;

  const uniqueJurisdictions = useMemo(() => {
    const js = new Set<string>();
    filteredAssets.forEach(a => {
      (tagMap.get(a.id) ?? []).forEach(t => { if (t.jurisdiction) js.add(t.jurisdiction); });
    });
    return js.size;
  }, [filteredAssets, tagMap]);

  function handleTagSaved(assetId: number, tag: FiscalTag) {
    setTagMap(prev => {
      const next = new Map(prev);
      const existing = next.get(assetId) ?? [];
      const idx = existing.findIndex(t => t.id === tag.id);
      if (idx >= 0) {
        next.set(assetId, existing.map((t, i) => i === idx ? tag : t));
      } else {
        next.set(assetId, [tag, ...existing]);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm">Loading tax data…</div>
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

  // Static quarterly data for the bar chart
  const Q_BARS = [
    { label: 'Q1', height: 42, amount: '€48K' },
    { label: 'Q2', height: 68, amount: '€76K' },
    { label: 'Q3', height: 55, amount: '€62K' },
    { label: 'Q4', height: 91, amount: '€103K', current: true },
  ];

  // Compliance ring SVG
  const ringR = 40;
  const ringCirc = 2 * Math.PI * ringR;
  const ringFilled = (complianceScore / 100) * ringCirc;

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Tax & Compliance</p>
          <p className="font-headline font-extrabold leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
            Reporting Hub
          </p>
          <p className="text-sm text-on-surface-variant/50 mt-2">
            FY {CURRENT_FISCAL_YEAR} · <span className="capitalize">{entityFilter}</span> · {taggedCount}/{filteredAssets.length} assets tagged
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportFiscalCSV(filteredAssets, tagMap)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Fiscal Report
          </button>
          <button
            onClick={() => exportFiscalCSV(filteredAssets, tagMap)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
          >
            <Download className="w-4 h-4" />
            Export VAT Docs
          </button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assets in Scope', value: String(filteredAssets.length) },
          { label: `Tagged FY${CURRENT_FISCAL_YEAR}`, value: String(taggedCount), green: true },
          { label: 'Untagged', value: String(filteredAssets.length - taggedCount), warn: (filteredAssets.length - taggedCount) > 0 },
          { label: 'Jurisdictions', value: String(uniqueJurisdictions) },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel p-5">
            <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mb-2">{kpi.label}</p>
            <p className={`font-headline font-extrabold text-on-surface tabular-nums ${kpi.green ? 'text-emerald-600' : kpi.warn ? 'text-amber-600' : 'text-on-surface'}`}
               style={{ fontSize: '1.8rem' }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Quarterly Chart + Compliance Ring ────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Quarterly performance — col-span-8 */}
        <div className="col-span-12 lg:col-span-8 glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold font-headline text-on-surface">Quarterly Tax Exposure</h2>
              <p className="text-[11px] text-on-surface-variant/40 mt-0.5">Liability estimates by quarter · FY {CURRENT_FISCAL_YEAR}</p>
            </div>
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">Estimated</span>
          </div>
          <div className="flex items-end gap-6 h-32 mb-3">
            {Q_BARS.map(q => (
              <div key={q.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60 tabular-nums">{q.amount}</span>
                <div className="w-full rounded-t-md transition-all"
                     style={{
                       height: `${q.height}%`,
                       background: q.current ? 'linear-gradient(180deg, #545f73 0%, #3d4859 100%)' : 'rgba(84,95,115,0.2)',
                     }} />
              </div>
            ))}
          </div>
          <div className="flex gap-6">
            {Q_BARS.map(q => (
              <div key={q.label} className="flex-1 text-center">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${q.current ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                  {q.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance ring — col-span-4 */}
        <div className="col-span-12 lg:col-span-4 glass-panel p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 self-start">Compliance Score</p>
          <svg viewBox="0 0 100 100" className="w-36 h-36">
            <circle cx="50" cy="50" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle cx="50" cy="50" r={ringR} fill="none"
              stroke={complianceScore >= 80 ? '#059669' : complianceScore >= 50 ? '#d97706' : '#dc2626'}
              strokeWidth="10"
              strokeDasharray={`${ringFilled} ${ringCirc}`}
              strokeDashoffset={ringCirc * 0.25}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="45" textAnchor="middle" style={{ fontSize: '18px', fontWeight: 800, fill: '#2a3439', fontFamily: 'Manrope, sans-serif' }}>
              {complianceScore}%
            </text>
            <text x="50" y="60" textAnchor="middle" style={{ fontSize: '7px', fill: '#566166', fontFamily: 'Manrope, sans-serif', fontWeight: 700 }}>
              {complianceScore >= 80 ? 'COMPLIANT' : complianceScore >= 50 ? 'ATTENTION' : 'AT RISK'}
            </text>
          </svg>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant/50">{taggedCount} of {filteredAssets.length} assets tagged</p>
            <p className="text-[10px] text-on-surface-variant/35 mt-0.5">FY {CURRENT_FISCAL_YEAR}</p>
          </div>
        </div>
      </div>

      {/* ── Asset Fiscal Tag Table ────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface">Asset Fiscal Tags</h2>
          <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">{filteredAssets.length} assets</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Asset</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Valuation</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Legal Entity</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Fiscal Category FY{CURRENT_FISCAL_YEAR}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredAssets.map(asset => {
              const tags = tagMap.get(asset.id) ?? [];
              const currentTag = tags.find(t => t.fiscal_year === CURRENT_FISCAL_YEAR);
              return (
                <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-on-surface font-semibold">{asset.name}</div>
                    <div className="text-[11px] text-on-surface-variant/40 mt-0.5">{asset.asset_class.replace('_', ' ')}</div>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-on-surface font-medium">
                    {fmtCurrency(parseFloat(asset.current_value))}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant/70 text-xs">
                    {asset.entity_name}
                  </td>
                  <td className="px-5 py-3.5">
                    <TagCell
                      asset={asset}
                      tag={currentTag}
                      onSaved={tag => handleTagSaved(asset.id, tag)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Optimization Insight ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-5 border-l-4 border-emerald-400">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2">Optimization Insight</p>
          <p className="text-sm font-semibold text-on-surface leading-snug">
            {filteredAssets.length - taggedCount > 0
              ? `${filteredAssets.length - taggedCount} assets remain untagged — complete tagging to unlock full deduction analysis.`
              : 'All assets tagged. Your portfolio is fully prepared for deduction analysis.'}
          </p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-primary">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2">Next Filing Milestone</p>
          <div className="flex items-end gap-3">
            <span className="font-headline font-extrabold text-on-surface" style={{ fontSize: '2rem' }}>12</span>
            <span className="text-sm text-on-surface-variant/60 mb-1">days until Q4 deadline</span>
          </div>
        </div>
      </div>

    </div>
  );
}

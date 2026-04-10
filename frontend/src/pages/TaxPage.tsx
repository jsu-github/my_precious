import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Tag } from 'lucide-react';
import { api } from '../api';
import type { Asset, FiscalTag, Entity, CreateFiscalTag } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
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
        <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Tax &amp; Compliance</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            FY {CURRENT_FISCAL_YEAR} · <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFiscalCSV(filteredAssets, tagMap)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Fiscal Report
          </button>
          <button
            onClick={() => exportFiscalCSV(filteredAssets, tagMap)}
            className="flex items-center gap-2 px-3 py-2 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            VAT Docs
          </button>
        </div>
      </div>

      {/* ── Compliance Score ──────────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl p-6 border border-outline-variant/20">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] text-on-surface-variant/50 uppercase tracking-[0.18em] mb-1">Compliance Score FY {CURRENT_FISCAL_YEAR}</p>
            <div className="flex items-end gap-3">
              <span className="font-headline italic text-5xl text-on-surface tabular-nums">{complianceScore}%</span>
              <span className="text-sm text-on-surface-variant/50 mb-2">
                {taggedCount} / {filteredAssets.length} assets tagged
              </span>
            </div>
          </div>
          {/* Score bar */}
          <div className="flex-1 max-w-xs">
            <div className="h-2 rounded-full bg-surface-highest overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${complianceScore}%`,
                  background: complianceScore >= 80
                    ? '#4edea3'
                    : complianceScore >= 50
                      ? '#e9c349'
                      : '#ffb4ab',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant/30 mt-1">
              <span>0%</span>
              <span className={complianceScore >= 80 ? 'text-secondary' : complianceScore >= 50 ? 'text-primary' : 'text-error'}>
                {complianceScore >= 80 ? 'Compliant' : complianceScore >= 50 ? 'Needs Attention' : 'At Risk'}
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset Fiscal Tag Table ────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/15">
              <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Asset</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Valuation</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Legal Entity</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Fiscal Category FY{CURRENT_FISCAL_YEAR}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filteredAssets.map(asset => {
              const tags = tagMap.get(asset.id) ?? [];
              const currentTag = tags.find(t => t.fiscal_year === CURRENT_FISCAL_YEAR);
              return (
                <tr key={asset.id} className="hover:bg-surface-high/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-on-surface font-medium">{asset.name}</div>
                    <div className="text-[11px] text-on-surface-variant/40 mt-0.5">{asset.asset_class.replace('_', ' ')}</div>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-on-surface">
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
    </div>
  );
}

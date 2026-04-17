import { useState, useCallback, useRef, useMemo } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { Upload as _Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { api } from '../api';
import type { Entity, AssetLocation, AssetClass, CreateAcquisition, TaxStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedRow {
  _row: number;
  [key: string]: unknown;
}

interface MappedRow {
  rowIndex: number;
  asset_name: string;
  entity_name: string;
  asset_class: AssetClass;
  current_value: number;
  purchase_date: string;
  cost_basis: number;
  quantity: number;
  tax_status: TaxStatus;
  description: string | null;
  // validation
  errors: string[];
}

const REQUIRED_COLUMNS = [
  'asset_name', 'entity_name', 'asset_class', 'current_value',
  'purchase_date', 'cost_basis',
] as const;

const VALID_ASSET_CLASSES = new Set<AssetClass>([
  'precious_metals', 'real_estate', 'equities', 'crypto',
  'private_equity', 'fixed_income', 'cash', 'exotics',
]);

const VALID_TAX_STATUSES = new Set<TaxStatus>(['settled', 'pending']);

// ─── Column mapping config ────────────────────────────────────────────────────
/** Maps a header name to one of the target field names via fuzzy matching */
function guessMapping(headers: string[]): Record<string, string> {
  const targets: Array<[string, string[]]> = [
    ['asset_name',    ['asset', 'name', 'asset name']],
    ['entity_name',   ['entity', 'entity name', 'owner', 'trust']],
    ['asset_class',   ['class', 'type', 'category', 'asset class', 'asset_class']],
    ['current_value', ['value', 'current value', 'current_value', 'market value', 'nav']],
    ['purchase_date', ['date', 'purchase', 'bought', 'purchase date', 'purchase_date']],
    ['cost_basis',    ['cost', 'cost basis', 'cost_basis', 'purchase price', 'basis']],
    ['quantity',      ['qty', 'quantity', 'units', 'amount']],
    ['tax_status',    ['tax', 'status', 'tax status', 'tax_status', 'settled']],
    ['description',   ['notes', 'description', 'note', 'memo']],
  ];

  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    for (const [field, aliases] of targets) {
      if (aliases.some(a => lower.includes(a) || a.includes(lower))) {
        if (!mapping[field]) mapping[field] = header;
        break;
      }
    }
  }
  return mapping;
}

function normalizeAssetClass(raw: string): AssetClass | null {
  const lower = raw?.toLowerCase().trim().replace(/[\s-]+/g, '_') ?? '';
  if (VALID_ASSET_CLASSES.has(lower as AssetClass)) return lower as AssetClass;
  // common aliases
  const aliases: Record<string, AssetClass> = {
    gold: 'precious_metals', silver: 'precious_metals', metals: 'precious_metals',
    property: 'real_estate', land: 'real_estate',
    stocks: 'equities', shares: 'equities', equity: 'equities',
    bitcoin: 'crypto', eth: 'crypto', cryptocurrency: 'crypto',
    pe: 'private_equity',
    bonds: 'fixed_income', bond: 'fixed_income',
    usd: 'cash', eur: 'cash', fiat: 'cash',
  };
  return aliases[lower] ?? null;
}

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    // Excel serial date
    const date = xlsxUtils.format_cell({ v: raw, t: 'd' });
    return date ? date.slice(0, 10) : null;
  }
  const str = String(raw).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  entities: Entity[];
  locations: AssetLocation[];
  onImportComplete?: (count: number) => void;
}

type ImportStep = 'upload' | 'map' | 'review' | 'done';

export default function ImportWizard({ entities, onImportComplete }: Props) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const entityNameMap = useMemo(
    () => new Map(entities.map(e => [e.name.toLowerCase(), e])),
    [entities],
  );

  // ── Step 1: file parse ────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = e.target?.result;
      if (!data) return;
      const wb = xlsxRead(data, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = xlsxUtils.sheet_to_json(ws, { defval: null });
      if (json.length === 0) return;
      const cols = Object.keys(json[0]);
      const rows: ParsedRow[] = json.map((r, i) => ({ _row: i + 2, ...r }));
      setHeaders(cols);
      setRawRows(rows);
      setColumnMap(guessMapping(cols));
      setStep('map');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Step 2: apply mapping ─────────────────────────────────────────────────
  function applyMapping() {
    const mapped: MappedRow[] = rawRows.map(r => {
      const get = (field: string) => {
        const col = columnMap[field];
        return col ? r[col] : undefined;
      };

      const errors: string[] = [];
      const asset_name = String(get('asset_name') ?? '').trim();
      const entity_name = String(get('entity_name') ?? '').trim();
      const rawClass = String(get('asset_class') ?? '');
      const asset_class = normalizeAssetClass(rawClass);
      const current_value = parseFloat(String(get('current_value') ?? '0'));
      const purchase_date = normalizeDate(get('purchase_date'));
      const cost_basis = parseFloat(String(get('cost_basis') ?? '0'));
      const quantity = parseFloat(String(get('quantity') ?? '1')) || 1;
      const rawTax = String(get('tax_status') ?? 'settled').toLowerCase();
      const tax_status: TaxStatus = VALID_TAX_STATUSES.has(rawTax as TaxStatus)
        ? (rawTax as TaxStatus) : 'settled';
      const description = get('description') ? String(get('description')) : null;

      if (!asset_name) errors.push('Missing asset name');
      if (!entity_name) errors.push('Missing entity name');
      if (!asset_class) errors.push(`Unknown asset class: "${rawClass}"`);
      if (isNaN(current_value) || current_value < 0) errors.push('Invalid current value');
      if (!purchase_date) errors.push('Invalid purchase date');
      if (isNaN(cost_basis) || cost_basis < 0) errors.push('Invalid cost basis');

      return {
        rowIndex: r._row as number,
        asset_name,
        entity_name,
        asset_class: asset_class ?? 'exotics',
        current_value: isNaN(current_value) ? 0 : current_value,
        purchase_date: purchase_date ?? new Date().toISOString().slice(0, 10),
        cost_basis: isNaN(cost_basis) ? 0 : cost_basis,
        quantity,
        tax_status,
        description,
        errors,
      };
    });
    setMappedRows(mapped);
    setStep('review');
  }

  // ── Step 3: import ────────────────────────────────────────────────────────
  async function runImport() {
    setImporting(true);
    setImportError(null);
    let count = 0;
    const validRows = mappedRows.filter(r => r.errors.length === 0);

    // Group by asset_name + entity_name — create asset if missing, then acquisitions
    const assetGroups = new Map<string, MappedRow[]>();
    for (const row of validRows) {
      const key = `${row.entity_name.toLowerCase()}|${row.asset_name.toLowerCase()}`;
      if (!assetGroups.has(key)) assetGroups.set(key, []);
      assetGroups.get(key)!.push(row);
    }

    try {
      for (const [, rows] of assetGroups) {
        const sample = rows[0];
        const entity = entityNameMap.get(sample.entity_name.toLowerCase());
        if (!entity) {
          setImportError(`Entity not found: "${sample.entity_name}". Create it first.`);
          setImporting(false);
          return;
        }

        // create or find asset
        const existingAssets = await api.assets.list(entity.id);
        let asset = existingAssets.find(
          a => a.name.toLowerCase() === sample.asset_name.toLowerCase(),
        );
        if (!asset) {
          asset = await api.assets.create({
            entity_id: entity.id,
            location_id: null,
            name: sample.asset_name,
            asset_class: sample.asset_class,
            sub_class: null,
            product_type: null,
            weight_per_unit: null,
            tier: null,
            current_value: String(sample.current_value),
            security_class: 'standard',
            audit_frequency: 'annual',
            last_audit_date: null,
            description: null,
          });
        }

        for (const row of rows) {
          const acq: CreateAcquisition = {
            purchase_date: row.purchase_date,
            cost_basis: String(row.cost_basis),
            quantity: String(row.quantity),
            tax_status: row.tax_status,
            description: row.description,
          };
          await api.assets.acquisitions.create(asset.id, acq);
          count++;
        }
      }
      setImportedCount(count);
      setStep('done');
      onImportComplete?.(count);
    } catch (err) {
      setImportError(String(err));
    } finally {
      setImporting(false);
    }
  }

  const validCount = mappedRows.filter(r => r.errors.length === 0).length;
  const errorCount = mappedRows.filter(r => r.errors.length > 0).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {(['upload', 'map', 'review', 'done'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-outline-variant/30" />}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              step === s ? 'text-primary' : s < step ? 'text-secondary/60' : 'text-on-surface-variant/30'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                step === s ? 'border-primary bg-primary/15 text-primary' :
                s < step ? 'border-secondary/40 bg-secondary/10 text-secondary' :
                'border-outline-variant/30 text-on-surface-variant/30'
              }`}>{i + 1}</span>
              <span className="capitalize">{s === 'map' ? 'Map Columns' : s === 'done' ? 'Complete' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ──────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-outline-variant/30 hover:border-primary/40 rounded-xl p-16 text-center transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <FileSpreadsheet className="w-12 h-12 text-on-surface-variant/25 mx-auto mb-4" />
          <p className="text-on-surface/70 font-medium mb-1">Drop your spreadsheet here</p>
          <p className="text-sm text-on-surface-variant/40">Excel (.xlsx, .xls) or CSV — row 1 must be headers</p>
        </div>
      )}

      {/* ── Step 2: Map columns ─────────────────────────────────────────────── */}
      {step === 'map' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/15 flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">Column Mapping</span>
              <span className="text-xs text-on-surface-variant/50">{rawRows.length} rows detected</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {REQUIRED_COLUMNS.map(field => (
                <div key={field}>
                  <label className="block text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wider mb-1.5">
                    {field.replace(/_/g, ' ')}<span className="text-error ml-0.5">*</span>
                  </label>
                  <select
                    className="w-full bg-surface-highest border border-outline-variant/40 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                    value={columnMap[field] ?? ''}
                    onChange={e => setColumnMap(m => ({ ...m, [field]: e.target.value }))}
                  >
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              {(['quantity', 'tax_status', 'description'] as const).map(field => (
                <div key={field}>
                  <label className="block text-[11px] font-medium text-on-surface-variant/40 uppercase tracking-wider mb-1.5">
                    {field.replace(/_/g, ' ')} <span className="text-on-surface-variant/30">(optional)</span>
                  </label>
                  <select
                    className="w-full bg-surface-highest border border-outline-variant/40 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                    value={columnMap[field] ?? ''}
                    onChange={e => setColumnMap(m => ({ ...m, [field]: e.target.value }))}
                  >
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button onClick={() => setStep('upload')} className="text-sm text-on-surface-variant/50 hover:text-on-surface transition-colors">
              ← Back
            </button>
            <button
              onClick={applyMapping}
              disabled={REQUIRED_COLUMNS.some(f => !columnMap[f])}
              className="px-5 py-2 bg-primary/15 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              Preview Import →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ──────────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-outline-variant/20 bg-surface-high/30">
            <div className="flex items-center gap-1.5 text-secondary text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {validCount} rows ready
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {errorCount} rows with errors (will be skipped)
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-base">
                <tr className="border-b border-outline-variant/15">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-wider">#</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Cost Basis</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {mappedRows.map(row => (
                  <tr key={row.rowIndex} className={row.errors.length > 0 ? 'bg-error/5' : ''}>
                    <td className="px-4 py-2 text-on-surface-variant/40">{row.rowIndex}</td>
                    <td className="px-4 py-2 text-on-surface">{row.asset_name}</td>
                    <td className="px-4 py-2 text-on-surface-variant/70">{row.entity_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-on-surface-variant">
                      €{row.cost_basis.toLocaleString('nl-NL')}
                    </td>
                    <td className="px-4 py-2">
                      {row.errors.length > 0 ? (
                        <span className="flex items-center gap-1 text-error">
                          <X className="w-3 h-3" />
                          {row.errors[0]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-secondary">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importError && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-error/20 bg-error/10 text-error text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {importError}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button onClick={() => setStep('map')} className="text-sm text-on-surface-variant/50 hover:text-on-surface transition-colors">
              ← Back
            </button>
            <button
              onClick={runImport}
              disabled={validCount === 0 || importing}
              className="px-5 py-2 bg-primary/15 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              {importing ? 'Importing…' : `Import ${validCount} rows →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ──────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-secondary mx-auto" />
          <h3 className="font-headline italic text-2xl text-on-surface">Import Complete</h3>
          <p className="text-on-surface-variant/60 text-sm">
            {importedCount} acquisition record{importedCount !== 1 ? 's' : ''} imported successfully.
          </p>
          <button
            onClick={() => { setStep('upload'); setRawRows([]); setMappedRows([]); }}
            className="px-5 py-2 bg-surface-high/60 border border-outline-variant/30 rounded text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

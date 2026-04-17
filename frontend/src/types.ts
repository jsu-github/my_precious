// All shared types — single source of truth.
// API returns NUMERIC columns as strings (pg driver preserves precision).
// Use parseFloat() / Number() when doing arithmetic in components.

// ─── Error shape (from API errorHandler) ────────────────────────────────────
export interface ApiError {
  error: { message: string; status: number };
}

// ─── Enums (stored as strings in DB) ─────────────────────────────────────────
export type AssetClass =
  | 'precious_metals'
  | 'real_estate'
  | 'equities'
  | 'crypto'
  | 'private_equity'
  | 'fixed_income'
  | 'cash'
  | 'exotics';

export type EntityType = 'personal' | 'business';
export type TaxStatus = 'settled' | 'pending';
export type SecurityClass = 'high_security' | 'medium_security' | 'standard';
export type AuditFrequency = 'annual' | 'semi_annual' | 'quarterly';

// ─── Core entity interfaces ───────────────────────────────────────────────────
export interface Entity {
  id: number;
  type: EntityType;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetLocation {
  id: number;
  name: string;
  country_code: string;
  custodian_name: string;
  lat: number | null;
  lon: number | null;
  insurance_amount: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  entity_id: number;
  location_id: number | null;
  name: string;
  asset_class: AssetClass;
  sub_class: string | null;     // e.g. 'gold', 'silver', 'platinum'
  product_type: string | null;  // e.g. 'bar', 'coin'
  brand: string | null;         // e.g. 'Maple Leaf', 'Umicore', 'C. Hafner'
  weight_per_unit: string | null;  // NUMERIC stored as string; value in the chosen unit
  weight_unit: string | null;      // 'g' or 'oz'
  tier: number | null;                  // 0=Grid-Down, 1=Digital, 2=Vaults, 3=Crypto; 0 is valid!
  current_value: string; // NUMERIC returned as string by pg driver
  security_class: SecurityClass;
  audit_frequency: AuditFrequency;
  last_audit_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (present when fetched with full list)
  entity_name?: string;
  entity_type?: EntityType;
  location_name?: string;
  custodian_name?: string;
  total_quantity?: string; // NUMERIC as string; sum of acquisition quantities
  acquisitions?: Acquisition[];
}

export interface Acquisition {
  id: number;
  asset_id: number;
  purchase_date: string;
  cost_basis: string; // NUMERIC as string
  quantity: string;   // NUMERIC as string
  tax_status: TaxStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalTag {
  id: number;
  asset_id: number;
  fiscal_year: number;
  fiscal_category: string;
  jurisdiction: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: number;
  from_entity_id: number;
  to_entity_id: number;
  amount: string; // NUMERIC as string
  transfer_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  from_entity_name?: string;
  to_entity_name?: string;
}

export interface ValuationSnapshot {
  id: number;
  asset_id: number;
  value: string; // NUMERIC as string
  snapshotted_at: string;
  created_at: string;
}

export interface Dealer {
  id: number;
  name: string;
  contact_notes: string | null;
  we_buy_gold_per_gram: string | null;           // Au 1g bars €/g (fallback)
  we_buy_gold_1oz_bar_per_gram: string | null;    // Au 1oz bars €/g
  we_buy_gold_50g_bar_per_gram: string | null;    // Au 50g bars €/g
  we_buy_gold_100g_bar_per_gram: string | null;   // Au 100g bars €/g
  we_buy_gold_coin_per_gram: string | null;       // Au coins €/g
  we_buy_silver_bar_per_gram: string | null;      // Ag bars €/g (storage fallback)
  we_buy_silver_100oz_bar_per_gram: string | null;// Ag 100oz physical bars €/g
  we_buy_silver_coin_per_gram: string | null;     // Ag coins €/g
  we_buy_platinum_per_gram: string | null;        // Pt €/g
  we_buy_palladium_per_gram: string | null;       // Pd €/g
  updated_at: string;
}

export interface TierConfig {
  tier_id: number;
  entity_scope: string; // 'personal' | 'business'
  tier_name: string;
  target_pct: string;  // NUMERIC(5,2) as string
  min_pct: string;     // NUMERIC(5,2) as string
  max_pct: string;     // NUMERIC(5,2) as string
  description: string | null;
}

// ─── Input types (for POST/PUT) ───────────────────────────────────────────────
export type CreateEntity = Omit<Entity, 'id' | 'created_at' | 'updated_at'>;
export type UpdateEntity = Partial<CreateEntity>;

export type CreateAssetLocation = Omit<AssetLocation, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAssetLocation = Partial<CreateAssetLocation>;

export type CreateAsset = Omit<
  Asset,
  'id' | 'created_at' | 'updated_at' | 'entity_name' | 'entity_type' | 'location_name' | 'custodian_name' | 'acquisitions'
>;
export type UpdateAsset = Partial<CreateAsset>;

export type CreateAcquisition = Omit<Acquisition, 'id' | 'asset_id' | 'created_at' | 'updated_at'>;
export type UpdateAcquisition = Partial<CreateAcquisition>;

export type CreateFiscalTag = Omit<FiscalTag, 'id' | 'asset_id' | 'created_at' | 'updated_at'>;
export type UpdateFiscalTag = Partial<CreateFiscalTag>;

export type CreateTransfer = Omit<
  Transfer,
  'id' | 'created_at' | 'updated_at' | 'from_entity_name' | 'to_entity_name'
>;

export type CreateValuationSnapshot = Pick<ValuationSnapshot, 'value'>;

// ─── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerRow {
  id: number;
  asset_id: number;
  purchase_date: string;
  cost_basis: string;      // NUMERIC as string
  quantity: string;        // NUMERIC as string
  tax_status: TaxStatus;
  description: string | null;
  asset_name: string;
  asset_class: AssetClass;
  sub_class: string | null;
  product_type: string | null;
  weight_per_unit: string | null;  // NUMERIC as string — value in the unit specified by weight_unit
  weight_unit: string | null;      // 'g' or 'oz'
  asset_current_value: string; // NUMERIC as string — total value of parent asset
  entity_name: string;
  entity_type: EntityType;
  location_name: string | null;
  created_at: string;
  updated_at: string;
}
export interface DashboardSummary {
  total_value: string;
  entity_id: number | null;
  asset_count: number;
  by_asset_class: Array<{
    asset_class: AssetClass;
    total_value: string;
    count: number;
  }>;
  tier_summary: {
    tiers: Array<{
      tier_id: number;
      name: string;
      current_pct: number;
      status: 'green' | 'amber' | 'red';
    }>;
    in_range: number;
  };
}

export interface HistoryPoint {
  bucket: string; // ISO date string
  value: string;  // NUMERIC as string
}

export interface DashboardHistory {
  points: HistoryPoint[];
  growth_pct: number | null;    // growth over the selected period window
  growth_1y_pct: number | null; // always 1-year growth, regardless of selected period
}

export interface RecentMovement {
  id: number;
  purchase_date: string;
  cost_basis: string;   // NUMERIC as string
  asset_name: string;
  asset_class: AssetClass;
  entity_name: string;
  is_gain: boolean;
}

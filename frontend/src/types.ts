export interface Asset {
  id: string;
  name: string;
  description: string | null;
  type_label: string;
  value: number;
  currency: string;
  created_at: string;
  updated_at: string;
  capital_weight_pct?: number;
}

export type AssetCreateInput = Pick<Asset, 'name' | 'description' | 'type_label' | 'value' | 'currency'>;
export type AssetUpdateInput = AssetCreateInput;

export interface Dimension {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type DimensionCreateInput = Pick<Dimension, 'name' | 'description'>;
export type DimensionUpdateInput = Partial<DimensionCreateInput>;

export interface AssetScore {
  dimension_id: string;
  dimension_name: string;
  is_default: boolean;
  score_id: string | null;
  gross_score: number | null;
  net_score: number | null;
}

export interface UpdateScoreInput {
  gross_score: number | null;
  net_score: number | null;
}

export interface Mitigation {
  id: string;
  asset_id: string;
  dimension_id: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type MitigationCreateInput = Pick<Mitigation, 'dimension_id' | 'description'>;
export type MitigationUpdateInput = Pick<Mitigation, 'description'>;

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export type TagCreateInput = Pick<Tag, 'name'>;

export interface AssetTagEntry {
  tag_id: string;
  tag_name: string;
}

export interface TagOverviewAsset {
  id: string;
  name: string;
  value: number;
  currency: string;
  capital_weight_pct: number;
}

export interface TagOverview {
  tag_id: string;
  tag_name: string;
  asset_count: number;
  combined_value: number;
  portfolio_pct: number;
  assets: TagOverviewAsset[];
}

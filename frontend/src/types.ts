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

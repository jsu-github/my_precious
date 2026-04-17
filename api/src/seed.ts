/**
 * Seed script — populates all Phase 2 tables with realistic data.
 * Safe to re-run: clears all data first (children before parents).
 * Run: npm run seed  (in api/ directory or inside container)
 */
import { knex } from './db';

async function seed() {
  console.log('[seed] Clearing existing data (FK-safe order)...');

  await knex('valuation_snapshots').delete();
  await knex('fiscal_tags').delete();
  await knex('acquisitions').delete();
  await knex('transfers').delete();
  await knex('assets').delete();
  await knex('asset_locations').delete();
  await knex('entities').delete();

  // ─── Entities ────────────────────────────────────────────────────────────────
  console.log('[seed] Inserting entities...');
  const [personal, corporate] = await knex('entities')
    .insert([
      {
        type: 'personal',
        name: 'Personal Principal',
        description: 'Direct personal holdings — primary wealth vehicle',
      },
      {
        type: 'business',
        name: 'Sovereign LLC',
        description: 'Offshore corporate entity for institutional-grade holdings',
      },
    ])
    .returning('*');

  // ─── Asset Locations ─────────────────────────────────────────────────────────
  console.log('[seed] Inserting asset locations...');
  const [zurich, london, singapore, isleOfMan] = await knex('asset_locations')
    .insert([
      {
        name: 'Zurich Private Vault',
        country_code: 'CHE',
        custodian_name: 'Swiss Gold Safe AG',
        lon: 8.5417,
        lat: 47.3769,
      },
      {
        name: 'London Custody Account',
        country_code: 'GBR',
        custodian_name: 'Barclays Wealth Management',
        lon: -0.1276,
        lat: 51.5074,
      },
      {
        name: 'Singapore Free Port',
        country_code: 'SGP',
        custodian_name: 'De Pury Pictet & Co',
        lon: 103.8198,
        lat: 1.3521,
      },
      {
        name: 'Isle of Man Trust',
        country_code: 'IMN',
        custodian_name: 'Equiom Group',
        lon: -4.5481,
        lat: 54.2361,
      },
    ])
    .returning('*');

  // ─── Assets (one per asset_class) ────────────────────────────────────────────
  console.log('[seed] Inserting assets...');
  const [
    gold,
    realEstate,
    equities,
    crypto,
    privateEquity,
    fixedIncome,
    cash,
    exotics,
  ] = await knex('assets')
    .insert([
      {
        entity_id: personal.id,
        location_id: zurich.id,
        name: 'C. Hafner Gold Bar 100g',
        asset_class: 'precious_metals',
        sub_class: 'gold',
        product_type: 'bar',
        brand: 'C. Hafner',
        weight_per_unit: '100',
        weight_unit: 'g',
        current_value: '2850000.00',
        security_class: 'high_security',
        audit_frequency: 'semi_annual',
        last_audit_date: '2024-06-15',
        description: '1,100 units LBMA-certified 999.9 Au bars in allocated storage',
      },
      {
        entity_id: corporate.id,
        location_id: zurich.id,
        name: 'Alpine Real Estate Fund',
        asset_class: 'real_estate',
        current_value: '4200000.00',
        security_class: 'standard',
        audit_frequency: 'annual',
        last_audit_date: '2024-01-10',
        description: 'Commercial property portfolio across Zurich and Geneva cantons',
      },
      {
        entity_id: personal.id,
        location_id: london.id,
        name: 'US Equity Portfolio',
        asset_class: 'equities',
        current_value: '1650000.00',
        security_class: 'standard',
        audit_frequency: 'quarterly',
        last_audit_date: '2024-09-30',
        description: 'Concentrated position in S&P 500 blue-chip stocks via IBKR',
      },
      {
        entity_id: personal.id,
        location_id: singapore.id,
        name: 'Bitcoin Cold Storage',
        asset_class: 'crypto',
        current_value: '980000.00',
        security_class: 'high_security',
        audit_frequency: 'quarterly',
        last_audit_date: '2024-09-01',
        description: '12.5 BTC on air-gapped Coldcard Mk4, multisig 2-of-3',
      },
      {
        entity_id: corporate.id,
        location_id: isleOfMan.id,
        name: 'Sovereign Capital Fund II',
        asset_class: 'private_equity',
        current_value: '3500000.00',
        security_class: 'high_security',
        audit_frequency: 'annual',
        last_audit_date: '2023-12-31',
        description: 'LP stake in closed-end infrastructure fund, 7-year lock-up',
      },
      {
        entity_id: corporate.id,
        location_id: zurich.id,
        name: 'Swiss Government Bonds',
        asset_class: 'fixed_income',
        current_value: '1200000.00',
        security_class: 'standard',
        audit_frequency: 'annual',
        last_audit_date: '2024-01-15',
        description: 'CHF-denominated Swiss Confederation bonds, 2.1% yield, 2028 maturity',
      },
      {
        entity_id: personal.id,
        location_id: london.id,
        name: 'USD Cash Reserve',
        asset_class: 'cash',
        current_value: '450000.00',
        security_class: 'standard',
        audit_frequency: 'quarterly',
        last_audit_date: '2024-09-30',
        description: 'Operating liquidity in Barclays multi-currency account',
      },
      {
        entity_id: personal.id,
        location_id: london.id,
        name: 'Classic Car Collection',
        asset_class: 'exotics',
        current_value: '620000.00',
        security_class: 'medium_security',
        audit_frequency: 'annual',
        last_audit_date: '2024-03-20',
        description: '1971 Ferrari 365 GTB/4 Daytona + 1968 Porsche 911 S, both concours condition',
      },
    ])
    .returning('*');

  // ─── Acquisitions ─────────────────────────────────────────────────────────────
  console.log('[seed] Inserting acquisitions...');
  await knex('acquisitions').insert([
    // Gold — two tranches
    {
      asset_id: gold.id,
      purchase_date: '2021-03-15',
      cost_basis: '1680000.00',
      quantity: '650.000000',
      tax_status: 'settled',
      description: 'Initial allocation — 650 oz at $2,585/oz average',
    },
    {
      asset_id: gold.id,
      purchase_date: '2023-10-02',
      cost_basis: '910000.00',
      quantity: '450.000000',
      tax_status: 'settled',
      description: 'Second tranche — 450 oz at $2,022/oz during dip',
    },
    // Real estate
    {
      asset_id: realEstate.id,
      purchase_date: '2019-06-28',
      cost_basis: '3200000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Fund entry at NAV — CHF 3.2M',
    },
    // Equities — two tranches
    {
      asset_id: equities.id,
      purchase_date: '2020-04-10',
      cost_basis: '900000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'COVID dip entry — diversified basket',
    },
    {
      asset_id: equities.id,
      purchase_date: '2022-01-18',
      cost_basis: '550000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Tech rebalance — added MSFT/NVDA weight',
    },
    // Crypto
    {
      asset_id: crypto.id,
      purchase_date: '2020-12-01',
      cost_basis: '237500.00',
      quantity: '12.500000',
      tax_status: 'settled',
      description: '12.5 BTC at $19,000/BTC average',
    },
    // Private equity
    {
      asset_id: privateEquity.id,
      purchase_date: '2022-07-01',
      cost_basis: '3000000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Fund II close — $3M commitment, 60% called',
    },
    // Fixed income
    {
      asset_id: fixedIncome.id,
      purchase_date: '2023-02-14',
      cost_basis: '1175000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Purchased at 97.9 (slight discount), now near par',
    },
    // Cash — two deposits
    {
      asset_id: cash.id,
      purchase_date: '2024-01-05',
      cost_basis: '250000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Q1 operating reserve deposit',
    },
    {
      asset_id: cash.id,
      purchase_date: '2024-07-15',
      cost_basis: '200000.00',
      quantity: '1.000000',
      tax_status: 'pending',
      description: 'Q3 dividend sweep to operating account',
    },
    // Classic cars — two purchases
    {
      asset_id: exotics.id,
      purchase_date: '2018-09-22',
      cost_basis: '360000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Ferrari 365 GTB/4 acquired at RM Sotheby\'s London',
    },
    {
      asset_id: exotics.id,
      purchase_date: '2022-04-05',
      cost_basis: '185000.00',
      quantity: '1.000000',
      tax_status: 'settled',
      description: 'Porsche 911 S acquired privately, post-restoration',
    },
  ]);

  // ─── Fiscal tags ──────────────────────────────────────────────────────────────
  console.log('[seed] Inserting fiscal tags...');
  await knex('fiscal_tags').insert([
    {
      asset_id: gold.id,
      fiscal_year: 2024,
      fiscal_category: 'Capital Asset',
      jurisdiction: 'Switzerland',
      notes: 'Long-term CGT treatment applies after 1-year hold period',
    },
    {
      asset_id: realEstate.id,
      fiscal_year: 2024,
      fiscal_category: 'Investment Property',
      jurisdiction: 'Switzerland',
      notes: 'Annual Swiss imputed rental value declaration required',
    },
    {
      asset_id: privateEquity.id,
      fiscal_year: 2024,
      fiscal_category: 'Alternative Investment',
      jurisdiction: 'Isle of Man',
      notes: 'Partners K-1 expected Q1 2025; track at-risk basis adjustments',
    },
    {
      asset_id: crypto.id,
      fiscal_year: 2024,
      fiscal_category: 'Digital Asset',
      jurisdiction: 'United Kingdom',
      notes: 'HMRC crypto asset guidance applies; 10% CGT on disposal',
    },
  ]);

  // ─── Transfers ────────────────────────────────────────────────────────────────
  console.log('[seed] Inserting transfers...');
  await knex('transfers').insert([
    {
      from_entity_id: corporate.id,
      to_entity_id: personal.id,
      amount: '50000.00',
      transfer_date: '2024-01-15',
      description: 'FY2023 shareholder distribution — directors\' fee',
    },
    {
      from_entity_id: personal.id,
      to_entity_id: corporate.id,
      amount: '500000.00',
      transfer_date: '2022-06-30',
      description: 'Capital injection for Sovereign Capital Fund II commitment',
    },
  ]);

  // ─── Valuation snapshots (initial values at seed time) ───────────────────────
  console.log('[seed] Inserting initial valuation snapshots...');
  const allAssets = [gold, realEstate, equities, crypto, privateEquity, fixedIncome, cash, exotics];
  await knex('valuation_snapshots').insert(
    allAssets.map((a) => ({
      asset_id: a.id,
      value: a.current_value,
      snapshotted_at: new Date().toISOString(),
    })),
  );

  console.log(
    `[seed] Done. Entities: 2, Locations: 4, Assets: ${allAssets.length}, Acquisitions: 12, Fiscal tags: 4, Transfers: 2, Snapshots: ${allAssets.length}`,
  );
  await knex.destroy();
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});

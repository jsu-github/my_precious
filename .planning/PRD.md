# PRD: The Unified Wealth Command Center

**Product:** Precious Dashboard — Sovereign Wealth Management System  
**Version:** 1.0  
**Status:** Draft  
**Date:** April 9, 2026  

---

## 1. Overview

### 1.1 Vision

The Unified Wealth Command Center is a private, self-hosted financial command center for high-net-worth individuals whose wealth spans personal investments, business assets, and international jurisdictions. It replaces fragmented spreadsheets and generic portfolio trackers with a single source of truth — purpose-built for complexity, total separation of entities, and real-time global visibility.

### 1.2 Problem Statement

Standard financial dashboards fail when:
- Personal and corporate balance sheets must remain legally separated but contextually visible together
- Assets are physically distributed across multiple jurisdictions and custodians
- Tax compliance requires granular, consistently tagged transaction data
- Performance evaluation must go below asset-class level to individual batches and purchase events

### 1.3 Design North Star

**"The Sovereign Vault"** — a dark, editorial interface conveying quiet authority, depth, and precision. Designed to feel like a private banking terminal, not a consumer fintech app. Every data point should feel like it belongs to a curated collection, not a crowded spreadsheet.

---

## 2. Users

Single-user, locally hosted tool. No authentication, no multi-tenancy. The sole user is a sophisticated investor managing:

- Multiple asset classes (precious metals, real estate, equities, crypto, private equity, collectibles)
- Dual ownership structures (personal holdings + business entity, e.g. Sovereign-LLC)
- Multi-jurisdictional asset locations (CH, NL, SG, domestic)
- Tax obligations in multiple regimes

---

## 3. Core Capabilities

### 3.1 Global Net Worth Dashboard

**Purpose:** Master view of total financial position across all entities and asset classes.

**Key Features:**
- **View Toggle:** Switch between `Personal`, `Business`, and `Combined` perspectives. Combined is the default "Global Net Worth" view.
- **Net Worth Header:** Displays total combined valuation (e.g. `$142,850,000`) with a breakdown of personal vs. business contribution.
- **Asset Allocation:** Visual breakdown across: Precious Metals, Real Estate, Public Equities, Private Equity, Crypto/Digital, Fixed Income, Exotics/Collectibles.
- **Global Hotspots Map:** Interactive world map showing asset locations with aggregate valuations pinned per jurisdiction.
- **Strategic Movements Feed:** Recent cross-entity transactions, valuation changes, and audit events.
- **Portfolio Health Score:** Composite indicator (`Optimal` / `Stable` / `Fortified` / `Pending`) reflecting audit status, tagging completeness, and compliance readiness.
- **Vault Security Status:** Custodian connectivity and last-audit timestamps.
- **Liquidity Summary:** Total Global Liquidity figure separate from total net worth.
- **Currency:** All values in USD with configurable display currency.

**Navigation Links:** Ledger, Analytics, Asset Locations, Tax & Compliance, Business vs. Personal.

---

### 3.2 Transaction Ledger (Acquisition Ledger)

**Purpose:** Complete, filterable record of every asset acquisition event.

**Key Features:**
- **Filter Controls:** Asset Class, Jurisdiction (`Domestic` / all jurisdictions), Legal Entity, Audit Status.
- **Table Columns:**
  - Asset Description
  - Asset Class
  - Acquisition Date (e.g. `AUG 05, 2023`)
  - Cost Basis
  - Current Value
  - Net ROI (absolute + percentage, e.g. `$140k / 4.8%`)
  - Custodian
  - Legal Entity
  - Audit Status (`Settled` / `Pending`)
- **Summary Bar:** Total portfolio cost basis, current value, and unrealized gain/loss.
- **Export:** Download audit-format CSV/PDF.
- **Asset Classes Supported:** Precious Metals, Real Estate, Public Equities, Private Equity, Fixed Income, Crypto/Digital, Exotics.

---

### 3.3 Performance & Analytics

**Purpose:** Deep-dive analysis of asset performance, alpha generation, and tax liability exposure.

**Key Features:**
- **Batch-Level Drill-Down:** Performance view per individual acquisition batch (e.g. `Bitcoin Batch`, `London Residential REIT`), not just asset class aggregates.
- **Columns:** Asset / Batch ID, Acquisition Date, Cost Basis, Current Value, P&L (absolute), ROI (%), Alpha vs. benchmark.
- **Alpha Analysis:** Benchmark comparison per asset class.
- **Tax Liability View:** Global Tax Liability aggregated and segmented by jurisdiction/entity.
- **Locked Assets:** Visual indicator for assets with restricted reporting status (e.g. `LOCKED` items in private equity).
- **Performance Charts:** Time-series value curves per asset class and portfolio total.
- **Metrics Highlighted:** ROI figures such as `+18.2%`, `+24.1%`, `-4.93%`.

---

### 3.4 Asset Locations & Inventory

**Purpose:** Physical custody and jurisdictional audit trail for every asset.

**Key Features:**
- **Location Map:** Full-page jurisdictional map with custody pins — Swiss vault, Dutch vault, Singapore freeport, domestic, Geneva.
- **Inventory Table Columns:**
  - Location / Asset
  - Specification (e.g. `99.99% FINE`, `IF / D-COLOR`, `12.50 ct`)
  - Quantity (oz, ct, BTC, units)
  - Current Valuation
  - Audit Frequency (`Monthly`, `Annual`, etc.)
  - Audit Status (`CERTIFIED`, `Audit Pending`)
  - Security Class (`Class-AAA Secure`, `Biometric Restricted`, `Minimal`)
- **Custody Detail Panel:** Lead Security Partner, last verified audit date, access restrictions (e.g. `Biometric Restricted`).
- **Jurisdictional Disclosures:** Per-jurisdiction legal entity association (entity assignments for tax/legal purposes).
- **Example Locations:** Zurich Vault (CH), Delft Secure NL, Le Freeport SG, Home / Personal Residence.
- **Live Market Connectivity:** Indicates current connection to pricing feeds per asset location.

---

### 3.5 Tax & Compliance Center

**Purpose:** Asset categorization for fiscal reporting and compliance readiness scoring.

**Key Features:**
- **Compliance Score:** Real-time score (percentage) reflecting completeness of fiscal tagging across all assets. Targets `Optimal`.
- **Asset Categorization Table:** Assign/edit fiscal category per asset. Columns: Asset Name, Current Valuation, Legal Entity, Fiscal Category, Actions.
- **Fiscal Categories:** Business-deductible, Personal Wealth, VAT-Exempt, Business Asset, etc.
- **Liability vs. Exemption View:** Visual split of total taxable exposure vs. exempted holdings.
- **Report Generation:** "Generate Fiscal Report" action — produces a categorized export ready for tax filings.
- **VAT Documentation Export:** Dedicated export for VAT-exempt assets (e.g. Swiss/NL precious metals).
- **Example Assets:** Geneva Residence, Primary Estate, Private Art Collection.
- **Supported Entities:** Personal + corporate legal entities (e.g. Leman Trust Ltd., personal).

---

### 3.6 Business vs. Personal Breakdown

**Purpose:** Strict accounting separation of business and personal holdings with cross-boundary transaction visibility, plus a consolidated roll-up view for total financial position.

**Key Features:**
- **Three-Mode View Toggle:** Switch between `Business`, `Personal`, and `Consolidated` perspectives. Each mode reshapes all tables, charts, and totals accordingly.
- **Dual-Column Balance View (Business / Personal):** Side-by-side view of Business Assets vs. Personal Assets with independent subtotals per entity.
- **Consolidated View:** Merged roll-up combining both entities into a single balance sheet. Assets are grouped by class (not by entity), with an `Entity` column indicating origin. Subtotals appear per asset class with a grand total at the foot. Clearly marked as "for internal reference only — not a legal combined entity."
- **Business Assets Breakdown:** Fixed Assets, Equity, Bonds, Investment Portfolio, Liquid Assets (with individual valuations).
- **Personal Assets Breakdown:** Equivalent breakdown for personal entity.
- **Cross-Boundary Transactions Log:** List of internal transfers between legal entities (e.g. "From Sovereign-LLC to Personal Principal") with date, description, and amount. Visible in all three modes; highlighted as inter-entity in Consolidated view to avoid double-counting.
- **Business Tax Tags:** Running tag summary for tax-deductible business items.
- **Entity Labels:** Corporate entity (e.g. `Sovereign-LLC`) and personal account (`Personal Principal`) clearly labeled throughout; in Consolidated mode, entity origin shown as a badge per row.
- **Sync Status:** Live indicator of last sync between entity databases (e.g. `Last Sync: 2m ago`).
- **Growth Distribution Chart:** Visual split of portfolio growth attributed to business vs. personal sources; Consolidated mode shows a stacked total.

---

## 4. Global System Features

### 4.1 Navigation

Six primary sections accessible via persistent sidebar:
1. Dashboard (Global Net Worth)
2. Ledger (Transaction Ledger)
3. Analytics (Performance & Analytics)
4. Assets (Asset Locations & Inventory)
5. Tax & Compliance
6. Business vs. Personal

### 4.2 Entity & View Switching

A persistent toggle at the top of every screen allows switching between:
- `Personal` — shows only personal holdings
- `Business` — shows only corporate entity holdings
- `Combined` / `Global` — unified view across all entities

All data, charts, and tables respond to this filter in real-time.

### 4.3 Real-Time Market Valuation

- Asset values update automatically from live market price feeds
- Precious metals priced in spot USD per oz/g/ct
- Crypto assets updated per exchange feed
- Public equities via market data API
- Valuation timestamps shown per asset (e.g. `-0.45% today`)
- Market connectivity status shown (`Market: Connected`)

### 4.4 Currency

- All values displayed in USD by default
- Currency selector available on every page (`Currency: USD`)

### 4.5 Audit Trail

- Every asset carries an audit status (`Settled`, `Pending`, `CERTIFIED`)
- Last audit timestamps shown at asset and system level
- Audit frequency configured per asset
- Global audit timestamp shown on dashboard (`Last Audit: 2h ago`)

### 4.6 Export & Reporting

- Ledger CSV/PDF export with audit-ready formatting
- Fiscal report generation per tax period
- VAT documentation export for exempt asset classes

---

## 5. Design System

### 5.1 Visual Language

**"Midnight Sovereign"** — dark-first, editorial, high-precision.

| Token | Value |
|-------|-------|
| Background | `#0b1326` (Midnight Blue-Black) |
| Surface Low | `#131b2e` |
| Surface High | `#222a3d` |
| Primary | `#e9c349` (Gold) |
| Secondary | `#4edea3` (Emerald — positive performance) |
| Tertiary | `#b9c7e0` (Slate — metadata) |
| Error | `#ffb4ab` (negative performance) |
| Headline Font | Newsreader (serif, editorial authority) |
| Body / Data Font | Inter (tabular numbers for financial figures) |
| Border Radius | `ROUND_FOUR` (architectural, precise) |

### 5.2 Key Principles

- **No 1px dividers** — surface nesting conveys structure
- **Glassmorphism** for modals and floating elements (`backdrop-blur: 24px`)
- **Tabular numbers** (`font-variant-numeric: tabular-nums`) on all financial figures
- **No pure black** — depth through layered midnight blues
- **Gold sparingly** — reserved for primary actions and positive wealth indicators
- **Emerald strictly** for positive P&L and growth indicators only

---

## 6. Technical Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite 5, PWA |
| API | Node.js + Express + TypeScript (port 3040) |
| Database | PostgreSQL 16 via Knex.js |
| Runtime | Docker Compose |
| Live Prices | External market data API (precious metals, crypto, equities) |

### 6.1 Data Model (High-Level Entities)

- **Asset** — physical or financial holding with class, custodian, location, legal entity, specifications
- **Acquisition** — purchase event: date, cost basis, quantity, legal entity
- **Location** — physical custody site: country, custodian name, security class, audit config
- **Entity** — legal ownership entity: personal or corporate
- **Fiscal Tag** — classification of an asset for tax reporting purposes
- **Price Feed** — live market price per asset type (spot, exchange)
- **Transfer** — cross-entity internal transaction log

---

## 7. Screens Summary

| Screen | File | Dimensions |
|--------|------|------------|
| Global Net Worth Dashboard | `screens/global-net-worth-dashboard/` | 2560×2600 |
| Transaction Ledger | `screens/transaction-ledger/` | 2560×3110 |
| Performance & Analytics | `screens/performance-analytics/` | 2560×3336 |
| Asset Locations & Inventory | `screens/asset-locations-inventory/` | 2560×2720 |
| Tax & Compliance Center | `screens/tax-compliance-center/` | 2560×2570 |
| Business vs. Personal Breakdown | `screens/business-vs-personal-breakdown/` | 2560×2048 |
| Design System | `design-system/midnight-sovereign.json` | — |

All screen references are relative to `.stitch/`.

---

## 8. Out of Scope (v1)

- Multi-user access / roles / authentication
- Manual data entry UI for live price feeds (prices come from API)
- Mobile-native app (PWA only)
- Automated broker/exchange integrations (manual + API only)
- Notifications / alerts (market threshold alerts deferred)
- i18n / localization

---

## 9. Success Criteria

| Criterion | Measure |
|-----------|---------|
| Complete net worth visibility | Global Net Worth figure reconciles across all entities and asset classes |
| Entity separation | Business and personal assets never commingle in reports or exports |
| Jurisdictional tracking | Every asset has a verified location and custodian with audit status |
| Tax readiness | Compliance Score reaches `Optimal` when all assets are fiscal-tagged |
| Performance granularity | P&L visible at acquisition-batch level, not just asset-class level |
| Data freshness | Live price valuations update on page load / configurable interval |

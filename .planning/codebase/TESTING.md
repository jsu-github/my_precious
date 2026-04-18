# TESTING.md
_Last updated: 2026-04-18_

## Overview
There is currently zero test coverage in this project. No test framework is installed in either `api/` or `frontend/`. No test files (`*.test.ts`, `*.spec.ts`, `__tests__/`) exist anywhere in the codebase. This document records the current state honestly, describes what testing infrastructure would look like if added, and identifies the highest-value targets.

---

## Current State

### Test Files
- **Count:** 0
- **Searched:** `api/**/*.test.ts`, `api/**/*.spec.ts`, `frontend/**/*.test.tsx`, `frontend/**/*.spec.tsx`, `**/__tests__/**`
- **Result:** No matches

### Testing Frameworks
Neither `api/package.json` nor `frontend/package.json` declares any testing dependency:

**`api/package.json` devDependencies:**
- `ts-node-dev` — dev reload only
- `typescript` — type checking only
- No: jest, vitest, mocha, supertest, sinon, chai, @testing-library/*

**`frontend/package.json` devDependencies:**
- `vite`, `@vitejs/plugin-react`, `tailwindcss`, `typescript`
- No: vitest, jest, @testing-library/react, @testing-library/jest-dom, jsdom, happy-dom

### Test Scripts
- `api/package.json` scripts: `dev`, `build`, `start`, `migrate`, `seed` — no `test` script
- `frontend/package.json` scripts: `dev`, `build`, `preview` — no `test` script

### CI/CD
No CI pipeline is configured. No GitHub Actions workflows exist in `.github/workflows/`.

---

## Why No Tests (By Design)

This is a **single-user personal tool** with no auth, no multi-tenancy, and no shared infrastructure. The project prioritizes rapid iteration over test coverage. From `.github/copilot-instructions.md`:

> "Single-user, fully local, no auth."

The absence of tests is a deliberate tradeoff in v1, not an oversight. However, certain modules are now stable enough to benefit from tests.

---

## Recommended Testing Stack (When Adding)

### Frontend: Vitest + React Testing Library

Vitest integrates natively with Vite (no extra config), making it the natural choice.

**Install:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**`frontend/vite.config.ts` addition:**
```typescript
import { defineConfig } from 'vite';
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

**`frontend/src/test-setup.ts`:**
```typescript
import '@testing-library/jest-dom';
```

**Test file location:** Co-located next to the source file:
```
frontend/src/utils/metalPricing.ts
frontend/src/utils/metalPricing.test.ts
```

### API: Vitest (or Jest) + Supertest

```bash
cd api
npm install -D vitest supertest @types/supertest
```

Or jest + ts-jest for closer parity with existing projects.

---

## Highest-Value Test Targets

### Priority 1: Pure Utility Functions (zero setup cost)

These are pure functions with no dependencies — trivial to test:

**`frontend/src/utils/metalPricing.ts`** — `getDealerRate()` and `toGrams()`
```typescript
// frontend/src/utils/metalPricing.test.ts
import { getDealerRate, toGrams } from './metalPricing';

describe('toGrams', () => {
  it('returns value unchanged for gram unit', () => {
    expect(toGrams(100, 'g')).toBe(100);
  });
  it('converts troy oz to grams', () => {
    expect(toGrams(1, 'oz')).toBeCloseTo(31.1035);
  });
});

describe('getDealerRate', () => {
  const dealer = { we_buy_gold_per_gram: '58.50', we_buy_gold_coin_per_gram: '57.00', ... };
  it('returns coin rate for gold coins', () => {
    expect(getDealerRate(dealer, 'gold', 'coin')).toBe(57.00);
  });
  it('returns null for unknown metal', () => {
    expect(getDealerRate(dealer, 'titanium', null)).toBeNull();
  });
});
```

**Page helper functions** — `formatCurrency`, `formatBucketLabel`, `auditFreshness`, `computeStatus` (all in page files but extractable):
- These are currently embedded in page files (`DashboardPage.tsx`, `TierPage.tsx`)
- Candidates for extraction to `frontend/src/utils/` to make them testable

### Priority 2: API Route Integration Tests

**`api/src/routes/assets.ts`** — Test CRUD operations against a test database.

Key behaviors to verify:
- `GET /api/assets` returns array sorted by `current_value` desc
- `PUT /api/assets/:id` creates a `valuation_snapshots` row when `current_value` changes
- `PUT /api/assets/:id` does NOT create a snapshot when `current_value` is unchanged
- `DELETE /api/assets/:id` returns 204
- `GET /api/assets/9999` returns 404 with `{ error: { message: 'Asset not found', status: 404 } }`

```typescript
// api/src/routes/assets.test.ts (example shape)
import request from 'supertest';
import { app } from '../index';

describe('PUT /api/assets/:id', () => {
  it('snapshots valuation when current_value changes', async () => {
    // arrange: create asset
    // act: PUT with new current_value
    // assert: valuation_snapshots row exists
  });
});
```

### Priority 3: Migration Integrity

Verify that all migrations run cleanly `up` and `down` without errors:
```typescript
// api/migrations/migrations.test.ts
it('all migrations run up and down without error', async () => {
  await knex.migrate.latest();
  await knex.migrate.rollback(undefined, true); // all the way down
  await knex.migrate.latest();                   // back up
});
```

---

## Mocking Philosophy

**What to mock:**
- External services (none currently in this project)
- Database (use a dedicated test DB or in-memory SQLite for API tests)

**What NOT to mock:**
- `metalPricing.ts` utility functions — they are pure, test them directly
- Knex queries in integration tests — use a real test database

**API mocking in frontend tests:**
Mock `frontend/src/api.ts` at module level:
```typescript
vi.mock('../api', () => ({
  api: {
    assets: {
      list: vi.fn().mockResolvedValue([]),
    },
  },
}));
```

---

## Test Coverage Goals (If Adopted)

| Area | Priority | Rationale |
|------|----------|-----------|
| `frontend/src/utils/metalPricing.ts` | High | Complex branching logic for rate selection; wrong rates = real money errors |
| `api/src/routes/assets.ts` PUT snapshot logic | High | Business-critical side effect; easy to break silently |
| Migration up/down integrity | Medium | Ensures schema rollback works |
| `TierPage.tsx` `computeStatus()` | Medium | Status badge logic has edge cases at boundaries |
| Page rendering smoke tests | Low | High setup cost, low failure rate for personal tools |

---

## Coverage Tooling (When Ready)

**Vitest (frontend):**
```bash
npx vitest run --coverage
```

**Istanbul (API):**
```bash
npx c8 vitest run
```

No coverage thresholds are currently configured or enforced.

---

*Testing analysis: 2026-04-18*

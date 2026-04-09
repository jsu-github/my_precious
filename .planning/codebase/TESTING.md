# TESTING.md — Test Structure & Practices

## Status: Pre-Implementation

No test files exist. No testing framework has been configured. The project has not yet been initialized with application code.

---

## Current State

```
$ find . -name "*.test.*" -o -name "*.spec.*" -o -name "jest.config*" -o -name "vitest.config*" 2>/dev/null
(no results)
```

No tests, no test configuration, no CI pipeline files found in the repository.

---

## Expected Testing Stack (Inferred from Architecture)

Given the React 18 + Vite and Node.js + Express stack, the natural testing setup would be:

### Frontend
| Concern | Expected Tool |
|---------|--------------|
| Unit / component tests | Vitest (native to Vite) |
| Component rendering | React Testing Library |
| E2E | Playwright (likely, given PWA) |

### API
| Concern | Expected Tool |
|---------|--------------|
| Unit / integration tests | Jest or Vitest |
| HTTP layer | Supertest |

---

## Test Paths (Intended, not yet created)

```
frontend/
  src/
    components/
      __tests__/       # Component unit tests (RTL)
    pages/
      __tests__/       # Page integration tests
api/
  src/
    __tests__/         # Route + service tests (Supertest)
```

---

## Key Areas to Test (Derived from PRD + Architecture)

### High Priority
1. **Entity filter logic** — Personal / Business / Combined view toggle must isolate data correctly across all 6 screens
2. **Score calculation** — Capital-weighted portfolio scoring using 1–5 scale; `SCORE_LABELS[score - 1]` mapping
3. **Acquisition-to-asset P&L** — Batch-level drill-down must correctly calculate ROI from cost basis and current value
4. **Cross-entity transfer detection** — Transfers between legal entities must not double-count in Consolidated view

### Medium Priority
5. **Fiscal tag compliance score** — Percentage calculation of tagged vs. untagged assets
6. **API error boundary** — `request()` helper must throw `error.message`; components must catch correctly
7. **Migration idempotency** — `createTableIfNotExists` pattern must not throw on re-run

### Lower Priority
8. **Currency display formatting** — USD tabular numbers with consistent alignment
9. **Audit status propagation** — `Settled` / `Pending` / `CERTIFIED` labels round-tripping DB ↔ API ↔ UI

---

## Testing Strategy Notes

- No auth to test — single-user, backend trusts all requests
- No live price feeds in v1 — valuation tests use static fixtures
- All entity separation tests are critical (legal business/personal separation is a core feature)
- Financial figure formatting (tabular numbers, USD) deserves dedicated snapshot tests

---

## CI/CD

No CI/CD configuration exists (no `.github/workflows/` directory). To be established when implementation begins.

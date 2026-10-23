# Enterprise Playwright + TypeScript E2E Automation Template (Gemini 4 Argon)

A production-ready, multi-tenant B2B End-to-End (E2E) test automation architecture built with [Playwright](https://playwright.dev/), TypeScript, and **Google Antigravity (Gemini 4 Argon)** skills.

> **Interactive Architecture Blueprint**: View the live guide at [**deniszilai2000.github.io/playwright-ts-starter-kit/ARCHITECTURE_GUIDE.html**](https://deniszilai2000.github.io/playwright-ts-starter-kit/ARCHITECTURE_GUIDE.html) or open the 12-slide executive deck at [**deniszilai2000.github.io/playwright-ts-starter-kit/presentation.html**](https://deniszilai2000.github.io/playwright-ts-starter-kit/presentation.html).

---

## Key Architectural Pillars

1. **Zero Runtime AI Flakiness, Maximum Agentic Velocity**:
   - Test runs execute 100% deterministic TypeScript locally and in CI.
   - **Gemini 4 Argon** operates alongside the repository via [`.agent/skills/`](./.agent/skills/) (`project-setup`, `local-setup`, `create-tests`, `heal-locators`) and [`GEMINI.md`](./GEMINI.md).
2. **3-Tier Environment Safety (`dev` / `stage` / `prod`)**:
   - `resolveContext()` resolves `TENANT` + `ENV` or parses `CUSTOM_URL` overrides so staging preview links are never mistaken for `dev`.
   - Mutating specs guard execution with `test.skip(!isDevRun(), 'dev only')`.
   - `stage` runs strictly read-only `@prod-safe` tests; `prod` enforces `grep: /@prod-safe/` in [`playwright.config.ts`](./playwright.config.ts).
   - [`protected-data.constants.ts`](./src/constants/protected-data.constants.ts) prevents mutation of golden baseline records even on `dev`.
3. **Enterprise `BasePage` & Helper Toolkit**:
   - **Bidirectional Virtualized Table Reader** (`readAllVirtualizedRows` keyed by `data-index`).
   - **Secret Redaction** (`fillSecure` masks credentials in HTML/Allure step logs).
   - **In-Memory Bearer Token Borrowing** ([`auth-token.helper.ts`](./src/helpers/auth-token.helper.ts)) for hybrid UI + GraphQL/REST checks.
   - **Deep File Download Verification** ([`file-parsers.helper.ts`](./src/helpers/file-parsers.helper.ts)) for CSV, PDF (`%PDF-`), and ZIP/XLSX binary streams.

---

## Repository Structure

```text
├── GEMINI.md                          # Workspace rules & conventions for Gemini 4 Argon
├── ARCHITECTURE_GUIDE.html            # Client-facing interactive architecture portal
├── presentation.html                  # 12-slide executive pitch deck (arrow-key navigable)
├── .mcp.json                          # Playwright MCP server config for live DOM exploration
├── eslint.config.mjs                  # ESLint + eslint-plugin-playwright quality gate
├── playwright.config.ts               # Dynamic URL resolution, timezone pinning, setup chain
├── ci/github-actions-playwright.yml   # Sharded Push/PR, Nightly, and Manual CI workflow
├── .agent/
│   ├── rules/qa-safety-guardrails.md  # Mandatory safety & workflow guardrails
│   └── skills/                        # 4 Gemini 4 Argon skills (project/local/create/heal)
├── src/
│   ├── fixtures/base.fixture.ts       # Dependency-injected Page Objects & API clients
│   ├── pages/
│   │   ├── base.page.ts               # Shared enterprise UI toolkit
│   │   ├── auth.page.ts               # SSO / IAM authentication Page Object shell
│   │   └── navigation.page.ts         # App shell, sidebar & user menu Page Object shell
│   ├── helpers/
│   │   ├── environment.helper.ts      # resolveContext(), isDevRun()
│   │   ├── credential-provider.helper.ts # .env / CI Secrets / HashiCorp Vault abstraction
│   │   ├── data-supply.helper.ts      # EntitySupplyManager (findOrProvision + auto-cleanup)
│   │   ├── smart-locator.helper.ts    # Two-layer locator diagnostics & candidate ranking
│   │   ├── auth-token.helper.ts       # InMemoryTokenClient
│   │   ├── feature-flags.helper.ts    # Runtime feature flag client
│   │   ├── file-parsers.helper.ts     # Downloaded file content parsers
│   │   ├── tms.helper.ts              # Test Management System step/case linker
│   │   └── tms-api.helper.ts          # TMS REST API client & CI run naming
│   └── constants/
│       └── protected-data.constants.ts
└── tests/
    ├── setup/
    │   ├── auth.setup.ts              # One-time SSO/IAM login -> playwright/.auth/user.json
    │   └── seed-data.setup.ts         # Dev-only baseline data seeder
    └── e2e/
        └── smoke/navigation.spec.ts   # Clean template spec (1 TMS step = 1 test)
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run ESLint + TypeScript quality gates
npm run lint && npm run type-check

# 3. Run the full suite on dev (includes auth-setup -> seed-data -> specs)
npm run test:dev

# 4. Run read-only @prod-safe smoke suite on stage
npm run test:stage
```

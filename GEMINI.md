# GEMINI.md — Enterprise Playwright E2E Automation Guide (Gemini 4 Argon / Antigravity)

This repository is an enterprise-grade Playwright + TypeScript E2E automation suite paired with **Google Antigravity (Gemini 4 Argon)**.
**Zero runtime AI flakiness**: Nothing inside the test execution calls an LLM at runtime. Playwright executes deterministic TypeScript locally and in CI, while **Gemini 4 Argon** operates as your interactive engineering partner via `.agent/skills/` and `.agent/rules/`.

---

## 1. Environments & Safety Gates

| Environment | Policy | Allowed Operations |
| :--- | :--- | :--- |
| **`dev`** | **WRITES ALLOWED** | Full regression. Creating, updating, cancelling, and deleting test records is allowed. Specs must clean up created records or rely on `seed-data.setup.ts`. |
| **`stage`** | **READ-ONLY** | Post-deploy smoke & sanity verification (`ENV=stage npm run test:stage`). No creates, imports, or state mutations. |
| **`prod`** | **LOCKED TO `@prod-safe`** | `playwright.config.ts` automatically restricts `ENV=prod` to `@prod-safe` specs. Never mutate data on `prod`. |

### Mandatory Code Guards
- **Mutating specs**: Always add `test.skip(!isDevRun(), 'Mutating test: runs on dev environment only');` as the first line of any test or `describe` block that writes data.
- **Protected baseline records**: Never modify or delete IDs listed in `src/constants/protected-data.constants.ts`. Call `assertNotProtected(id)` in cleanup helpers.

---

## 2. House Style & Conventions

1. **Zero Selectors in Spec Files**:
   - Specs (`tests/e2e/**/*.spec.ts`) never call `page.locator()`, `page.getByRole()`, or `page.getByTestId()` directly.
   - All selectors and interactions belong in Page Objects (`src/pages/**/*.page.ts`) extending `BasePage` and injected via `src/fixtures/base.fixture.ts`.
2. **Locator Priority (ArgonQA™ Stability Score 0–100)**:
   - `getByTestId()` / `getByTestAttr()` (`data-test`, `data-testid`, `data-qa`, `data-cy`) $\rightarrow$ `getByRole()` $\rightarrow$ `getByLabel()` $\rightarrow$ visible text fallback.
3. **One TMS Step = One Playwright Test**:
   - Prefix test titles with the step number from the Test Management System case, e.g.:
     `test('1 — application shell loads and renders expected document title @prod-safe', ...)`
   - Link every test to its case ID using `await tmsCase(100001);`.
4. **Waiting, Not Sleeping**:
   - Never use `page.waitForTimeout()`. Use retrying assertions (`expect.poll()`, `expect(...).toPass()`, `expect(locator).toBeVisible()`).
5. **Secure Credential Handling**:
   - Always use `this.fillSecure(locator, secret, label)` in Page Objects for passwords and tokens so secrets never appear in plain text in HTML or Allure step logs.
6. **Tags**:
   - `@smoke` (fast core checks), `@sanity` (critical business paths), `@regression` (full suite), `@prod-safe` (strictly read-only).

---

## 3. Antigravity Skills (`.agent/skills/`)

Invoke these skills directly in Antigravity with **Gemini 4 Argon**:
- **`project-setup`** (`.agent/skills/project-setup/SKILL.md`): One-time wizard after cloning/forking this template for a new client project.
- **`local-setup`** (`.agent/skills/local-setup/SKILL.md`): Per-engineer local environment setup, `.env` generation, and verification run.
- **`create-tests`** (`.agent/skills/create-tests/SKILL.md`): Full ticket-to-PR workflow (reads ticket & dev PR diff $\rightarrow$ explores live app $\rightarrow$ designs TMS steps $\rightarrow$ scaffolds Page Object & Spec).
- **`heal-locators`** (`.agent/skills/heal-locators/SKILL.md`): Diagnoses broken locators from `test-results/`, inspects the live DOM, proposes 3 candidates, patches the Page Object, and verifies.

---

## 4. Daily Command Cheat Sheet

```bash
# Run a single spec on dev
ENV=dev npx playwright test tests/e2e/smoke/navigation.spec.ts --project=chromium

# Stage run (read-only specs only)
ENV=stage npx playwright test --grep @prod-safe --project=chromium

# Run against an ephemeral PR preview URL
CUSTOM_URL=https://preview.example.com npx playwright test --grep @smoke

# Watch execution in headed mode with slowMo
SLOWMO=500 npx playwright test --headed tests/e2e/smoke/navigation.spec.ts

# Quality gates (ESLint + Playwright rules + TypeScript)
npm run lint && npm run type-check
```

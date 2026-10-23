---
name: create-tests
description: End-to-end ticket-to-spec automation workflow. Reads a ticket and dev PR/MR diff, explores the live app, proposes test cases (1 step = 1 test), links TMS case IDs, and writes the Page Object and Playwright spec.
---

# `/create-tests` — Ticket-to-Automated-Spec Workflow

Use this skill to turn a feature ticket or user story into production-ready Page Objects and Playwright specs.

## Workflow Steps

1. **Read Ticket & Developer Changes**:
   - Read the ticket description and all comments (from Jira/Linear/GitHub Issue or user-provided text).
   - If a developer PR/MR is available, inspect the changed files, commit messages, and testing notes to catch any undocumented UI changes or feature flags.

2. **Explore Target Page on `dev`**:
   - Resolve the target `dev` or `CUSTOM_URL` environment.
   - Inspect the live page DOM / accessibility structure (or use a temporary scratch probe under `tests/e2e/zz-probe.spec.ts` and remove it immediately after inspection).
   - Identify stable attributes (`data-test`, `data-testid`, `data-qa`, `data-cy`, ARIA roles).

3. **Propose Test Cases for Approval**:
   - Propose a structured list of test steps covering:
     - **Happy path**
     - **Negative / validation checks**
     - **Edge cases & persistence**
     - **Read-only (`@prod-safe`) vs. mutating (`dev`-only) classification**
   - Wait for the user to approve or adjust the proposed steps before creating TMS cases or writing code.

4. **Create / Link TMS Case IDs**:
   - Map each approved step to the `1 TMS step = 1 Playwright test` convention (`"1 — ..."`, `"2 — ..."`).
   - Attach `await tmsCase(caseId)` inside each test.

5. **Implement Page Object & Spec**:
   - Add or extend the relevant Page Object in `src/pages/` extending `BasePage`. Wrap actions in `this.step(...)` and register any new Page Object in `src/fixtures/base.fixture.ts`.
   - Write the spec in `tests/e2e/` with zero raw selectors, `isDevRun()` guards on mutating tests, and retrying assertions (`expect.poll`, `toPass`).

6. **Verify & Clean Up**:
   - Remove any `tests/e2e/zz-*` scratch files.
   - Run the targeted spec (`ENV=dev npx playwright test <spec-path> --project=chromium`).
   - Run `npm run type-check` and present a concise summary of coverage added.

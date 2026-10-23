---
description: Mandatory QA Automation Guardrails & Environment Safety Rules for Gemini 4 Argon
globs: ["**/*.ts", "**/*.yml"]
---

# QA Automation Guardrails (Gemini 4 Argon)

1. **Ask Before External or Irreversible Actions**:
   - Always ask the user for confirmation before merging PRs/MRs, posting comments on Jira/Linear tickets, changing ticket statuses, or modifying Test Management System cases outside the agreed workflow.
2. **Environment Safety**:
   - `stage` is strictly read-only (`@prod-safe`). `prod` is never touched in day-to-day QA work.
   - Only `dev` receives writes, imports, or state transitions. Every mutating test must guard with `test.skip(!isDevRun(), 'dev only')`.
3. **Feature Flags**:
   - Never toggle shared environment feature flags automatically; ask the user to switch them during designated QA windows.
4. **Targeted Test Runs Only**:
   - Run only the targeted spec file(s) under development (`npx playwright test <path-to-spec> --project=chromium`).
   - Never launch two concurrent Playwright runs against `dev` at the same time.
5. **Known Bug Discipline (`test.fail()`)**:
   - Add `test.fail()` only when a bug has been explicitly confirmed with the user and linked to a bug ticket ID in a code comment. Remove `test.fail()` as soon as the fix is deployed.

---
name: heal-locators
description: Diagnoses failing locators from test-results/, inspects the live DOM, proposes up to 3 resilient selector candidates, patches the Page Object after user confirmation, and re-runs the test to verify.
---

# `/heal-locators` — Interactive Locator Self-Healing Skill

Use this skill when a test fails due to a broken or changed DOM selector.

## Workflow Steps

1. **Locate the Failure**:
   - Inspect the latest failure output in `test-results/` (error context, trace metadata, or JUnit report) to identify the exact failing Page Object method, line number, and selector.

2. **Inspect the Current DOM**:
   - Open or probe the target route on `dev` to inspect the current DOM tree around the broken element.

3. **Propose Up to 3 Scored Candidates (0–100 Stability Score)**:
   - Rank up to 3 replacement locators using our ArgonQA™ selector hierarchy:
     1. Dedicated test attribute (`getByTestId` / `getByTestAttr` — Score: 95–98)
     2. Accessible role + name (`getByRole` — Score: 88–92)
     3. Form label or semantic text (`getByLabel` / `getByText` — Score: 75–85)
     4. Scoped CSS locator (last resort)
   - Show the user the exact diff proposed for the Page Object in `src/pages/` and wait for confirmation.

4. **Patch & Verify**:
   - Apply the approved locator change in `src/pages/`.
   - Re-run the single failing spec (`npx playwright test <spec> --project=chromium`) and `npm run type-check` to confirm the fix passes cleanly.

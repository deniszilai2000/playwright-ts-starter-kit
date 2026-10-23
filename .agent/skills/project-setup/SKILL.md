---
name: project-setup
description: One-time interactive onboarding wizard after cloning or forking the enterprise Playwright E2E template for a new client project.
---

# `/project-setup` — Client Project Onboarding Wizard

Use this skill immediately after cloning or forking this repository for a new client or product team.

## Workflow Steps

1. **Gather Project Parameters (Single Pass)**:
   Ask the user for the following details in one concise prompt:
   - **Project / Product Name** (e.g., `acme-order-portal-e2e`)
   - **Tenant Identifier(s)** (e.g., `acme`, `globex`)
   - **Base URL Pattern** for `dev`, `stage`, and `prod` (e.g., `https://app-{tenant}-{env}.clientdomain.com`)
   - **Primary Test Attribute** (`data-test`, `data-testid`, `data-qa`, or `data-cy`)
   - **Default Timezone** (e.g., `America/New_York`, `Europe/London`)
   - **GitHub Repository URL** (e.g., `https://github.com/deniszilai2000/<repo-name>`)
   - **TestOps Platform** (`TestRail`, `Xray`, `Qase`, `Zephyr`, or `None`)

2. **Confirm Summary**:
   Present a clean summary table of the proposed configuration and wait for user approval before editing files.

3. **Apply Configuration Across Repository**:
   Once confirmed, update all target files in one pass:
   - `package.json` (`name`, `description`, `repository`)
   - `src/helpers/environment.helper.ts` (`SAAS_DOMAIN`, URL pattern, default tenant & timezone)
   - `playwright.config.ts` (`testIdAttribute`, reporters)
   - `.env.example` (default tenant, timezone, TMS/Issue Tracker URLs)
   - `ci/github-actions-playwright.yml` (update tenant options and copy to `.github/workflows/playwright.yml`)
   - `GEMINI.md` and `README.md`

4. **Verify**:
   Run `npm run type-check` and `npx playwright test --list --project=chromium` to confirm zero TypeScript or configuration errors.

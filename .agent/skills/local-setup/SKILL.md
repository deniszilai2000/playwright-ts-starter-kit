---
name: local-setup
description: Per-engineer local machine setup wizard. Checks prerequisites, installs dependencies and browsers, creates .env, verifies auth setup, and prints the daily command cheat sheet.
---

# `/local-setup` — Engineer Machine Onboarding Skill

Use this skill when setting up the repository on a new machine or onboarding a QA engineer/developer.

## Workflow Steps

1. **Verify Prerequisites**:
   - Check Node.js version (`node -v`, requires v20+) and npm version (`npm -v`).
   - Check if git and GitHub CLI (`gh`) are installed and authenticated (`gh auth status`).

2. **Install Dependencies & Browsers**:
   - Run `npm ci` (or `npm install` if lockfile is being updated).
   - Ensure Chromium is installed for local runs (`npx playwright install chromium`).

3. **Configure `.env`**:
   - If `.env` does not exist, copy `.env.example` to `.env`.
   - Prompt the user for any missing local credentials (`TEST_USERNAME`, `TEST_PASSWORD`, optional `TMS_TOKEN`), or leave defaults if running against the demo environment.

4. **Smoke Verification**:
   - Run `npm run type-check`.
   - Run a single fast smoke check (`npx playwright test tests/e2e/smoke/navigation.spec.ts --project=chromium`) to verify browser launch, auth setup (`playwright/.auth/user.json`), and reporting.

5. **Output Quick-Start Cheat Sheet**:
   - Print the project's most common commands (`npm run test:dev`, `npm run test:stage`, `SLOWMO=500`, `npm run type-check`).

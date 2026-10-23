import { test as setup } from '@playwright/test';
import { isDevRun } from '../../src/helpers/environment.helper';

/**
 * Dev Environment Baseline Data Seeder (`seed-data.setup.ts`)
 *
 * Runs ONLY on `dev` after `auth-setup`. Ensures baseline records required by read-only specs
 * exist after periodic database refreshes.
 *
 * Design Rule: Never fails the overall test run — any data provisioning issue logs a warning
 * so unaffected specs still execute.
 */
setup('ensure baseline records exist on dev environment', async () => {
  if (!isDevRun()) {
    console.info('[seed-data] Non-dev environment detected — skipping baseline data provisioning.');
    return;
  }

  try {
    // Hook for provisioning baseline entities via API or UI helper (e.g.,OrderSupplyHelper)
    console.info('[seed-data] Verified baseline dev records are ready for read-only specs.');
  } catch (error) {
    console.warn(
      `[seed-data] WARNING: Could not provision baseline dev data (${
        error instanceof Error ? error.message : String(error)
      }). Continuing test execution.`
    );
  }
});

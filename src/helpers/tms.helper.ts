import { test } from '@playwright/test';

/**
 * Links a Playwright test to a Test Management System (Testmo / TestRail / Xray) case ID.
 * Adds both a structured annotation and a clickable URL in HTML / Allure / JUnit reports.
 *
 * House convention:
 *   One TMS step = One Playwright test (e.g., `"1 — user can filter active orders by status"`).
 *   Multiple tests in the same describe block can link to the same parent `tmsCase(id)`.
 */
export async function tmsCase(caseId: number | string): Promise<void> {
  const cleanId = String(caseId).replace(/^C/i, '');
  const tmsBaseUrl = (process.env.TMS_URL ?? 'https://acme.testmo.net').replace(/\/+$/, '');
  const projectId = process.env.TMS_PROJECT_ID ?? '1';
  const caseUrl = `${tmsBaseUrl}/repositories/${projectId}?case_id=${cleanId}`;

  test.info().annotations.push({
    type: 'tms_case',
    description: `C${cleanId} (${caseUrl})`,
  });
}

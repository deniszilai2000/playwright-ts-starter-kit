import { test } from '@playwright/test';

export interface TmsCaseMetadata {
  severity?: 'blocker' | 'critical' | 'normal' | 'minor';
  feature?: string;
}

/**
 * ArgonQA™ Multi-Provider TestOps Traceability Linker (`tmsCase`)
 *
 * Connects every Playwright test step to your client's Test Management platform
 * (TestRail, Xray, Qase, Zephyr Scale, or Linear) and embeds clickable links
 * inside Playwright HTML, JUnit XML, and Allure reports.
 */
export async function tmsCase(
  caseId: number | string,
  metadata?: TmsCaseMetadata
): Promise<void> {
  const normalizedId = String(caseId).replace(/^(TC-|C)/i, '');
  const baseUrl = (process.env.TMS_URL ?? 'https://testops.example.com').replace(/\/+$/, '');
  const projectId = process.env.TMS_PROJECT_ID ?? 'PRJ';
  const caseUrl = `${baseUrl}/projects/${projectId}/cases/${normalizedId}`;

  test.info().annotations.push({
    type: 'tms_case',
    description: `TC-${normalizedId} (${caseUrl})`,
  });

  if (metadata?.severity) {
    test.info().annotations.push({
      type: 'severity',
      description: metadata.severity,
    });
  }

  if (metadata?.feature) {
    test.info().annotations.push({
      type: 'feature',
      description: metadata.feature,
    });
  }
}

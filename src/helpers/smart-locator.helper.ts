import { Page, Locator } from '@playwright/test';

export interface LocatorCandidate {
  strategy: 'testId' | 'role' | 'label' | 'text' | 'css';
  expression: string;
  confidence: number;
}

/**
 * Two-Layer Locator Healing Helper (`SmartLocatorDiagnostics`)
 *
 * Layer 1 (Runtime Diagnostic — Zero File Mutation):
 *   When a selector fails during a test run, scans the live page's accessibility and DOM attributes
 *   and logs up to 3 ranked replacement candidates (`ARIA role -> testId/hook -> label/text -> CSS`)
 *   directly to the console and test attachment.
 *
 * Layer 2 (Interactive Patching via `/heal-locators`):
 *   Reads the diagnostic log + `test-results/`, confirms the best candidate with the engineer,
 *   patches the Page Object in `src/pages/`, and re-runs the spec.
 */
export class SmartLocatorDiagnostics {
  static async suggestCandidatesOnFailure(
    page: Page,
    failedDescription: string
  ): Promise<LocatorCandidate[]> {
    const candidates: LocatorCandidate[] = [];

    try {
      const snapshot = await page.evaluate((desc) => {
        const lower = desc.toLowerCase();
        const matches: Array<{ strategy: string; expr: string; score: number }> = [];

        const elements = Array.from(
          document.querySelectorAll('button, a, input, select, textarea, [data-test], [data-testid], [data-hook], [role]')
        );

        for (const el of elements.slice(0, 200)) {
          const hook = el.getAttribute('data-hook');
          const testId = el.getAttribute('data-test') || el.getAttribute('data-testid');
          const role = el.getAttribute('role') || el.tagName.toLowerCase();
          const text = (el.textContent || '').trim().slice(0, 50);
          const ariaLabel = el.getAttribute('aria-label') || '';

          const combined = `${hook ?? ''} ${testId ?? ''} ${text} ${ariaLabel}`.toLowerCase();
          if (!lower || combined.includes(lower)) {
            if (hook) {
              matches.push({ strategy: 'testId', expr: `this.getByHook('${hook}')`, score: 0.98 });
            } else if (testId) {
              matches.push({ strategy: 'testId', expr: `this.getByTestId('${testId}')`, score: 0.96 });
            } else if (text && (role === 'button' || role === 'a')) {
              const mappedRole = role === 'a' ? 'link' : 'button';
              matches.push({
                strategy: 'role',
                expr: `this.page.getByRole('${mappedRole}', { name: '${text}' })`,
                score: 0.9,
              });
            }
          }
        }
        return matches.slice(0, 3);
      }, failedDescription);

      for (const item of snapshot) {
        candidates.push({
          strategy: item.strategy as LocatorCandidate['strategy'],
          expression: item.expr,
          confidence: item.score,
        });
      }

      if (candidates.length > 0) {
        console.warn(
          `\n[SmartLocator] Selector failed for "${failedDescription}". Top candidates:\n` +
            candidates.map((c, idx) => `  ${idx + 1}. ${c.expression} (confidence: ${c.confidence})`).join('\n') +
            `\nRun /heal-locators in Antigravity to apply the fix interactively.\n`
        );
      }
    } catch {
      // Page may already be closed
    }

    return candidates;
  }

  static async resolveWithDiagnostics(
    page: Page,
    primaryLocator: Locator,
    description: string
  ): Promise<Locator> {
    const count = await primaryLocator.count();
    if (count === 0) {
      await this.suggestCandidatesOnFailure(page, description);
    }
    return primaryLocator;
  }
}

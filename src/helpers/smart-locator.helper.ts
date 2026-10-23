import { Page, Locator } from '@playwright/test';

export interface LocatorCandidate {
  strategy: 'testId' | 'testAttr' | 'role' | 'label' | 'text';
  expression: string;
  /** ArgonQA™ 0–100 Selector Stability Score based on semantic resilience */
  stabilityScore: number;
}

/**
 * ArgonQA™ DOM Resilience & Stability Scoring Engine (`SmartLocatorDiagnostics`)
 *
 * Computes a deterministic 0–100 Stability Score for candidate selectors when a UI change breaks a locator:
 * - Stage 1 (Non-Mutating Runtime Telemetry): Scans the live DOM accessibility tree on failure and logs
 *   the top 3 scored replacement selectors without modifying files in CI.
 * - Stage 2 (Agentic Repair via `/heal-locators`): Gemini 4 Argon presents the scored candidates,
 *   patches the Page Object in `src/pages/` upon approval, and re-verifies the spec.
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
          document.querySelectorAll(
            'button, a, input, select, textarea, [data-test], [data-testid], [data-qa], [data-cy], [role]'
          )
        );

        for (const el of elements.slice(0, 200)) {
          const testId = el.getAttribute('data-test') || el.getAttribute('data-testid');
          const qaAttr = el.getAttribute('data-qa') || el.getAttribute('data-cy');
          const role = el.getAttribute('role') || el.tagName.toLowerCase();
          const text = (el.textContent || '').trim().slice(0, 50);
          const ariaLabel = el.getAttribute('aria-label') || '';

          const combined = `${testId ?? ''} ${qaAttr ?? ''} ${text} ${ariaLabel}`.toLowerCase();
          if (!lower || combined.includes(lower)) {
            if (testId) {
              matches.push({ strategy: 'testId', expr: `this.getByTestId('${testId}')`, score: 98 });
            } else if (qaAttr) {
              matches.push({ strategy: 'testAttr', expr: `this.getByTestAttr('${qaAttr}')`, score: 95 });
            } else if (ariaLabel && (role === 'button' || role === 'a' || role === 'input')) {
              const mappedRole = role === 'a' ? 'link' : role === 'input' ? 'textbox' : 'button';
              matches.push({
                strategy: 'role',
                expr: `this.page.getByRole('${mappedRole}', { name: '${ariaLabel}' })`,
                score: 92,
              });
            } else if (text && (role === 'button' || role === 'a')) {
              const mappedRole = role === 'a' ? 'link' : 'button';
              matches.push({
                strategy: 'role',
                expr: `this.page.getByRole('${mappedRole}', { name: '${text}' })`,
                score: 88,
              });
            }
          }
        }
        return matches.sort((a, b) => b.score - a.score).slice(0, 3);
      }, failedDescription);

      for (const item of snapshot) {
        candidates.push({
          strategy: item.strategy as LocatorCandidate['strategy'],
          expression: item.expr,
          stabilityScore: item.score,
        });
      }

      if (candidates.length > 0) {
        console.warn(
          `\n[ArgonQA Resilience Engine] Selector mismatch for "${failedDescription}". Scored replacements:\n` +
            candidates
              .map((c, idx) => `  ${idx + 1}. ${c.expression} [Stability Score: ${c.stabilityScore}/100]`)
              .join('\n') +
            `\nInvoke /heal-locators in Antigravity to apply the verified patch.\n`
        );
      }
    } catch {
      // Browser context already closed
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

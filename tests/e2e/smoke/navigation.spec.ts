import { test } from '../../../src/fixtures/base.fixture';
import { isDevRun } from '../../../src/helpers/environment.helper';
import { tmsCase } from '../../../src/helpers/tms.helper';

/**
 * Clean Client Onboarding Spec Template (`navigation.spec.ts`)
 *
 * House Conventions:
 * - Zero raw selectors in spec files (all interactions go through Page Objects in `src/pages/`).
 * - One TMS step = One Playwright test (`"1 — ..."`, `"2 — ..."`).
 * - `@smoke`, `@sanity`, `@regression`, and `@prod-safe` tags.
 * - `isDevRun()` safety gate on any test that mutates state.
 */
test.describe('Application Shell & Navigation (@smoke @sanity @regression)', () => {
  test('1 — application shell loads and renders expected document title @prod-safe', async ({
    navigationPage,
  }) => {
    await tmsCase(100001);

    await navigationPage.navigateTo('https://example.com');
    await navigationPage.expectPageTitleToMatch(/Example Domain/i);
  });

  test('2 — state-mutating workflow executes only on verified dev environment', async ({
    navigationPage,
  }) => {
    test.skip(!isDevRun(), 'Mutating test: runs on dev environment only');
    await tmsCase(100002);

    await navigationPage.navigateTo('https://example.com');
    await navigationPage.expectPageTitleToMatch(/Example Domain/i);
  });
});

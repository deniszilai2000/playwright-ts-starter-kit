import { test } from '../../../src/fixtures/base.fixture';
import { isDevRun } from '../../../src/helpers/environment.helper';
import { tmsCase } from '../../../src/helpers/tms.helper';

/**
 * Interactive Enterprise Showcase Spec (`navigation.spec.ts`)
 *
 * House Conventions:
 * - Zero raw selectors in spec files (all interactions go through Page Objects in `src/pages/`).
 * - One TMS step = One Playwright test (`"1 — ..."`, `"2 — ..."`).
 * - `@smoke`, `@sanity`, `@regression`, and `@prod-safe` tags.
 * - `isDevRun()` safety gate on any test that mutates state.
 */
test.describe('Application Shell, Catalog & Checkout (@smoke @sanity @regression)', () => {
  test('1 — application shell loads, authenticates with masked credentials, and sorts catalog @prod-safe', async ({
    navigationPage,
  }) => {
    await tmsCase(100001);

    await navigationPage.navigateTo('https://www.saucedemo.com');
    await navigationPage.expectPageTitleToMatch(/Swag Labs/i);
    await navigationPage.authenticateDemoPortal('standard_user', 'secret_sauce');
    await navigationPage.sortCatalogBy('hilo');
  });

  test('2 — state-mutating multi-step checkout workflow executes only on verified dev environment', async ({
    navigationPage,
  }) => {
    test.skip(!isDevRun(), 'Mutating test: runs on dev environment only');
    await tmsCase(100002);

    await navigationPage.navigateTo('https://www.saucedemo.com');
    await navigationPage.authenticateDemoPortal('standard_user', 'secret_sauce');
    await navigationPage.addCoreItemsToCart();
    await navigationPage.completeCheckoutFlow('Denis', 'Zilai', '400001');
  });
});

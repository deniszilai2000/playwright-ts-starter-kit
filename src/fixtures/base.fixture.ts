import { test as baseTest } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { NavigationPage } from '../pages/navigation.page';
import { InMemoryTokenClient } from '../helpers/auth-token.helper';
import { FeatureFlagClient } from '../helpers/feature-flags.helper';
import { EntitySupplyManager } from '../helpers/data-supply.helper';

/**
 * Dependency-Injected Page Objects & Helpers
 * Every spec imports `{ test, expect }` from `src/fixtures/base.fixture.ts`
 * so tests never instantiate Page Objects manually or touch raw DOM selectors.
 */
export type AppFixtures = {
  authPage: AuthPage;
  navigationPage: NavigationPage;
  tokenClient: InMemoryTokenClient;
  featureFlags: FeatureFlagClient;
  dataSupply: EntitySupplyManager;
};

export const test = baseTest.extend<AppFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  navigationPage: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },
  tokenClient: async ({ page }, use) => {
    await use(new InMemoryTokenClient(page));
  },
  featureFlags: async ({ request }, use) => {
    await use(new FeatureFlagClient(request));
  },
  dataSupply: async ({}, use) => {
    const manager = new EntitySupplyManager();
    await use(manager);
    await manager.flushCleanupQueue();
  },
});

export { expect } from '@playwright/test';

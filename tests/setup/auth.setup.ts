import { test as setup } from '../../src/fixtures/base.fixture';
import { STORAGE_STATE_PATH } from '../../playwright.config';
import { CredentialProvider } from '../../src/helpers/credential-provider.helper';
import { resolveContext } from '../../src/helpers/environment.helper';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Global Authentication Setup (`auth.setup.ts`)
 *
 * Signs in once (resolving credentials via `CredentialProvider` — `.env`, CI secrets, or HashiCorp Vault)
 * and saves cookies + localStorage to `playwright/.auth/user.json`.
 * Configured with 2 retries because enterprise SSO/IAM app pickers occasionally
 * stall on initial redirect; spinning up a fresh browser context resolves it cleanly.
 */
setup.describe.configure({ retries: 2 });

setup('authenticate once and save storage state', async ({ authPage, page }) => {
  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const skipAuth = (process.env.SKIP_AUTH_SETUP ?? 'true').toLowerCase() === 'true';
  const ctx = resolveContext();
  const { username, password } = await CredentialProvider.getCredentials(ctx.tenant, ctx.environment);

  if (skipAuth || !username || !password || password === 'replace-with-secure-password') {
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    return;
  }

  await authPage.navigateTo('/');
  await authPage.signIn(username, password);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

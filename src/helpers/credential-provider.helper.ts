export type CredentialProviderMode = 'env' | 'vault';

export interface AuthCredentials {
  username: string;
  password: string;
  source: CredentialProviderMode;
}

/**
 * Vault-Ready Credential Provider (`CredentialProvider`)
 *
 * Abstracts how test credentials are resolved across local machines and CI:
 * - Default (`CREDENTIAL_PROVIDER=env`): Reads `TEST_USERNAME` and `TEST_PASSWORD` from `.env` or CI secrets.
 * - Enterprise Vault (`CREDENTIAL_PROVIDER=vault`): Authenticates to HashiCorp Vault via JWT/Token
 *   and fetches tenant-scoped credentials (`{tenant}.username` / `{tenant}.password`), falling back
 *   to environment variables if Vault is unreachable.
 */
export class CredentialProvider {
  static async getCredentials(tenant: string = 'client', environment: string = 'dev'): Promise<AuthCredentials> {
    const mode = ((process.env.CREDENTIAL_PROVIDER ?? 'env').trim().toLowerCase() as CredentialProviderMode);

    if (mode === 'vault' && process.env.VAULT_ADDR) {
      try {
        const vaultCreds = await this.fetchFromVault(tenant, environment);
        if (vaultCreds) {
          return vaultCreds;
        }
      } catch (error) {
        console.warn(
          `[CredentialProvider] Vault lookup failed (${
            error instanceof Error ? error.message : String(error)
          }); falling back to environment variables.`
        );
      }
    }

    return {
      username: process.env.TEST_USERNAME?.trim() ?? '',
      password: process.env.TEST_PASSWORD?.trim() ?? '',
      source: 'env',
    };
  }

  private static async fetchFromVault(
    tenant: string,
    environment: string
  ): Promise<AuthCredentials | null> {
    const vaultAddr = process.env.VAULT_ADDR!.replace(/\/+$/, '');
    const vaultToken = process.env.VAULT_TOKEN?.trim();
    const secretPath = process.env.VAULT_SECRET_PATH ?? `v1/secret/data/qa/${environment}`;

    if (!vaultToken) {
      return null;
    }

    const response = await fetch(`${vaultAddr}/${secretPath.replace(/^\/+/, '')}`, {
      headers: { 'X-Vault-Token': vaultToken },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: { data?: Record<string, string> };
    };
    const fields = payload.data?.data ?? {};

    const username = fields[`${tenant}.username`] ?? fields.username;
    const password = fields[`${tenant}.password`] ?? fields[`${tenant}.passwrod`] ?? fields.password;

    if (!username || !password) {
      return null;
    }

    return { username, password, source: 'vault' };
  }
}

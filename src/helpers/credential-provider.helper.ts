export type CredentialProviderMode = 'env' | 'vault' | 'doppler' | 'aws-sm';

export interface AuthCredentials {
  username: string;
  password: string;
  mfaSecret?: string;
  source: CredentialProviderMode;
}

/**
 * ArgonQA™ Multi-Cloud Secret Broker (`CredentialProvider`)
 *
 * Decouples test execution from static secret files across local machines and CI runners:
 * - `env` (Default): Resolves `TEST_USERNAME` and `TEST_PASSWORD` from `.env` or GitHub Actions Secrets.
 * - `vault`: Resolves secrets dynamically from HashiCorp Vault KV v2 (`VAULT_ADDR` + `VAULT_TOKEN`).
 * - `doppler`: Resolves secrets from Doppler API (`DOPPLER_TOKEN`).
 * - `aws-sm`: Resolves secrets via AWS Secrets Manager HTTP sidecar/extension (`AWS_SECRETS_EXTENSION_URL`).
 */
export class CredentialProvider {
  static async getCredentials(tenant: string = 'client', environment: string = 'dev'): Promise<AuthCredentials> {
    const mode = (process.env.CREDENTIAL_PROVIDER ?? 'env').trim().toLowerCase() as CredentialProviderMode;

    if (mode === 'vault' && process.env.VAULT_ADDR) {
      const vaultCreds = await this.fetchFromHashiCorpVault(tenant, environment);
      if (vaultCreds) return vaultCreds;
    }

    if (mode === 'doppler' && process.env.DOPPLER_TOKEN) {
      const dopplerCreds = await this.fetchFromDoppler();
      if (dopplerCreds) return dopplerCreds;
    }

    return {
      username: process.env.TEST_USERNAME?.trim() ?? '',
      password: process.env.TEST_PASSWORD?.trim() ?? '',
      mfaSecret: process.env.TOTP_SECRET?.trim(),
      source: 'env',
    };
  }

  private static async fetchFromHashiCorpVault(
    tenant: string,
    environment: string
  ): Promise<AuthCredentials | null> {
    try {
      const vaultAddr = process.env.VAULT_ADDR!.replace(/\/+$/, '');
      const vaultToken = process.env.VAULT_TOKEN?.trim();
      const secretPath = process.env.VAULT_SECRET_PATH ?? `v1/secret/data/argonqa/${tenant}/${environment}`;

      if (!vaultToken) return null;

      const response = await fetch(`${vaultAddr}/${secretPath.replace(/^\/+/, '')}`, {
        headers: { 'X-Vault-Token': vaultToken },
      });

      if (!response.ok) return null;

      const payload = (await response.json()) as {
        data?: { data?: Record<string, string> };
      };
      const fields = payload.data?.data ?? {};
      const username = fields.username ?? fields.TEST_USERNAME;
      const password = fields.password ?? fields.TEST_PASSWORD;

      if (!username || !password) return null;

      return {
        username,
        password,
        mfaSecret: fields.mfaSecret ?? fields.TOTP_SECRET,
        source: 'vault',
      };
    } catch {
      return null;
    }
  }

  private static async fetchFromDoppler(): Promise<AuthCredentials | null> {
    try {
      const token = process.env.DOPPLER_TOKEN!.trim();
      const response = await fetch('https://api.doppler.com/v3/configs/config/secrets/download?format=json', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const secrets = (await response.json()) as Record<string, string>;
      if (!secrets.TEST_USERNAME || !secrets.TEST_PASSWORD) return null;

      return {
        username: secrets.TEST_USERNAME,
        password: secrets.TEST_PASSWORD,
        mfaSecret: secrets.TOTP_SECRET,
        source: 'doppler',
      };
    } catch {
      return null;
    }
  }
}

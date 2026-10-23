import { APIRequestContext } from '@playwright/test';

export type FeatureFlagMap = Record<string, boolean>;

/**
 * Queries runtime feature flags from the target environment (`GET /api/feature-flags`)
 * so specs can dynamically adapt or skip steps when flags differ between dev and stage.
 */
export class FeatureFlagClient {
  private cache: FeatureFlagMap | null = null;

  constructor(
    private readonly request: APIRequestContext,
    private readonly endpoint: string = '/api/feature-flags'
  ) {}

  /**
   * Fetches all feature flags for the environment, falling back to env var overrides if offline.
   */
  async getAllFlags(): Promise<FeatureFlagMap> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const response = await this.request.get(this.endpoint, { timeout: 5_000 });
      if (response.ok()) {
        const body = (await response.json()) as FeatureFlagMap;
        this.cache = body;
        return body;
      }
    } catch {
      // Fallback to local environment variable flags when running against mock/demo targets
    }

    this.cache = this.readLocalEnvFlags();
    return this.cache;
  }

  /**
   * Checks whether a specific feature flag is enabled in the target environment.
   */
  async isEnabled(flagName: string, defaultValue: boolean = false): Promise<boolean> {
    const flags = await this.getAllFlags();
    if (Object.prototype.hasOwnProperty.call(flags, flagName)) {
      return Boolean(flags[flagName]);
    }
    return defaultValue;
  }

  private readLocalEnvFlags(): FeatureFlagMap {
    const result: FeatureFlagMap = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('FEATURE_FLAG_') && value !== undefined) {
        result[key] = value.toLowerCase() === 'true' || value === '1';
      }
    }
    return result;
  }
}

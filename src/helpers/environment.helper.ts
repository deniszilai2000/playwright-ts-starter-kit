export type TargetEnvironment = 'dev' | 'stage' | 'prod';

export interface ResolvedExecutionContext {
  tenant: string;
  environment: TargetEnvironment;
  baseURL: string;
  isCustomUrl: boolean;
  timezoneId: string;
}

const VALID_ENVIRONMENTS: readonly TargetEnvironment[] = ['dev', 'stage', 'prod'];

/**
 * Resolves the active tenant, environment, and baseURL.
 * If CUSTOM_URL is provided, inspects the hostname to infer whether it points
 * to a stage or prod instance so safety gates (`isDevRun()`) cannot be bypassed.
 */
export function resolveContext(): ResolvedExecutionContext {
  const rawTenant = (process.env.TENANT ?? 'client').trim().toLowerCase();
  const rawEnv = (process.env.ENV ?? 'dev').trim().toLowerCase();
  const customUrl = process.env.CUSTOM_URL?.trim();
  const timezoneId = process.env.TIMEZONE?.trim() || 'UTC';

  // Pin Node process timezone so Date utilities match browser context timezone
  process.env.TZ = timezoneId;

  let environment: TargetEnvironment = VALID_ENVIRONMENTS.includes(rawEnv as TargetEnvironment)
    ? (rawEnv as TargetEnvironment)
    : 'dev';
  let tenant = rawTenant;

  if (customUrl) {
    const parsed = parseTenantAndEnvFromUrl(customUrl);
    if (parsed.tenant) tenant = parsed.tenant;
    if (parsed.environment) environment = parsed.environment;

    return {
      tenant,
      environment,
      baseURL: customUrl.replace(/\/+$/, ''),
      isCustomUrl: true,
      timezoneId,
    };
  }

  const saasDomain = (process.env.SAAS_DOMAIN ?? 'example.com').trim();
  const baseURL = `https://app-${tenant}-${environment}.${saasDomain}`;

  return {
    tenant,
    environment,
    baseURL,
    isCustomUrl: false,
    timezoneId,
  };
}

/**
 * Extracts tenant and environment tokens from a URL pattern like:
 * https://app-{tenant}-{env}.domain.com or https://{env}.{tenant}.domain.com
 */
function parseTenantAndEnvFromUrl(url: string): {
  tenant?: string;
  environment?: TargetEnvironment;
} {
  try {
    const { hostname } = new URL(url);
    const lowerHost = hostname.toLowerCase();

    const patternMatch = lowerHost.match(/^app-([a-z0-9]+)-(dev|stage|prod)\./);
    if (patternMatch) {
      return {
        tenant: patternMatch[1],
        environment: patternMatch[2] as TargetEnvironment,
      };
    }

    if (lowerHost.includes('-prod.') || lowerHost.startsWith('prod.')) {
      return { environment: 'prod' };
    }
    if (lowerHost.includes('-stage.') || lowerHost.includes('-staging.') || lowerHost.startsWith('stage.')) {
      return { environment: 'stage' };
    }
    if (lowerHost.includes('-dev.') || lowerHost.startsWith('dev.')) {
      return { environment: 'dev' };
    }
  } catch {
    // Fallback if URL is malformed
  }
  return {};
}

/**
 * Safety gate: Returns true ONLY when targeting a verified `dev` environment.
 * Use at the top of mutating specs:
 *   `test.skip(!isDevRun(), 'Mutating test: runs on dev environment only');`
 */
export function isDevRun(): boolean {
  const ctx = resolveContext();
  if (ctx.environment !== 'dev') {
    return false;
  }
  const lowerUrl = ctx.baseURL.toLowerCase();
  if (lowerUrl.includes('stage') || lowerUrl.includes('prod')) {
    return false;
  }
  return true;
}

/**
 * Returns true if the current run is targeting staging (read-only smoke verification).
 */
export function isStageRun(): boolean {
  return resolveContext().environment === 'stage';
}

/**
 * Returns true if the current run is targeting production (restricted to @prod-safe).
 */
export function isProdRun(): boolean {
  return resolveContext().environment === 'prod';
}

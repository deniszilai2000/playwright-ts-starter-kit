import { Page, APIRequestContext } from '@playwright/test';

/**
 * Modern SPAs often keep JWT / Bearer access tokens strictly in memory (Closure / Redux / Zustand)
 * rather than localStorage or cookies for XSS protection.
 *
 * `InMemoryTokenClient` borrows the active Bearer token from the application's next outgoing
 * API/GraphQL network request so tests can execute authenticated backend checks directly.
 */
export class InMemoryTokenClient {
  private cachedBearerToken: string | null = null;

  constructor(
    private readonly page: Page,
    private readonly apiPattern: RegExp = /\/(api|graphql|middleware)\b/i
  ) {}

  /**
   * Captures the Authorization Bearer header from the next matching network request
   * triggered by the page (or reloads/polls if needed).
   */
  async captureBearerToken(triggerAction?: () => Promise<void>, timeoutMs: number = 10_000): Promise<string> {
    if (this.cachedBearerToken) {
      return this.cachedBearerToken;
    }

    const requestPromise = this.page.waitForRequest(
      (req) => {
        const authHeader = req.headers()['authorization'] ?? '';
        return this.apiPattern.test(req.url()) && authHeader.toLowerCase().startsWith('bearer ');
      },
      { timeout: timeoutMs }
    );

    if (triggerAction) {
      await triggerAction();
    }

    const interceptedRequest = await requestPromise;
    const authHeader = interceptedRequest.headers()['authorization'];
    this.cachedBearerToken = authHeader;
    return authHeader;
  }

  /**
   * Executes a GraphQL query/mutation using the borrowed in-memory Bearer token.
   */
  async queryGraphQL<TData = unknown>(
    request: APIRequestContext,
    endpoint: string,
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<{ data?: TData; errors?: Array<{ message: string }> }> {
    const token = await this.captureBearerToken();
    const response = await request.post(endpoint, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      data: { query, variables },
    });

    return (await response.json()) as { data?: TData; errors?: Array<{ message: string }> };
  }

  /**
   * Clears the cached token if the session was rotated or logged out.
   */
  clearTokenCache(): void {
    this.cachedBearerToken = null;
  }
}

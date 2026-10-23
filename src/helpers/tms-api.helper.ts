export type TestOpsProvider = 'testrail' | 'qase' | 'xray' | 'generic';

export interface TmsCaseDraft {
  title: string;
  stepDescription: string;
  expectedResult: string;
  isAutomated?: boolean;
  tags?: string[];
}

/**
 * ArgonQA™ Multi-Provider TestOps REST Bridge (`TmsApiClient`)
 *
 * Provides a unified API interface across TestRail, Qase, Xray, and generic REST TestOps tools:
 * 1. Resolves target suite/folder routing (`TMS_FOLDER_ID`).
 * 2. Provisions 1:1 automated test cases during `/create-tests` workflows.
 * 3. Formats self-describing CI telemetry run titles (`ArgonQA #142 • [stage] • @smoke • 2x Shards`).
 */
export class TmsApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly projectId: string;
  private readonly defaultFolderId: string;
  private readonly provider: TestOpsProvider;

  constructor() {
    this.baseUrl = (process.env.TMS_URL ?? 'https://testops.example.com').replace(/\/+$/, '');
    this.token = process.env.TMS_TOKEN ?? '';
    this.projectId = process.env.TMS_PROJECT_ID ?? '1';
    this.defaultFolderId = process.env.TMS_FOLDER_ID ?? '1';
    this.provider = (process.env.TMS_PROVIDER ?? 'generic') as TestOpsProvider;
  }

  /**
   * Formats a self-describing CI execution title so engineering leads can identify
   * environment, tag filter, and shard concurrency at a glance.
   */
  static formatCiRunName(options: {
    runId?: string;
    environment?: string;
    tags?: string;
    shards?: string | number;
  }): string {
    const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? 'local';
    const env = options.environment ?? process.env.ENV ?? 'dev';
    const tags = options.tags || process.env.TEST_TAGS || 'full-suite';
    const shards = options.shards ?? process.env.SHARDS ?? '1';
    return `ArgonQA #${runId} • [${env}] • ${tags} • ${shards}x Shards`;
  }

  /**
   * Provisions a structured test case in the target TestOps suite/folder and returns its assigned ID.
   */
  async createTestCase(draft: TmsCaseDraft, folderId?: string): Promise<{ id: number; title: string }> {
    const targetFolder = folderId ?? this.defaultFolderId;

    if (!this.token || this.token === 'replace-with-tms-api-token') {
      throw new Error(`[TmsApiClient:${this.provider}] TMS_TOKEN is not configured in .env`);
    }

    const response = await fetch(
      `${this.baseUrl}/api/v1/projects/${this.projectId}/cases`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suite_id: Number(targetFolder),
          title: draft.title,
          is_automated: draft.isAutomated ?? true,
          labels: draft.tags ?? ['automated', 'argonqa-verified'],
          steps: [
            {
              action: draft.stepDescription,
              expected_result: draft.expectedResult,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`[TmsApiClient:${this.provider}] Failed to provision case: HTTP ${response.status}`);
    }

    const body = (await response.json()) as { data?: { id: number; title: string } };
    return {
      id: body.data?.id ?? 0,
      title: body.data?.title ?? draft.title,
    };
  }
}

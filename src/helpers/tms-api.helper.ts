export interface TmsFolder {
  id: number;
  name: string;
  parentId: number | null;
}

export interface TmsCaseDraft {
  title: string;
  stepDescription: string;
  expectedResult: string;
  isAutomated?: boolean;
  tags?: string[];
}

/**
 * Test Management System (Testmo / TestRail) REST Client (`TmsApiClient`)
 *
 * Used by `/create-tests` and CI reporting jobs to:
 * 1. Resolve or create target folders (`TMS_FOLDER_ID`).
 * 2. Create 1:1 test cases with `ai-generated` and `automated` tags.
 * 3. Format identifiable CI run names (`Run #142 | stage | @smoke | 2 shards`).
 */
export class TmsApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly projectId: string;
  private readonly defaultFolderId: string;

  constructor() {
    this.baseUrl = (process.env.TMS_URL ?? 'https://acme.testmo.net').replace(/\/+$/, '');
    this.token = process.env.TMS_TOKEN ?? '';
    this.projectId = process.env.TMS_PROJECT_ID ?? '1';
    this.defaultFolderId = process.env.TMS_FOLDER_ID ?? '1';
  }

  /**
   * Builds a standardized, self-describing CI run name so every Test Management run
   * is immediately identifiable without cross-referencing GitHub Actions logs.
   */
  static formatCiRunName(options: {
    runId?: string;
    environment?: string;
    tags?: string;
    shards?: string | number;
  }): string {
    const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? 'local';
    const env = options.environment ?? process.env.ENV ?? 'dev';
    const tags = options.tags || process.env.TEST_TAGS || 'all';
    const shards = options.shards ?? process.env.SHARDS ?? '1';
    return `Pipeline ${runId} | ${env} | ${tags} | ${shards} shard(s)`;
  }

  /**
   * Creates a new test case in the configured TMS folder and returns its case ID.
   */
  async createTestCase(draft: TmsCaseDraft, folderId?: string): Promise<{ id: number; title: string }> {
    const targetFolder = folderId ?? this.defaultFolderId;

    if (!this.token || this.token === 'replace-with-tms-api-token') {
      throw new Error('[TmsApiClient] TMS_TOKEN is not configured in .env');
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
          folder_id: Number(targetFolder),
          name: draft.title,
          custom_automation_status: draft.isAutomated ? 'Yes' : 'No',
          tags: draft.tags ?? ['automated', 'ai-generated'],
          steps: [
            {
              description: draft.stepDescription,
              expected: draft.expectedResult,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`[TmsApiClient] Failed to create TMS case: HTTP ${response.status}`);
    }

    const body = (await response.json()) as { result?: { id: number; name: string } };
    return {
      id: body.result?.id ?? 0,
      title: body.result?.name ?? draft.title,
    };
  }
}

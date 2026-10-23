import { Page, Locator, Response, expect, test } from '@playwright/test';

export interface VirtualizedTableOptions {
  /** Scroll container locator */
  scrollContainer: Locator;
  /** Row locator inside the container (each row must expose `data-index` or `data-row-index`) */
  rowLocator: Locator;
  /** Optional locator showing total count text e.g. "Showing 142 entries" */
  totalCountLocator?: Locator;
  /** Scroll step in pixels per iteration */
  scrollStepPx?: number;
  /** Max scroll iterations to guard against infinite loops */
  maxIterations?: number;
}

/**
 * ArgonQA™ Enterprise BasePage Engine
 *
 * Architectural Guarantees:
 * 1. Spec files NEVER touch raw selectors. All DOM interactions flow through Page Objects extending BasePage.
 * 2. Every interaction is wrapped in `this.step(...)` for structured trace & report telemetry.
 * 3. Sensitive fields ALWAYS use `fillSecure()` so secrets never leak into HTML, JUnit, or Allure step logs.
 * 4. Built-in API response interception (`interceptApiCall`) and frontend SLA assertions (`assertInteractionSla`).
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wraps a page object action in a named Playwright/Allure test step.
   */
  protected async step<T>(title: string, body: () => Promise<T>): Promise<T> {
    return test.step(title, body);
  }

  /**
   * Navigates to a relative or absolute path and waits for DOM content to be interactive.
   */
  async navigateTo(path: string = '/'): Promise<void> {
    await this.step(`Navigate to "${path}"`, async () => {
      await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    });
  }

  /**
   * Resolves an element by `data-test` / `data-testid` (configured in playwright.config.ts).
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Resolves an element by a custom QA automation attribute (`data-qa`, `data-cy`, `data-automation-id`).
   */
  getByTestAttr(attrValue: string, attrName: 'data-qa' | 'data-cy' | 'data-automation-id' = 'data-qa'): Locator {
    return this.page.locator(`[${attrName}="${attrValue}"]`);
  }

  /**
   * Clicks an element after ensuring it is visible and enabled.
   */
  async clickElement(locator: Locator, description?: string): Promise<void> {
    const label = description ?? locator.toString();
    await this.step(`Click ${label}`, async () => {
      await expect(locator).toBeVisible();
      await locator.click();
    });
  }

  /**
   * Clears and fills a standard input field.
   */
  async fillField(locator: Locator, value: string, description?: string): Promise<void> {
    const label = description ?? locator.toString();
    await this.step(`Fill ${label} with "${value}"`, async () => {
      await expect(locator).toBeVisible();
      await locator.fill(value);
    });
  }

  /**
   * Fills a password, API key, or secret input without exposing the plaintext secret in step logs or reports.
   */
  async fillSecure(locator: Locator, secretValue: string, fieldLabel: string = 'password'): Promise<void> {
    await this.step(`Fill confidential field [${fieldLabel}] with ***REDACTED***`, async () => {
      await expect(locator).toBeVisible();
      await locator.fill(secretValue);
    });
  }

  /**
   * Retries clicking a trigger element until a downstream UI condition (e.g., modal/drawer open) passes.
   * Eliminates hydration timing flakes on modern React/Next.js/Vue/Angular apps.
   */
  async clickUntil(
    trigger: Locator,
    assertionFn: () => Promise<void>,
    options: { timeoutMs?: number; intervals?: number[] } = {}
  ): Promise<void> {
    const timeout = options.timeoutMs ?? 8_000;
    const intervals = options.intervals ?? [250, 500, 1_000];

    await this.step('Click trigger until downstream UI condition is satisfied', async () => {
      await expect(async () => {
        await trigger.click();
        await assertionFn();
      }).toPass({ timeout, intervals });
    });
  }

  /**
   * Atomically triggers a UI action while awaiting and asserting a matching backend API response status.
   */
  async interceptApiCall(
    urlPattern: string | RegExp,
    expectedStatus: number,
    triggerAction: () => Promise<void>
  ): Promise<Response> {
    return this.step(`Intercept API [${String(urlPattern)}] expecting HTTP ${expectedStatus}`, async () => {
      const responsePromise = this.page.waitForResponse((res) =>
        typeof urlPattern === 'string'
          ? res.url().includes(urlPattern)
          : urlPattern.test(res.url())
      );
      await triggerAction();
      const response = await responsePromise;
      expect(response.status()).toBe(expectedStatus);
      return response;
    });
  }

  /**
   * Measures the wall-clock duration of a user interaction and asserts it completes within an SLA budget (ms).
   */
  async assertInteractionSla(
    interactionName: string,
    maxBudgetMs: number,
    actionFn: () => Promise<void>
  ): Promise<number> {
    return this.step(`SLA Check: "${interactionName}" <= ${maxBudgetMs}ms`, async () => {
      const start = performance.now();
      await actionFn();
      const elapsedMs = Math.round(performance.now() - start);
      expect(
        elapsedMs,
        `Interaction "${interactionName}" took ${elapsedMs}ms, exceeding SLA budget of ${maxBudgetMs}ms`
      ).toBeLessThanOrEqual(maxBudgetMs);
      return elapsedMs;
    });
  }

  /**
   * Scrolls a virtualized data grid (TanStack Virtual, AG Grid, MUI DataGrid) from top to bottom,
   * indexing each row by `data-index` or `data-row-index` so recycled DOM nodes are captured without duplicates.
   */
  async readAllVirtualizedRows(options: VirtualizedTableOptions): Promise<string[][]> {
    const {
      scrollContainer,
      rowLocator,
      totalCountLocator,
      scrollStepPx = 360,
      maxIterations = 150,
    } = options;

    return this.step('Extract all rows from virtualized data grid', async () => {
      await expect(scrollContainer).toBeVisible();

      await scrollContainer.evaluate((el) => {
        el.scrollTop = 0;
      });

      const collectedByIndex = new Map<number, string[]>();

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const visibleCount = await rowLocator.count();
        for (let i = 0; i < visibleCount; i++) {
          const row = rowLocator.nth(i);
          const rawIdx =
            (await row.getAttribute('data-index')) ??
            (await row.getAttribute('data-row-index')) ??
            String(collectedByIndex.size);
          const rowIndex = Number.parseInt(rawIdx, 10);

          if (!collectedByIndex.has(rowIndex)) {
            const cells = await row.locator('[role="gridcell"], td').allInnerTexts();
            collectedByIndex.set(
              rowIndex,
              cells.map((c) => c.trim())
            );
          }
        }

        const reachedBottom = await scrollContainer.evaluate((el, step) => {
          const previousTop = el.scrollTop;
          el.scrollTop = Math.min(el.scrollTop + step, el.scrollHeight);
          return el.scrollTop === previousTop || el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        }, scrollStepPx);

        if (reachedBottom) {
          break;
        }
      }

      const sortedRows = Array.from(collectedByIndex.entries())
        .sort(([a], [b]) => a - b)
        .map(([, cells]) => cells);

      if (totalCountLocator && (await totalCountLocator.isVisible())) {
        const summaryText = await totalCountLocator.innerText();
        const match = summaryText.match(/(\d+)\s+(?:entries|results|items|rows)/i);
        if (match) {
          const expectedTotal = Number.parseInt(match[1], 10);
          expect(sortedRows.length).toBe(expectedTotal);
        }
      }

      return sortedRows;
    });
  }

  /**
   * Dismisses an active filter pill or tag chip using accessible button roles.
   */
  async dismissFilterChip(chipContainer: Locator, labelPattern: RegExp = /^(Remove|Clear|Delete|Dismiss)$/i): Promise<void> {
    await this.step('Dismiss active filter chip', async () => {
      const removeButton = chipContainer.getByRole('button', { name: labelPattern });
      await expect(removeButton).toBeVisible();
      await removeButton.click();
    });
  }

  /**
   * Navigates an ARIA calendar popover to the target month/year by inspecting the live header text
   * rather than assuming which default month the date picker opens on.
   */
  async pickCalendarDate(
    calendarPopover: Locator,
    targetYear: number,
    targetMonthIndexZeroBased: number,
    targetDay: number
  ): Promise<void> {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const targetHeaderLabel = `${monthNames[targetMonthIndexZeroBased]} ${targetYear}`;

    await this.step(`Select calendar date: ${targetDay} ${targetHeaderLabel}`, async () => {
      await expect(calendarPopover).toBeVisible();
      const headerLocator = calendarPopover.locator(
        '[data-testid="calendar-header"], [role="heading"], .rdp-caption_label, .react-datepicker__current-month'
      );
      const nextBtn = calendarPopover.getByRole('button', { name: /next/i });
      const prevBtn = calendarPopover.getByRole('button', { name: /prev|previous/i });

      for (let guard = 0; guard < 36; guard++) {
        const currentHeaderText = (await headerLocator.first().innerText()).trim();
        if (currentHeaderText.toLowerCase().includes(targetHeaderLabel.toLowerCase())) {
          break;
        }

        const parsedCurrent = Date.parse(`1 ${currentHeaderText}`);
        const targetTimestamp = new Date(targetYear, targetMonthIndexZeroBased, 1).getTime();

        if (!Number.isNaN(parsedCurrent) && parsedCurrent > targetTimestamp) {
          await prevBtn.click();
        } else {
          await nextBtn.click();
        }
      }

      const dayButton = calendarPopover
        .getByRole('gridcell', { name: new RegExp(`^${targetDay}$`) })
        .or(calendarPopover.getByRole('button', { name: new RegExp(`^${targetDay}$`) }))
        .first();
      await dayButton.click();
    });
  }

  /**
   * Asserts that an element is visible on the page.
   */
  async expectIsVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }
}

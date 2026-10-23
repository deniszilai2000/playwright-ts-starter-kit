import { Page, Locator, expect, test } from '@playwright/test';

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
 * Enterprise BasePage Toolkit
 *
 * House Rules:
 * 1. Spec files NEVER touch raw selectors. All DOM interactions go through Page Objects extending BasePage.
 * 2. Every action is wrapped in `this.step(...)` for structured trace & report visibility.
 * 3. Sensitive fields ALWAYS use `fillSecure()` so secrets never leak into report step logs.
 * 4. Use retrying assertions (`expect.poll`, `toPass`, `toBeVisible`) — never fixed `waitForTimeout` sleeps.
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
   * Resolves an element by `data-hook` attribute for apps using dedicated automation hook packages.
   */
  getByHook(hookName: string): Locator {
    return this.page.locator(`[data-hook="${hookName}"]`);
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
   * Fills a password or secret input without exposing the secret value in step titles or Allure reports.
   */
  async fillSecure(locator: Locator, secretValue: string, fieldLabel: string = 'password'): Promise<void> {
    await this.step(`Fill secure field [${fieldLabel}] with ***REDACTED***`, async () => {
      await expect(locator).toBeVisible();
      await locator.fill(secretValue);
    });
  }

  /**
   * Retries clicking a trigger element until a target condition (e.g., popover/menu visibility) succeeds.
   * Prevents flaky failures when UI frameworks swallow clicks during mount or transition frames.
   */
  async clickUntil(
    trigger: Locator,
    assertionFn: () => Promise<void>,
    options: { timeoutMs?: number; intervals?: number[] } = {}
  ): Promise<void> {
    const timeout = options.timeoutMs ?? 8_000;
    const intervals = options.intervals ?? [250, 500, 1_000];

    await this.step('Click trigger until target state is reached', async () => {
      await expect(async () => {
        await trigger.click();
        await assertionFn();
      }).toPass({ timeout, intervals });
    });
  }

  /**
   * Scrolls a bidirectional virtualized table from top to bottom, indexing each row by
   * `data-index` (or `data-row-index`) so rows unmounted at the top are preserved in order.
   * Optionally verifies the collected total against a `"Showing N entries"` summary label.
   */
  async readAllVirtualizedRows(options: VirtualizedTableOptions): Promise<string[][]> {
    const {
      scrollContainer,
      rowLocator,
      totalCountLocator,
      scrollStepPx = 360,
      maxIterations = 150,
    } = options;

    return this.step('Read all rows from virtualized table', async () => {
      await expect(scrollContainer).toBeVisible();

      // Scroll to top first
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
        const match = summaryText.match(/(\d+)\s+entries/i);
        if (match) {
          const expectedTotal = Number.parseInt(match[1], 10);
          expect(sortedRows.length).toBe(expectedTotal);
        }
      }

      return sortedRows;
    });
  }

  /**
   * Removes a quick-filter chip regardless of whether the UI language is set to English ("Remove")
   * or Spanish ("Quitar").
   */
  async removeFilterChip(chipContainer: Locator): Promise<void> {
    await this.step('Remove active filter chip (EN/ES aware)', async () => {
      const removeButton = chipContainer.getByRole('button', { name: /^(Remove|Quitar|Clear)$/i });
      await expect(removeButton).toBeVisible();
      await removeButton.click();
    });
  }

  /**
   * Navigates a calendar popover to the target month/year by inspecting the actual rendered
   * header text rather than assuming which month the date picker opens on.
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

    await this.step(`Pick calendar date: ${targetDay} ${targetHeaderLabel}`, async () => {
      await expect(calendarPopover).toBeVisible();
      const headerLocator = calendarPopover.locator('[data-hook="calendar-header"], .react-datepicker__current-month');
      const nextBtn = calendarPopover.getByRole('button', { name: /next|siguiente/i });
      const prevBtn = calendarPopover.getByRole('button', { name: /prev|previous|anterior/i });

      for (let guard = 0; guard < 36; guard++) {
        const currentHeaderText = (await headerLocator.innerText()).trim();
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

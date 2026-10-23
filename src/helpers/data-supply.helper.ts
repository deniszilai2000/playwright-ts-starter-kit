import { assertNotProtected } from '../constants/protected-data.constants';
import { isDevRun } from './environment.helper';

export interface CleanupTask {
  entityId: string;
  entityType: string;
  cleanupFn: (entityId: string) => Promise<void>;
}

/**
 * On-Demand Test Data Supply & Self-Cleaning Lifecycle Manager (`EntitySupplyManager`)
 *
 * Solves two core enterprise E2E challenges on `dev`:
 * 1. Surviving Database Refreshes: `findOrProvision()` looks up an existing entity in the
 *    required state first, and provisions a fresh one via API/UI only when none exists.
 * 2. Self-Cleaning Mutating Specs: `registerForCleanup()` records created entity IDs and
 *    automatically tears them down after the test finishes—while strictly blocking any
 *    attempt to touch `PROTECTED_ENTITY_IDS` or non-dev environments.
 */
export class EntitySupplyManager {
  private readonly cleanupQueue: CleanupTask[] = [];

  /**
   * Finds an existing record matching the predicate, or provisions a new one on `dev`.
   */
  async findOrProvision<T extends { id: string }>(options: {
    entityType: string;
    findExistingFn: () => Promise<T | null>;
    provisionNewFn: () => Promise<T>;
    cleanupFn?: (entityId: string) => Promise<void>;
  }): Promise<T> {
    const existing = await options.findExistingFn();
    if (existing) {
      return existing;
    }

    if (!isDevRun()) {
      throw new Error(
        `[EntitySupplyManager] Cannot provision missing "${options.entityType}" on a read-only environment.`
      );
    }

    const created = await options.provisionNewFn();
    if (options.cleanupFn) {
      this.registerForCleanup(created.id, options.entityType, options.cleanupFn);
    }
    return created;
  }

  /**
   * Registers a newly created entity ID to be cleaned up automatically after the test finishes.
   */
  registerForCleanup(
    entityId: string,
    entityType: string,
    cleanupFn: (entityId: string) => Promise<void>
  ): void {
    assertNotProtected(entityId);
    this.cleanupQueue.push({ entityId, entityType, cleanupFn });
  }

  /**
   * Executes all registered cleanup callbacks in reverse (LIFO) order so child records
   * are removed before parent records. Non-blocking warning if a record was already deleted by the test.
   */
  async flushCleanupQueue(): Promise<void> {
    if (this.cleanupQueue.length === 0 || !isDevRun()) {
      this.cleanupQueue.length = 0;
      return;
    }

    const tasks = [...this.cleanupQueue].reverse();
    this.cleanupQueue.length = 0;

    for (const task of tasks) {
      try {
        assertNotProtected(task.entityId);
        await task.cleanupFn(task.entityId);
      } catch (error) {
        console.warn(
          `[EntitySupplyManager] Cleanup warning for ${task.entityType} "${task.entityId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }
}

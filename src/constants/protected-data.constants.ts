/**
 * Registry of protected baseline test records that NO automated or manual test
 * may edit, cancel, archive, or delete—even in the `dev` environment.
 *
 * Read-only specs rely on these immutable records always remaining in their known state.
 */
export const PROTECTED_ENTITY_IDS: ReadonlySet<string> = new Set([
  'ORD-GOLDEN-0001',
  'ORD-GOLDEN-0002',
  'CNT-BASELINE-0100',
  'INV-STAMPED-9001',
]);

/**
 * Guard helper called by page objects or data-cleanup utilities before mutating or deleting an entity.
 * Throws immediately if the target ID is in the protected baseline set.
 */
export function assertNotProtected(entityId: string): void {
  const normalized = entityId.trim().toUpperCase();
  if (PROTECTED_ENTITY_IDS.has(normalized)) {
    throw new Error(
      `[SAFETY VIOLATION] Attempted to mutate or delete protected baseline entity "${entityId}". ` +
        `See src/constants/protected-data.constants.ts.`
    );
  }
}

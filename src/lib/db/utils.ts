import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function toDateOrNull(value: string | Date | null | undefined) {
  if (!value) return null;
  // Prisma serializes Date objects as UTC timestamps. Constructing an HTML
  // date-input value at local midnight shifts it to the previous day in
  // positive UTC offsets (for example, Warsaw). Treat database DATE values
  // as timezone-free calendar dates by anchoring them at UTC midnight.
  return value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
}

/**
 * Persists a new relative order for a list of sibling records in one
 * transaction. `orderedIds` must be the full, final ordering of every
 * sibling.
 *
 * Runs in two passes (offset to unique temporary values, then to the real
 * 1..n values) because the order column is typically part of a unique
 * constraint and Postgres checks it after each individual UPDATE — writing
 * final values directly can collide mid-transaction whenever two records
 * swap positions (e.g. reversing the order of just 2 items).
 */
export async function reorderWithOffset(
  orderedIds: string[],
  target: "days" | "stops" | "activities",
  parentId: string,
) {
  if (orderedIds.length === 0) return;
  const offset = orderedIds.length + 1000;
  const temporary = orderedIds.map(
    (id, index) => [id, offset + index] as const,
  );
  const final = orderedIds.map((id, index) => [id, index + 1] as const);

  await prisma.$transaction(async (tx) => {
    await executeBulkReorder(tx, target, parentId, temporary);
    await executeBulkReorder(tx, target, parentId, final);
  });
}

function executeBulkReorder(
  tx: Prisma.TransactionClient,
  target: "days" | "stops" | "activities",
  parentId: string,
  values: ReadonlyArray<readonly [string, number]>,
) {
  const rows = Prisma.join(
    values.map(([id, order]) => Prisma.sql`(${id}::uuid, ${order})`),
  );

  if (target === "days") {
    return tx.$executeRaw(Prisma.sql`
      UPDATE trip_days AS item
      SET day_number = ordered.order_value
      FROM (VALUES ${rows}) AS ordered(id, order_value)
      WHERE item.id = ordered.id AND item.trip_id = ${parentId}::uuid
    `);
  }
  if (target === "stops") {
    return tx.$executeRaw(Prisma.sql`
      UPDATE trip_stops AS item
      SET stop_order = ordered.order_value
      FROM (VALUES ${rows}) AS ordered(id, order_value)
      WHERE item.id = ordered.id AND item.trip_day_id = ${parentId}::uuid
    `);
  }
  return tx.$executeRaw(Prisma.sql`
    UPDATE trip_activities AS item
    SET activity_order = ordered.order_value
    FROM (VALUES ${rows}) AS ordered(id, order_value)
    WHERE item.id = ordered.id AND item.trip_stop_id = ${parentId}::uuid
  `);
}

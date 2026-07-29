-- Remove stops that do not belong to a trip day. Activities attached to
-- these stops are removed automatically by the existing cascading foreign key.
DELETE FROM "trip_stops"
WHERE "trip_day_id" IS NULL;

-- Preserve valid activities whose parent stop belongs to a day but whose
-- denormalized day reference was missing.
UPDATE "trip_activities" AS activity
SET "trip_day_id" = stop."trip_day_id"
FROM "trip_stops" AS stop
WHERE activity."trip_stop_id" = stop."id"
  AND activity."trip_day_id" IS NULL;

-- Remove any remaining orphaned activities before enforcing the constraint.
DELETE FROM "trip_activities"
WHERE "trip_day_id" IS NULL;

ALTER TABLE "trip_stops"
ALTER COLUMN "trip_day_id" SET NOT NULL;

ALTER TABLE "trip_activities"
ALTER COLUMN "trip_day_id" SET NOT NULL;

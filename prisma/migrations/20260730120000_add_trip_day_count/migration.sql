ALTER TABLE "trips"
ADD COLUMN "day_count" INTEGER NOT NULL DEFAULT 1;

UPDATE "trips" AS trip
SET "day_count" = GREATEST(
  1,
  (
    SELECT COUNT(*)::INTEGER
    FROM "trip_days" AS day
    WHERE day."trip_id" = trip."id"
  )
);

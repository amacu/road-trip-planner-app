DROP INDEX IF EXISTS "user_profiles_full_name_idx";
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "full_name";

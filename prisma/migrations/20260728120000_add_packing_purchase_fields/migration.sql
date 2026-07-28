ALTER TABLE "trip_packing_items"
ADD COLUMN "price" DECIMAL(10,2),
ADD COLUMN "is_purchased" BOOLEAN NOT NULL DEFAULT false;

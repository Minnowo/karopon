
-- Drop the foreign key so we can have it ON DELETE SET NULL
ALTER TABLE PON.USER_FOODLOG
DROP CONSTRAINT IF EXISTS user_foodlog_food_id_fkey;

-- Create it again with the constraint
ALTER TABLE PON.USER_FOODLOG
ADD CONSTRAINT user_foodlog_food_id_fkey
FOREIGN KEY (FOOD_ID)
REFERENCES PON.USER_FOOD(ID)
ON DELETE SET NULL;

-- Allow null columns
ALTER TABLE PON.USER_FOODLOG
ALTER COLUMN FOOD_ID DROP NOT NULL;


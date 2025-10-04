-- AlterTable
ALTER TABLE "病患" ALTER COLUMN "性別" TYPE TEXT USING "性別"::text;

-- DropEnum
DROP TYPE "public"."Gender";
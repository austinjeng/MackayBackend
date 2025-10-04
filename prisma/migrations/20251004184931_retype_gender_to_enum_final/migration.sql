-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('男性', '女性');

-- AlterTable
ALTER TABLE "病患" ALTER COLUMN "性別" TYPE "Gender" USING "性別"::"Gender";
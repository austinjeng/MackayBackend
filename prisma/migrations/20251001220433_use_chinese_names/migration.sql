/*
  Warnings:

  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- DropTable
DROP TABLE "public"."Project";

-- DropEnum
DROP TYPE "public"."ProjectStatus";

-- CreateTable
CREATE TABLE "病患" (
    "病患ID" TEXT NOT NULL,
    "姓名" TEXT NOT NULL,
    "性別" "Gender" NOT NULL,
    "年齡" INTEGER NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "病患_pkey" PRIMARY KEY ("病患ID")
);

-- CreateTable
CREATE TABLE "LiftLegExercise" (
    "ID" TEXT NOT NULL,
    "病患ID" TEXT NOT NULL,
    "正確次數" INTEGER NOT NULL,
    "錯誤次數" INTEGER NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiftLegExercise_pkey" PRIMARY KEY ("ID")
);

-- AddForeignKey
ALTER TABLE "LiftLegExercise" ADD CONSTRAINT "LiftLegExercise_病患ID_fkey" FOREIGN KEY ("病患ID") REFERENCES "病患"("病患ID") ON DELETE RESTRICT ON UPDATE CASCADE;

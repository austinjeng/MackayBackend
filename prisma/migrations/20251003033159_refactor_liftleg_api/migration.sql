/*
  Warnings:

  - You are about to drop the `LiftLegExercise` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LiftLegExercise" DROP CONSTRAINT "LiftLegExercise_病患ID_fkey";

-- DropTable
DROP TABLE "public"."LiftLegExercise";

-- CreateTable
CREATE TABLE "膝抬高-側面" (
    "ID" TEXT NOT NULL,
    "病患ID" TEXT NOT NULL,
    "正確次數" INTEGER NOT NULL,
    "錯誤次數" INTEGER NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "膝抬高-側面_pkey" PRIMARY KEY ("ID")
);

-- AddForeignKey
ALTER TABLE "膝抬高-側面" ADD CONSTRAINT "膝抬高-側面_病患ID_fkey" FOREIGN KEY ("病患ID") REFERENCES "病患"("病患ID") ON DELETE RESTRICT ON UPDATE CASCADE;

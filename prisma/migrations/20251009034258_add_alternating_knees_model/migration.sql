/*
  Warnings:

  - You are about to drop the column `年齡` on the `病患` table. All the data in the column will be lost.
  - You are about to drop the column `性別` on the `病患` table. All the data in the column will be lost.
  - You are about to drop the `膝抬高-側面` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `出生日期` to the `病患` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('開啟', '關閉', '中止');

-- CreateEnum
CREATE TYPE "SessionExerciseStatus" AS ENUM ('開啟', '關閉', '中止');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('成功', '失敗', '無效');

-- DropForeignKey
ALTER TABLE "public"."膝抬高-側面" DROP CONSTRAINT "膝抬高-側面_病患ID_fkey";

-- AlterTable
ALTER TABLE "病患" DROP COLUMN "年齡",
DROP COLUMN "性別",
ADD COLUMN     "出生日期" DATE NOT NULL;

-- DropTable
DROP TABLE "public"."膝抬高-側面";

-- DropEnum
DROP TYPE "public"."Gender";

-- CreateTable
CREATE TABLE "運動類型" (
    "運動類型ID" SMALLSERIAL NOT NULL,
    "代碼" TEXT NOT NULL,
    "名稱" TEXT NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "運動類型_pkey" PRIMARY KEY ("運動類型ID")
);

-- CreateTable
CREATE TABLE "運動會話" (
    "會話ID" SERIAL NOT NULL,
    "病患ID" TEXT NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "狀態" "SessionStatus" NOT NULL DEFAULT '開啟',
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "運動會話_pkey" PRIMARY KEY ("會話ID")
);

-- CreateTable
CREATE TABLE "會話運動" (
    "會話運動ID" SERIAL NOT NULL,
    "會話ID" INTEGER NOT NULL,
    "運動類型ID" INTEGER NOT NULL,
    "狀態" "SessionExerciseStatus" NOT NULL DEFAULT '開啟',
    "開始時間" TIMESTAMP(3),
    "結束時間" TIMESTAMP(3),
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "會話運動_pkey" PRIMARY KEY ("會話運動ID")
);

-- CreateTable
CREATE TABLE "交替抬膝運動紀錄" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "角度" DECIMAL(6,3) NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "交替抬膝運動紀錄_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "運動類型_代碼_key" ON "運動類型"("代碼");

-- CreateIndex
CREATE INDEX "運動會話_病患ID_開始時間_idx" ON "運動會話"("病患ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "會話運動_會話ID_idx" ON "會話運動"("會話ID");

-- CreateIndex
CREATE INDEX "交替抬膝運動紀錄_會話運動ID_開始時間_idx" ON "交替抬膝運動紀錄"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "交替抬膝運動紀錄_結果_idx" ON "交替抬膝運動紀錄"("結果");

-- AddForeignKey
ALTER TABLE "運動會話" ADD CONSTRAINT "運動會話_病患ID_fkey" FOREIGN KEY ("病患ID") REFERENCES "病患"("病患ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "會話運動" ADD CONSTRAINT "會話運動_會話ID_fkey" FOREIGN KEY ("會話ID") REFERENCES "運動會話"("會話ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "會話運動" ADD CONSTRAINT "會話運動_運動類型ID_fkey" FOREIGN KEY ("運動類型ID") REFERENCES "運動類型"("運動類型ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "交替抬膝運動紀錄" ADD CONSTRAINT "交替抬膝運動紀錄_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

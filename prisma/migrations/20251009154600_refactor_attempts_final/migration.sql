/*
  Warnings:

  - You are about to drop the `雙膝交互​抬​高(側)` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."雙膝交互​抬​高(側)" DROP CONSTRAINT "雙膝交互​抬​高(側)_會話運動ID_fkey";

-- DropTable
DROP TABLE "public"."雙膝交互​抬​高(側)";

-- CreateTable
CREATE TABLE "運動紀錄" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "數據" JSONB,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "運動紀錄_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateIndex
CREATE INDEX "運動紀錄_會話運動ID_開始時間_idx" ON "運動紀錄"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "運動紀錄_結果_idx" ON "運動紀錄"("結果");

-- AddForeignKey
ALTER TABLE "運動紀錄" ADD CONSTRAINT "運動紀錄_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

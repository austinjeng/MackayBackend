/*
  Warnings:

  - You are about to drop the `交替抬膝運動紀錄` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."交替抬膝運動紀錄" DROP CONSTRAINT "交替抬膝運動紀錄_會話運動ID_fkey";

-- DropTable
DROP TABLE "public"."交替抬膝運動紀錄";

-- CreateTable
CREATE TABLE "雙膝交互​抬​高(側)" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "角度" DECIMAL(6,3) NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "雙膝交互​抬​高(側)_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateIndex
CREATE INDEX "雙膝交互​抬​高(側)_會話運動ID_開始時間_idx" ON "雙膝交互​抬​高(側)"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "雙膝交互​抬​高(側)_結果_idx" ON "雙膝交互​抬​高(側)"("結果");

-- AddForeignKey
ALTER TABLE "雙膝交互​抬​高(側)" ADD CONSTRAINT "雙膝交互​抬​高(側)_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

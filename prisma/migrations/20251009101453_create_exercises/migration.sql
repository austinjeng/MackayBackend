-- CreateTable
CREATE TABLE "腳尖​對腳​跟​" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "腳尖​對腳​跟​_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateTable
CREATE TABLE "左右跨步​" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "角度" DECIMAL(6,3) NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "左右跨步​_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateTable
CREATE TABLE "深蹲​" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "角度" DECIMAL(6,3) NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "深蹲​_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateTable
CREATE TABLE "墊腳尖站​立​" (
    "紀錄ID" SERIAL NOT NULL,
    "會話運動ID" INTEGER NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "結果" "AttemptOutcome" NOT NULL,
    "角度" DECIMAL(6,3) NOT NULL,
    "維持秒數" DECIMAL(6,3) NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "墊腳尖站​立​_pkey" PRIMARY KEY ("紀錄ID")
);

-- CreateIndex
CREATE INDEX "腳尖​對腳​跟​_會話運動ID_開始時間_idx" ON "腳尖​對腳​跟​"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "腳尖​對腳​跟​_結果_idx" ON "腳尖​對腳​跟​"("結果");

-- CreateIndex
CREATE INDEX "左右跨步​_會話運動ID_開始時間_idx" ON "左右跨步​"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "左右跨步​_結果_idx" ON "左右跨步​"("結果");

-- CreateIndex
CREATE INDEX "深蹲​_會話運動ID_開始時間_idx" ON "深蹲​"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "深蹲​_結果_idx" ON "深蹲​"("結果");

-- CreateIndex
CREATE INDEX "墊腳尖站​立​_會話運動ID_開始時間_idx" ON "墊腳尖站​立​"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "墊腳尖站​立​_結果_idx" ON "墊腳尖站​立​"("結果");

-- AddForeignKey
ALTER TABLE "腳尖​對腳​跟​" ADD CONSTRAINT "腳尖​對腳​跟​_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "左右跨步​" ADD CONSTRAINT "左右跨步​_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "深蹲​" ADD CONSTRAINT "深蹲​_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "墊腳尖站​立​" ADD CONSTRAINT "墊腳尖站​立​_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

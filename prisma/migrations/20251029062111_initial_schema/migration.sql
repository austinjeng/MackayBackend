-- CreateEnum
CREATE TYPE "RehabSessionStatus" AS ENUM ('開啟', '關閉', '中止');

-- CreateEnum
CREATE TYPE "RehabSessionExerciseStatus" AS ENUM ('開啟', '關閉', '中止');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('成功', '失敗', '無效');

-- CreateTable
CREATE TABLE "病患" (
    "病患ID" TEXT NOT NULL,
    "API金鑰" TEXT NOT NULL,
    "姓名" TEXT NOT NULL,
    "出生日期" DATE NOT NULL,
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "病患_pkey" PRIMARY KEY ("病患ID")
);

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
    "會話日期" DATE NOT NULL,
    "開始時間" TIMESTAMP(3) NOT NULL,
    "結束時間" TIMESTAMP(3),
    "狀態" "RehabSessionStatus" NOT NULL DEFAULT '開啟',
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "運動會話_pkey" PRIMARY KEY ("會話ID")
);

-- CreateTable
CREATE TABLE "會話運動" (
    "會話運動ID" SERIAL NOT NULL,
    "會話ID" INTEGER NOT NULL,
    "運動類型ID" INTEGER NOT NULL,
    "狀態" "RehabSessionExerciseStatus" NOT NULL DEFAULT '開啟',
    "開始時間" TIMESTAMP(3),
    "結束時間" TIMESTAMP(3),
    "建立時間" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "上次更新時間" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "會話運動_pkey" PRIMARY KEY ("會話運動ID")
);

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

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "病患_API金鑰_key" ON "病患"("API金鑰");

-- CreateIndex
CREATE UNIQUE INDEX "運動類型_代碼_key" ON "運動類型"("代碼");

-- CreateIndex
CREATE INDEX "運動會話_病患ID_開始時間_idx" ON "運動會話"("病患ID", "開始時間" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "運動會話_病患ID_會話日期_key" ON "運動會話"("病患ID", "會話日期");

-- CreateIndex
CREATE INDEX "會話運動_會話ID_idx" ON "會話運動"("會話ID");

-- CreateIndex
CREATE UNIQUE INDEX "會話運動_會話ID_運動類型ID_key" ON "會話運動"("會話ID", "運動類型ID");

-- CreateIndex
CREATE INDEX "運動紀錄_會話運動ID_開始時間_idx" ON "運動紀錄"("會話運動ID", "開始時間" DESC);

-- CreateIndex
CREATE INDEX "運動紀錄_結果_idx" ON "運動紀錄"("結果");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- AddForeignKey
ALTER TABLE "運動會話" ADD CONSTRAINT "運動會話_病患ID_fkey" FOREIGN KEY ("病患ID") REFERENCES "病患"("病患ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "會話運動" ADD CONSTRAINT "會話運動_會話ID_fkey" FOREIGN KEY ("會話ID") REFERENCES "運動會話"("會話ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "會話運動" ADD CONSTRAINT "會話運動_運動類型ID_fkey" FOREIGN KEY ("運動類型ID") REFERENCES "運動類型"("運動類型ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "運動紀錄" ADD CONSTRAINT "運動紀錄_會話運動ID_fkey" FOREIGN KEY ("會話運動ID") REFERENCES "會話運動"("會話運動ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

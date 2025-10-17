/*
  Warnings:

  - A unique constraint covering the columns `[API金鑰]` on the table `病患` will be added. If there are existing duplicate values, this will fail.
  - The required column `API金鑰` was added to the `病患` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "病患" ADD COLUMN     "API金鑰" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "病患_API金鑰_key" ON "病患"("API金鑰");

/*
  Warnings:

  - Added the required column `method` to the `RateLimitRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateLimitRule" ADD COLUMN     "method" "MethodType" NOT NULL;

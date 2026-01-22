/*
  Warnings:

  - A unique constraint covering the columns `[query]` on the table `ProductSearchMiss` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductSearchMiss_query_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ProductSearchMiss_query_unique" ON "ProductSearchMiss"("query");

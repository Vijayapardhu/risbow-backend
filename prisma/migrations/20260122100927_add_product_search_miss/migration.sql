-- CreateTable
CREATE TABLE "ProductSearchMiss" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSearchMiss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSearchMiss_query_idx" ON "ProductSearchMiss"("query");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_createdAt_idx" ON "ProductSearchMiss"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductSearchMiss" ADD CONSTRAINT "ProductSearchMiss_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

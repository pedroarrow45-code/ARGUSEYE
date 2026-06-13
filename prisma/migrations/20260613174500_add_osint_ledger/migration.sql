-- CreateTable
CREATE TABLE "SourceLedgerEntry" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "collectionJobId" TEXT,
    "target" TEXT NOT NULL,
    "query" TEXT,
    "originalUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "normalizedUrl" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "engine" TEXT,
    "statusCode" INTEGER,
    "contentType" TEXT,
    "accessedAt" TIMESTAMP(3),
    "fetchStatus" TEXT NOT NULL,
    "fetchError" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedDocument" (
    "id" TEXT NOT NULL,
    "sourceLedgerEntryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "headings" TEXT[],
    "textHash" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "textLength" INTEGER NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceLedgerEntry_caseId_idx" ON "SourceLedgerEntry"("caseId");

-- CreateIndex
CREATE INDEX "SourceLedgerEntry_collectionJobId_idx" ON "SourceLedgerEntry"("collectionJobId");

-- CreateIndex
CREATE INDEX "SourceLedgerEntry_normalizedUrl_idx" ON "SourceLedgerEntry"("normalizedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedDocument_sourceLedgerEntryId_key" ON "ExtractedDocument"("sourceLedgerEntryId");

-- AddForeignKey
ALTER TABLE "SourceLedgerEntry" ADD CONSTRAINT "SourceLedgerEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceLedgerEntry" ADD CONSTRAINT "SourceLedgerEntry_collectionJobId_fkey" FOREIGN KEY ("collectionJobId") REFERENCES "CollectionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedDocument" ADD CONSTRAINT "ExtractedDocument_sourceLedgerEntryId_fkey" FOREIGN KEY ("sourceLedgerEntryId") REFERENCES "SourceLedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ContactTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ContactTagOnContact" (
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("contactId", "tagId"),
    CONSTRAINT "ContactTagOnContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactTagOnContact_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContactTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContactTag_orgId_idx" ON "ContactTag"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactTag_orgId_name_key" ON "ContactTag"("orgId", "name");

-- CreateIndex
CREATE INDEX "ContactTagOnContact_tagId_idx" ON "ContactTagOnContact"("tagId");

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#0f172a',
    "accentColor" TEXT DEFAULT '#38bdf8',
    "ctaText" TEXT DEFAULT 'Skontaktuj się ze mną',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrgMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_memberId_key" ON "AgentProfile"("memberId");

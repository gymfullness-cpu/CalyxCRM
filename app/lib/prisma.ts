import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function makePrisma() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Brak DATABASE_URL w .env (np. DATABASE_URL=\"file:./dev.db\")");
  }

  // Adapter dla SQLite (better-sqlite3)
  const adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export const prisma = global.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

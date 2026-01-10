import fs from "node:fs";
import path from "node:path";

export type Msg = { role: "user" | "assistant"; content: string };

type MemoryRecord = {
  userId: string;
  profile: string;
  messages: Msg[];
  updatedAt: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "calli-memory.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify({}), "utf8");
}

function readAll(): Record<string, MemoryRecord> {
  ensureStore();
  const raw = fs.readFileSync(FILE_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

function writeAll(db: Record<string, MemoryRecord>) {
  ensureStore();
  fs.writeFileSync(FILE_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function getMemory(userId: string): MemoryRecord {
  const db = readAll();
  return (
    db[userId] ?? {
      userId,
      profile: "",
      messages: [],
      updatedAt: Date.now(),
    }
  );
}

export function saveMemory(record: MemoryRecord) {
  const db = readAll();
  db[record.userId] = { ...record, updatedAt: Date.now() };
  writeAll(db);
}


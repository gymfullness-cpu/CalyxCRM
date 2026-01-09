import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import OpenAI from "openai";

// ✅ wczytaj .env.local (Node sam go nie ładuje)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Brak OPENAI_API_KEY. Sprawdź .env.local w root projektu.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const KNOW_DIR = path.join(process.cwd(), "calli_knowledge");

async function main() {
  if (!fs.existsSync(KNOW_DIR)) {
    console.error("❌ Brak folderu calli_knowledge/");
    process.exit(1);
  }

  // ✅ bierzemy tylko PLIKI, ignorujemy foldery
  const entries = fs.readdirSync(KNOW_DIR, { withFileTypes: true });

  const fileNames = entries
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name);

  if (!fileNames.length) {
    console.error("❌ W calli_knowledge/ nie ma plików. Dodaj np. kw.md");
    process.exit(1);
  }

  console.log("⏳ Tworzę bazę wiedzy Calli...");

  const vs = await openai.vectorStores.create({ name: "Calli Knowledge Base" });

  console.log("⏳ Wrzucam pliki:");
  const uploadedIds = [];

  for (const name of fileNames) {
    const full = path.join(KNOW_DIR, name);
    console.log(" -", name);

    const file = await openai.files.create({
      file: fs.createReadStream(full),
      purpose: "assistants",
    });

    uploadedIds.push(file.id);
  }

  console.log("⏳ Podpinam pliki do bazy...");
  await openai.vectorStores.fileBatches.create(vs.id, { file_ids: uploadedIds });

  console.log("\n✅ GOTOWE!");
  console.log("CALLI_VECTOR_STORE_ID =", vs.id);
  console.log("\n➡️ Wklej do .env.local linię:");
  console.log("CALLI_VECTOR_STORE_ID=" + vs.id);
}

main().catch((e) => {
  console.error("❌", e?.message || e);
  process.exit(1);
});

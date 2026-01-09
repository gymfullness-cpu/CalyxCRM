import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import OpenAI from "openai";

// ✅ 1) Wczytaj .env.local (Node sam tego nie robi)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Nie widzę OPENAI_API_KEY. Sprawdź plik .env.local w root projektu.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const KNOW_DIR = path.join(process.cwd(), "calli_knowledge");

async function main() {
  if (!fs.existsSync(KNOW_DIR)) {
    console.error("❌ Brak folderu: calli_knowledge/");
    process.exit(1);
  }

  // ✅ 2) Bierzemy tylko PLIKI (ignorujemy foldery)
  const entries = fs.readdirSync(KNOW_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name);

  if (!files.length) {
    console.error("❌ calli_knowledge/ nie ma żadnych PLIKÓW. Dodaj np. kw.md");
    process.exit(1);
  }

  console.log("⏳ Tworzę bazę wiedzy Calli (Vector Store)...");
  const vs = await openai.vectorStores.create({ name: "Calli Knowledge Base" });

  console.log("⏳ Wrzucam pliki:");
  const uploadedIds = [];

  for (const f of files) {
    const full = path.join(KNOW_DIR, f);
    console.log(" -", f);

    const file = await openai.files.create({
      file: fs.createReadStream(full),
      purpose: "assistants",
    });

    uploadedIds.push(file.id);
  }

  console.log("⏳ Podpinam pliki do Vector Store...");
  await openai.vectorStores.fileBatches.create(vs.id, { file_ids: uploadedIds });

  console.log("\n✅ GOTOWE!");
  console.log("CALLI_VECTOR_STORE_ID =", vs.id);
  console.log("\n➡️ Wklej to ID do .env.local jako:");
  console.log("CALLI_VECTOR_STORE_ID=" + vs.id);
}

main().catch((e) => {
  console.error("❌", e?.message || e);
  process.exit(1);
});

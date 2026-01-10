import OpenAI from "openai";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getMemory, saveMemory, Msg } from "../../../lib/calliMemory";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function getOrCreateUserId(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/calli_uid=([^;]+)/);
  if (match?.[1]) return { userId: match[1], setCookie: null as string | null };

  const userId = crypto.randomUUID();
  const setCookie = `calli_uid=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
  return { userId, setCookie };
}

// âś… helper: wyciÄ…gnij cytowania URL z odpowiedzi (url_citation annotations)
function extractUrlCitations(resp: any): Array<{ title?: string; url: string }> {
  const out: Array<{ title?: string; url: string }> = [];

  const outputItems = Array.isArray(resp?.output) ? resp.output : [];
  for (const item of outputItems) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const annotations = Array.isArray(part?.annotations) ? part.annotations : [];
      for (const ann of annotations) {
        if (ann?.type === "url_citation" && typeof ann?.url === "string") {
          out.push({
            title: typeof ann?.title === "string" ? ann.title : undefined,
            url: ann.url,
          });
        }
      }
    }
  }

  // usuĹ„ duplikaty po URL
  const seen = new Set<string>();
  return out.filter((x) => {
    if (!x.url) return false;
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

// âś… TS/Vercel fix: normalizacja wiadomoĹ›ci do typu Msg[]
function toMsgArray(input: unknown): Msg[] {
  if (!Array.isArray(input)) return [];

  const out: Msg[] = [];
  for (const m of input as any[]) {
    const role = m?.role;
    const content = m?.content;

    if ((role === "user" || role === "assistant") && typeof content === "string") {
      out.push({ role, content });
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const incomingMessages = toMsgArray((body as any)?.messages);

    const { userId, setCookie } = getOrCreateUserId(req);
    const mem = getMemory(userId);

    // âś… DODATEK: mniejszy kontekst = szybciej
    const lastMemMsgs: Msg[] = toMsgArray(mem?.messages).slice(-12);
    const userMsgs: Msg[] = incomingMessages.slice(-12);

    const vectorStoreId = process.env.CALLI_VECTOR_STORE_ID?.trim();

    // âś… Stabilny prompt: prosimy o web search dla rzeczy â€śzmiennychâ€ť + preferowane domeny
    const system = `
JesteĹ› Calli Chat â€” ekspert od nieruchomoĹ›ci (PL) i asystent ogĂłlny.

Zasady:
- Odpowiadaj po polsku, krĂłtko i konkretnie.
- JeĹ›li temat moĹĽe byÄ‡ aktualny / zmienny (terminy, opĹ‚aty, procedury, przepisy, urzÄ™dy) â†’ uĹĽyj WEB SEARCH.
- JeĹ›li temat jest z Twojej bazy wiedzy â†’ uĹĽyj FILE SEARCH.
- Dawaj kroki â€śco zrobiÄ‡â€ť, checklisty dokumentĂłw.
- JeĹ›li brakuje danych (miasto, rodzaj prawa: wĹ‚asnoĹ›Ä‡/spĂłĹ‚dzielcze, KW) â†’ dopytaj.
- Nie zmyĹ›laj. JeĹ›li korzystasz z internetu, podaj ĹşrĂłdĹ‚a.
- Dodaj zdanie: "To informacja ogĂłlna, nie porada prawna."

Preferowane ĹşrĂłdĹ‚a (jeĹ›li pasujÄ… do pytania):
- gov.pl, ms.gov.pl, isap.sejm.gov.pl, podatki.gov.pl, biznes.gov.pl

Profil uĹĽytkownika:
${mem.profile || "(brak)"}
`;

    // âś… Tools: web_search zawsze + file_search jeĹ›li masz vector store
    const tools: any[] = [{ type: "web_search" }];

    if (vectorStoreId) {
      tools.push({
        type: "file_search",
        vector_store_ids: [vectorStoreId],
      });
    }

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      tools,
      temperature: 0.2,

      // âś… DODATEK: limit odpowiedzi = szybciej
      max_output_tokens: 500,

      input: [{ role: "system", content: system }, ...lastMemMsgs, ...userMsgs],
    });

    const reply =
      (resp.output_text || "").trim() || "Nie udaĹ‚o mi siÄ™ wygenerowaÄ‡ odpowiedzi.";

    const sources = extractUrlCitations(resp);

    // âś… update pamiÄ™ci (TS-safe)
    const assistantMsg: Msg = { role: "assistant", content: reply };

    const merged: Msg[] = [...lastMemMsgs, ...userMsgs, assistantMsg].slice(-40);

    const prof = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      input: [
        {
          role: "system",
          content:
            "Zaktualizuj krĂłtki profil uĹĽytkownika w 1â€“2 zdaniach (rola, miasto, preferencje odpowiedzi). JeĹ›li brak nowych faktĂłw: zwrĂłÄ‡ bez zmian.",
        },
        {
          role: "user",
          content: `STARY PROFIL:\n${mem.profile}\n\nNOWA ROZMOWA:\n${merged
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}`,
        },
      ],
    });

    const newProfile = (prof.output_text || mem.profile).trim();

    saveMemory({
      userId,
      profile: newProfile,
      messages: merged,
      updatedAt: Date.now(),
    });

    const res = NextResponse.json({ reply, sources });
    if (setCookie) res.headers.set("Set-Cookie", setCookie);
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: "calli_api_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}


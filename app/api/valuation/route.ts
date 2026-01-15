import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tworzymy klienta OpenAI dopiero w runtime (żeby build nie "łapał" braku env).
 */
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;
  return new OpenAI({ apiKey });
}

/**
 * Minimalny HTML -> text bez bibliotek:
 * - usuwa script/style
 * - wycina tagi
 * - kompresuje białe znaki
 */
function htmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

/**
 * Wyciąga JSON-LD (często portale trzymają tam cenę/metraż/tytuł itp.)
 */
function extractJsonLd(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      out.push(parsed);
    } catch {
      // czasem JSON-LD jest uszkodzony lub ma "śmieci" -> pomijamy
    }
  }

  return out;
}

function safeNumber(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Normalizacja: score ma być 1..10
 * - jeśli model/legacy da 0..100, przeliczamy na 1..10
 */
function normalizeScoreTo10(raw: any): number | null {
  const n = safeNumber(raw);
  if (n === null) return null;

  if (n >= 1 && n <= 10) return clamp(Math.round(n), 1, 10);

  if (n >= 0 && n <= 100) {
    const s = Math.round((n / 100) * 10);
    return clamp(s === 0 ? 1 : s, 1, 10);
  }

  return clamp(Math.round(n), 1, 10);
}

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY",
        details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const url = String((body as any)?.url || "").trim();
    const portal = String((body as any)?.portal || "").trim();

    if (!url) return NextResponse.json({ error: "Brak url" }, { status: 400 });
    if (!url.startsWith("http")) {
      return NextResponse.json({ error: "URL musi zaczynać się od http/https" }, { status: 400 });
    }

    // 1) Pobierz HTML ogłoszenia
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nie udało się pobrać strony (${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // 2) Pakiet danych dla AI: JSON-LD + text + fragment HTML
    const jsonLd = extractJsonLd(html);
    const text = htmlToText(html);

    // nie wysyłamy całego HTML (tokeny), tylko sensowne skróty
    const htmlSlice = html.slice(0, 60_000);
    const textSlice = text.slice(0, 25_000);
    const jsonLdSlice = JSON.stringify(jsonLd).slice(0, 20_000);

    // 3) Prośba do modelu o czysty JSON analizy ogłoszenia
    const prompt = `
Jesteś analitykiem rynku nieruchomości w Polsce. Analizujesz OGŁOSZENIE z portalu (np. Otodom/Gratka/Morizon).
Masz dane z HTML/JSON-LD/tekstu strony. Twoim celem jest:

- wyciągnąć konkretne parametry oferty (tytuł, cena, metraż, lokalizacja, opis),
- policzyć pricePerM2,
- wypisać pros/cons (max ~8/8, konkret),
- stworzyć bardzo konkretną rekomendację (co sprawdzić, jak negocjować),
- dać SCORE w skali 1..10 (10 = bardzo dobra oferta),
- jeśli w danych widzisz WYŚWIETLENIA (views) — zwróć je jako liczbę (w przeciwnym razie null).

Zwróć WYŁĄCZNIE czysty JSON bez markdown.
`.trim();

    const schema = {
      name: "valuation_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          area: { type: ["number", "null"] },
          pricePerM2: { type: ["number", "null"] },
          city: { type: ["string", "null"] },
          district: { type: ["string", "null"] },
          street: { type: ["string", "null"] },
          description: { type: ["string", "null"] },

          marketAssessment: { type: ["string", "null"] },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },

          score: { type: ["number", "null"] },
          recommendation: { type: ["string", "null"] },

          views: { type: ["number", "null"] },

          extractedFrom: { type: ["string", "null"] },
        },
        required: [
          "title",
          "price",
          "area",
          "pricePerM2",
          "city",
          "district",
          "street",
          "description",
          "marketAssessment",
          "pros",
          "cons",
          "score",
          "recommendation",
          "views",
          "extractedFrom",
        ],
      },
    } as const;

    const ai = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt }] },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Portal (podpowiedz): ${portal || "nieznany"}
URL: ${url}

JSON-LD (fragment):
${jsonLdSlice}

TEXT (fragment):
${textSlice}

HTML (fragment):
${htmlSlice}
`.trim(),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          ...schema,
        },
      },
    });

    const rawJson = ai.output_text || "{}";
    let analysis: any = {};
    try {
      analysis = JSON.parse(rawJson);
    } catch {
      analysis = {};
    }

    // 4) Normalizacja + wyliczenia bezpieczeństwa
    const price = safeNumber(analysis.price);
    const area = safeNumber(analysis.area);

    let ppm2 = safeNumber(analysis.pricePerM2);
    if (ppm2 === null && price !== null && area !== null && area > 0) {
      ppm2 = Math.round(price / area);
    }

    const s10 = normalizeScoreTo10(analysis.score);

    const normalized = {
      ...analysis,
      price: price ?? null,
      area: area ?? null,
      pricePerM2: ppm2 ?? null,
      score: s10,
      views: safeNumber(analysis.views) ?? null,
      pros: Array.isArray(analysis.pros) ? analysis.pros.filter(Boolean) : [],
      cons: Array.isArray(analysis.cons) ? analysis.cons.filter(Boolean) : [],
    };

    return NextResponse.json({ analysis: normalized });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Błąd serwera", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

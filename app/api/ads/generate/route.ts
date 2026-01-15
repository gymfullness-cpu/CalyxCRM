import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ważne dla bibliotek native i fetchy
export const dynamic = "force-dynamic";

type OfferTypeStrict = "sprzedaż" | "kupno" | "wynajem";
type OfferTypeInput = OfferTypeStrict | "sprzedaz";

type Body = {
  // co reklamujemy
  city?: string;
  headline?: string;
  offerType?: OfferTypeInput;
  phone?: string;
  brandName?: string;

  // warianty stylistyczne
  styles?: Array<"minimal" | "luxury" | "bold" | "editorial">;

  // formaty
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  n?: number; // ile obrazków na styl
};

function pick<T>(v: T | undefined, fallback: T) {
  return typeof v === "undefined" ? fallback : v;
}

function safeText(s: unknown, max = 200) {
  const t = String(s ?? "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeOfferType(v: OfferTypeInput | undefined): OfferTypeStrict {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "sprzedaz" || s === "sprzedaż") return "sprzedaż";
  if (s === "kupno") return "kupno";
  if (s === "wynajem") return "wynajem";
  // fallback (żeby API nie wywalało się na śmieciowych wartościach)
  return "sprzedaż";
}

// Prompty reklamowe (czyste, premium, z tekstem czytelnym)
function buildPrompt(
  style: string,
  payload: Required<Pick<Body, "city" | "headline" | "phone" | "brandName">> & { offerType: OfferTypeStrict }
) {
  const offerLabel =
    payload.offerType === "sprzedaż"
      ? "Sprzedaż nieruchomości"
      : payload.offerType === "kupno"
      ? "Kupno nieruchomości"
      : "Wynajem nieruchomości";

  const base = `
Create a polished, high-end social media ad creative for a real estate agent in Poland.
Language: Polish.
The design must be clean, modern, and professional. No clutter, no cheesy stock look.
Include readable typography (very important), strong hierarchy, lots of whitespace.
Use a premium color palette that matches: navy + mint accents.
Do NOT include any logos unless text-only.
No watermarks.

Text to place ON the image (must be sharp and readable):
1) Main headline: "${payload.headline}"
2) Subheadline: "${offerLabel} • ${payload.city}"
3) Call to action: "Napisz wiadomość"
4) Contact line: "${payload.phone}"
5) Small signature: "${payload.brandName}"

Composition: 1:1 / 4:5 / 16:9 depending on requested size.
Use simple abstract shapes, subtle gradients, or elegant photo-like background (but not literal faces).
Avoid showing people. Focus on classy real-estate vibe (architecture silhouettes, abstract city blocks, minimal interiors).
  `.trim();

  const styleAddon =
    style === "minimal"
      ? "Style direction: MINIMAL — ultra clean Swiss design, thin lines, subtle gradient, minimal icons."
      : style === "luxury"
      ? "Style direction: LUXURY — premium editorial, soft shadows, marble/stone texture hints, elegant serif for headline + modern sans for details."
      : style === "bold"
      ? "Style direction: BOLD — strong contrast, big headline, geometric shapes, modern poster aesthetic, still premium."
      : "Style direction: EDITORIAL — magazine cover vibe, tasteful layout grid, large whitespace, refined typography.";

  return `${base}\n\n${styleAddon}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Brak OPENAI_API_KEY w .env.local" }, { status: 500 });
    }

    const raw = (await req.json().catch(() => ({}))) as Body;

    const city = safeText(raw.city || "Warszawa", 80);
    const headline = safeText(raw.headline || "Chcesz sprzedać nieruchomość?", 90);
    const offerType = normalizeOfferType(raw.offerType); // ✅ zawsze zwraca "sprzedaż" | "kupno" | "wynajem"
    const phone = safeText(raw.phone || "Zadzwoń: 500 600 700", 60);
    const brandName = safeText(raw.brandName || "Calyx AI / Agent", 60);

    const styles = (raw.styles && raw.styles.length ? raw.styles : ["minimal", "luxury", "bold", "editorial"]).slice(
      0,
      6
    );

    const size = pick(raw.size, "1024x1024");
    const n = Math.min(Math.max(pick(raw.n, 1), 1), 2); // max 2 per styl

    const payload = { city, headline, offerType, phone, brandName } as const;

    const results: Array<{ style: string; images: string[] }> = [];

    for (const style of styles) {
      const prompt = buildPrompt(style, payload);

      const r = await fetch("https://api.openai.com/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size,
          n,
          output_format: "png",
        }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        return NextResponse.json(
          { ok: false, error: "Błąd generowania obrazka", details: data },
          { status: 500 }
        );
      }

      const imgs: string[] = Array.isArray(data?.data) ? data.data.map((x: any) => x?.b64_json).filter(Boolean) : [];

      results.push({ style, images: imgs });
    }

    return NextResponse.json({ ok: true, size, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Błąd serwera /api/ads/generate", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

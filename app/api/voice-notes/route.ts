import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // runtime import (żeby build nie evaluował OpenAI bez env)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;
  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing OPENAI_API_KEY",
        details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    // Walidacja: musi być File
    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ success: false, error: "Brak pliku audio (audio)" }, { status: 400 });
    }

    // 1) Transkrypcja
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-transcribe",
    });

    const text = String(transcription?.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { success: false, error: "Transkrypcja nie zawiera tekstu" },
        { status: 400 }
      );
    }

    // 2) Analiza -> wymuszony JSON schema (bez ręcznego parsowania)
    const schema = {
      name: "voice_note_extract",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          preferences: { type: "string" },
          meetingDate: { type: ["string", "null"] }, // ISO lub null
        },
        required: ["name", "phone", "preferences", "meetingDate"],
      },
    } as const;

    const prompt = `
Wyciągnij dane z notatki głosowej agenta nieruchomości.

Zwróć JSON:
{
  "name": string | null,
  "phone": string | null,
  "preferences": string,
  "meetingDate": string | null
}

Zasady:
- meetingDate: jeśli jest konkretny termin, zwróć jako ISO (np. 2026-01-15T14:30:00), inaczej null
- preferences: krótko i konkretnie (1-3 zdania), co klient chce / jakie wymagania
- Jeśli brak telefonu/imienia -> null
`.trim();

    const ai = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt }] },
        { role: "user", content: [{ type: "input_text", text: `TEKST:\n${text}` }] },
      ],
      text: {
        format: {
          type: "json_schema",
          ...schema,
        },
      },
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(ai.output_text || "{}");
    } catch {
      parsed = {};
    }

    const meetingDate = parsed?.meetingDate ? String(parsed.meetingDate) : null;

    return NextResponse.json({
      success: true,
      transcript: text,
      clientName: parsed?.name ?? null,
      phone: parsed?.phone ?? null,
      preferences: parsed?.preferences ?? "",
      meeting: meetingDate
        ? {
            date: meetingDate.includes("T") ? meetingDate.split("T")[0] : meetingDate,
            time: meetingDate.includes("T") ? meetingDate.split("T")[1]?.slice(0, 5) : null,
          }
        : null,
      raw: parsed, // zostawiam dla debug (możesz usunąć jak nie chcesz)
    });
  } catch (err: any) {
    console.error("VOICE API ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Nieoczekiwany błąd" },
      { status: 500 }
    );
  }
}

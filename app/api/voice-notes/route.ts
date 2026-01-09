import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Funkcja do ekstrakcji JSON z tekstu
function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Główna funkcja POST do transkrypcji i analizy
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    // Walidacja obecności pliku
    if (!file) {
      return NextResponse.json({ success: false, error: "Brak audio" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1️⃣ Transkrypcja
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: file.type }),
      model: "gpt-4o-mini-transcribe",
    });

    // Sprawdzenie, czy transkrypcja zawiera tekst
    const text = transcription.text;
    if (!text) {
      return NextResponse.json({
        success: false,
        error: "Transkrypcja nie zawiera tekstu",
      });
    }

    // 2️⃣ Analiza AI (Zastosowanie modelu GPT do analizy)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Zwracaj WYŁĄCZNIE czysty JSON. Bez markdown, bez ```.",
        },
        {
          role: "user",
          content: `
Wyciągnij dane z notatki głosowej.

Zwróć:
{
  "name": string | null,
  "phone": string | null,
  "preferences": string,
  "meetingDate": string | null
}

Tekst:
${text}
`,
        },
      ],
    });

    // Odczytanie odpowiedzi z modelu
    const raw = completion.choices[0].message.content || "";
    const parsed = extractJSON(raw);

    // Sprawdzenie, czy odpowiedź jest poprawnym JSON
    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: "Nie udało się sparsować JSON",
        raw,
      });
    }

    // Zwrócenie odpowiedzi w odpowiednim formacie
    return NextResponse.json({
      success: true,
      transcript: text,
      clientName: parsed.name ?? null,
      phone: parsed.phone ?? null,
      preferences: parsed.preferences ?? "",
      meeting: parsed.meetingDate
        ? {
            date: parsed.meetingDate.split("T")[0],
            time: parsed.meetingDate.split("T")[1]?.slice(0, 5),
          }
        : null,
    });
  } catch (err: any) {
    console.error("VOICE API ERROR:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Nieoczekiwany błąd",
    });
  }
}

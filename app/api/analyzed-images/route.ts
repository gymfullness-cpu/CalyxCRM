import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("▶ API: request received");

    const body = await req.json();
    console.log("▶ BODY:", body);

    const { images } = body as { images?: string[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Brak poprawnych linków do zdjęć" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("▶ Calling OpenAI...");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text:
                "Przeanalizuj stan techniczny nieruchomości na podstawie zdjęć. " +
                "Opisz standard wykończenia, zużycie, ewentualne wady.",
            },
            ...images.map((url: string) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ],
        },
      ],
    });

    console.log("▶ OpenAI response received");

    const result = response.choices[0]?.message?.content;

    if (!result) {
      console.error("❌ Brak treści w odpowiedzi AI");
      return NextResponse.json(
        { error: "AI nie zwróciło analizy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error("❌ API ERROR:", err);

    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Nieznany błąd";

    return NextResponse.json(
      {
        error: "Błąd serwera API",
        details: message,
      },
      { status: 500 }
    );
  }
}

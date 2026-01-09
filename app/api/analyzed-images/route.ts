import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    console.log("▶ API: request received");

    const body = await req.json();
    console.log("▶ BODY:", body);

    const { images } = body;

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
              type: "text",
              text:
                "Przeanalizuj stan techniczny nieruchomości na podstawie zdjęć. " +
                "Opisz standard wykończenia, zużycie, ewentualne wady.",
            },
            ...images.map((url: string) => ({
              type: "image_url",
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
  } catch (err: any) {
    console.error("❌ API ERROR:", err);

    return NextResponse.json(
      {
        error: "Błąd serwera API",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

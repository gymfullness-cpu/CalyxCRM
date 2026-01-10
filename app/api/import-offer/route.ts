import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await response.text();

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "JesteĹ› agentem nieruchomoĹ›ci. WyciÄ…gnij dane kontaktowe sprzedajÄ…cego.",
        },
        {
          role: "user",
          content: `
ZwrĂłÄ‡ CZYSTY JSON (bez markdown):

{
  name: string | null,
  phone: string | null,
  email: string | null,
  description: string | null
}

HTML:
${html.slice(0, 8000)}
          `,
        },
      ],
    });

    const data = JSON.parse(ai.choices[0].message.content || "{}");

    const prospect = {
      id: Date.now(),
      ...data,
      sourceUrl: url,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, prospect });
  } catch (e: any) {
    return NextResponse.json(
      { error: "BĹ‚Ä…d serwera", details: e.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { text } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
JesteĹ› asystentem nieruchomoĹ›ci w Polsce.
Analizujesz preferencje klienta zapisane potocznym jÄ™zykiem.
Zwracasz TYLKO JSON bez ĹĽadnego tekstu.

ZASADY:
- jeĹ›li pada dzielnica Warszawy â†’ city = Warszawa
- rozpoznawaj odmiany (Mokotowie, Ĺ»oliborzu itd.)
- rozpoznawaj wideĹ‚ki cenowe (do, od, -, mln, tys)
- rozpoznawaj pokoje, windÄ™, metro (metro ignoruj, informacyjnie)
- nic nie zgaduj jeĹ›li brak danych

FORMAT:
{
  city: string | null,
  district: string | null,
  rooms: number | null,
  priceMin: number | null,
  priceMax: number | null,
  elevator: boolean | null,
  rawText: string
}
        `,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const json = completion.choices[0].message.content;
  return NextResponse.json(JSON.parse(json!));
}


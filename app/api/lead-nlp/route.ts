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
Jesteś asystentem nieruchomości w Polsce.
Analizujesz preferencje klienta zapisane potocznym językiem.
Zwracasz TYLKO JSON bez żadnego tekstu.

ZASADY:
- jeśli pada dzielnica Warszawy → city = Warszawa
- rozpoznawaj odmiany (Mokotowie, Żoliborzu itd.)
- rozpoznawaj widełki cenowe (do, od, -, mln, tys)
- rozpoznawaj pokoje, windę, metro (metro ignoruj, informacyjnie)
- nic nie zgaduj jeśli brak danych

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

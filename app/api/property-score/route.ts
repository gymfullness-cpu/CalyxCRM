import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      city,
      district,
      area,
      price,
      condition,
    } = await req.json();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
JesteĹ› analitykiem rynku nieruchomoĹ›ci w Polsce.

Dane nieruchomoĹ›ci:
Miasto: ${city}
Dzielnica: ${district}
MetraĹĽ: ${area} m2
Cena: ${price} zĹ‚
Stan techniczny: ${condition}

Zadanie:
1. OceĹ„ czy cena jest niska / rynkowa / wysoka
2. PorĂłwnaj do Ĺ›rednich cen w tej dzielnicy i mieĹ›cie
3. Podaj SCORE 0â€“100
4. KrĂłtki komentarz inwestycyjny

Odpowiedz w prostym tekĹ›cie.
`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      score: response.output_text,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "BĹ‚Ä…d scoringu" },
      { status: 500 }
    );
  }
}


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
Jesteś analitykiem rynku nieruchomości w Polsce.

Dane nieruchomości:
Miasto: ${city}
Dzielnica: ${district}
Metraż: ${area} m2
Cena: ${price} zł
Stan techniczny: ${condition}

Zadanie:
1. Oceń czy cena jest niska / rynkowa / wysoka
2. Porównaj do średnich cen w tej dzielnicy i mieście
3. Podaj SCORE 0–100
4. Krótki komentarz inwestycyjny

Odpowiedz w prostym tekście.
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
      { error: "Błąd scoringu" },
      { status: 500 }
    );
  }
}

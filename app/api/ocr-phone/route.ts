import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Brak URL obrazu" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Jesteś ekspertem OCR. Odczytujesz NUMER TELEFONU z obrazu.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Odczytaj numer telefonu z obrazu.
Zwróć TYLKO numer telefonu.
Jeśli numeru nie ma → napisz "BRAK NUMERU".
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content;

    return NextResponse.json({
      success: true,
      phone: text,
    });
  } catch (error: any) {
    console.error("OCR PHONE ERROR:", error);

    return NextResponse.json(
      {
        error: "Błąd OCR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;

    if (!audio) {
      return NextResponse.json(
        { error: "Brak pliku audio" },
        { status: 400 }
      );
    }

    const response = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-transcribe",
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("VOICE TRANSCRIBE ERROR:", error);

    return NextResponse.json(
      { error: "Błąd transkrypcji" },
      { status: 500 }
    );
  }
}

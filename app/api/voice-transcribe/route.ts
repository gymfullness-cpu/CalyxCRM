?import { NextResponse } from "next/server";
import OpenAI from "openai";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Import runtime, żeby build nie evaluował modułu OpenAI bez env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;

  return new OpenAI({ apiKey });
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
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

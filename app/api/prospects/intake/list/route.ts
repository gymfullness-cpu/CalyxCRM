import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function fp() {
  return path.join(process.cwd(), "data", "prospects-intake.json");
}

export async function GET() {
  try {
    if (!fs.existsSync(fp())) return NextResponse.json({ ok: true, items: [] });

    const raw = fs.readFileSync(fp(), "utf8");
    const items = JSON.parse(raw);

    return NextResponse.json({ ok: true, items: Array.isArray(items) ? items : [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "BĹ‚Ä…d serwera", message: e?.message || "" }, { status: 500 });
  }
}


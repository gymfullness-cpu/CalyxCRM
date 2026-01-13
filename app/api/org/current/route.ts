?import { NextResponse } from "next/server";

export const runtime = "nodejs"; // bezpiecznie na Windows/dev
export const dynamic = "force-dynamic";

type Org = {
  id: string;
  name: string;
  plan?: string;
};

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * DEV-SAFE endpoint:
 * - Nigdy nie powinien wysypywać‡ 500 (żeby UI nie spamował konsolć…).
 * - Jeśli masz kiedyś prawdziwć… organizacjć™ z DB/auth, podmień logikć™ w tym miejscu.
 */
export async function GET() {
  try {
    // 1) Jeśli masz ENV z org (opcjonalnie)
    const envOrgId = process.env.ORG_ID?.trim();
    const envOrgName = process.env.ORG_NAME?.trim();

    if (envOrgId && envOrgName) {
      const org: Org = { id: envOrgId, name: envOrgName, plan: process.env.ORG_PLAN?.trim() || undefined };
      return json({ ok: true, org });
    }

    // 2) Fallback lokalny — żeby UI działało zawsze
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({ ok: true, org });
  } catch (err: any) {
    // Zamiast 500 — zwróć fallback 200, żeby nie blokować‡ UI
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({
      ok: true,
      org,
      warning: "Falling back to local org because /api/org/current threw an error.",
      // NIE wywalaj całego stack trace do klienta w produkcji — ale w dev może pomóc:
      error: String(err?.message || err),
    });
  }
}

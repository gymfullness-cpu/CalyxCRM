import { NextResponse } from "next/server";

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
 * - Nigdy nie powinien wysypywaÄ‡ 500 (ĹĽeby UI nie spamowaĹ‚ konsolÄ…).
 * - JeĹ›li masz kiedyĹ› prawdziwÄ… organizacjÄ™ z DB/auth, podmieĹ„ logikÄ™ w tym miejscu.
 */
export async function GET() {
  try {
    // 1) JeĹ›li masz ENV z org (opcjonalnie)
    const envOrgId = process.env.ORG_ID?.trim();
    const envOrgName = process.env.ORG_NAME?.trim();

    if (envOrgId && envOrgName) {
      const org: Org = { id: envOrgId, name: envOrgName, plan: process.env.ORG_PLAN?.trim() || undefined };
      return json({ ok: true, org });
    }

    // 2) Fallback lokalny â€” ĹĽeby UI dziaĹ‚aĹ‚o zawsze
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({ ok: true, org });
  } catch (err: any) {
    // Zamiast 500 â€” zwrĂłÄ‡ fallback 200, ĹĽeby nie blokowaÄ‡ UI
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({
      ok: true,
      org,
      warning: "Falling back to local org because /api/org/current threw an error.",
      // NIE wywalaj caĹ‚ego stack trace do klienta w produkcji â€” ale w dev moĹĽe pomĂłc:
      error: String(err?.message || err),
    });
  }
}


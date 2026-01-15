import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next 16.1+ (Turbopack): params jest Promise
type Ctx = { params: Promise<{ platform: string }> };

// Uzgodnij platformy z tym, co masz w schema.prisma / SocialLinkUpsertSchema
const ALLOWED_PLATFORMS = new Set([
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "twitter",
  "www",
  "website",
]);

async function getAgentProfileIdMvp(): Promise<string> {
  const profile = await prisma.agentProfile.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    // 400, bo user musi najpierw dodać AgentProfile (MVP)
    throw new Error("Brak AgentProfile w bazie. Utwórz profil agenta (AgentProfile) i spróbuj ponownie.");
  }

  return profile.id;
}

function normalizePlatform(p: string) {
  return (p || "").trim().toLowerCase();
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * GET /api/agent-social/[platform]
 * Zwraca link social dla danej platformy (dla MVP: pierwszego agenta).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { platform: rawPlatform } = await ctx.params;
    const platform = normalizePlatform(rawPlatform);

    if (!platform) {
      return NextResponse.json({ ok: false, error: "Brak parametru platform" }, { status: 400 });
    }

    // jeśli chcesz restrykcyjnie: odblokuj walidację
    // if (!ALLOWED_PLATFORMS.has(platform)) {
    //   return NextResponse.json({ ok: false, error: "Nieznana platforma" }, { status: 400 });
    // }

    const agentProfileId = await getAgentProfileIdMvp();

    const link = await prisma.agentSocialLink.findUnique({
      where: {
        agentProfileId_platform: { agentProfileId, platform },
      },
    });

    return NextResponse.json({ ok: true, link: link || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Błąd" }, { status: 400 });
  }
}

/**
 * PUT /api/agent-social/[platform]
 * Body: { url: string, label?: string | null }
 * Upsertuje link social dla danej platformy (dla MVP: pierwszego agenta).
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { platform: rawPlatform } = await ctx.params;
    const platform = normalizePlatform(rawPlatform);

    if (!platform) {
      return NextResponse.json({ ok: false, error: "Brak parametru platform" }, { status: 400 });
    }

    // jeśli chcesz restrykcyjnie: odblokuj walidację
    // if (!ALLOWED_PLATFORMS.has(platform)) {
    //   return NextResponse.json({ ok: false, error: "Nieznana platforma" }, { status: 400 });
    // }

    const body = await req.json().catch(() => ({} as any));
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const label = typeof body?.label === "string" ? body.label.trim() : null;

    if (!url) {
      return NextResponse.json({ ok: false, error: "Brak url" }, { status: 400 });
    }
    if (!isValidUrl(url)) {
      return NextResponse.json({ ok: false, error: "Niepoprawny URL (wymagane http/https)" }, { status: 400 });
    }

    const agentProfileId = await getAgentProfileIdMvp();

    const link = await prisma.agentSocialLink.upsert({
      where: {
        agentProfileId_platform: { agentProfileId, platform },
      },
      create: { agentProfileId, platform, url, label: label || null },
      update: { url, label: label || null },
    });

    return NextResponse.json({ ok: true, link });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Błąd" }, { status: 400 });
  }
}

/**
 * DELETE /api/agent-social/[platform]
 * Usuwa link social dla danej platformy (dla MVP: pierwszego agenta).
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { platform: rawPlatform } = await ctx.params;
    const platform = normalizePlatform(rawPlatform);

    if (!platform) {
      return NextResponse.json({ ok: false, error: "Brak parametru platform" }, { status: 400 });
    }

    // jeśli chcesz restrykcyjnie: odblokuj walidację
    // if (!ALLOWED_PLATFORMS.has(platform)) {
    //   return NextResponse.json({ ok: false, error: "Nieznana platforma" }, { status: 400 });
    // }

    const agentProfileId = await getAgentProfileIdMvp();

    await prisma.agentSocialLink.deleteMany({
      where: { agentProfileId, platform },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Błąd" }, { status: 400 });
  }
}

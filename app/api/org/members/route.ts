import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Podaj orgId" }, { status: 400 });
    }

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ members });
  } catch (e: any) {
    return NextResponse.json(
      { error: "GET members failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.orgId || !body?.email) {
      return NextResponse.json(
        { error: "Wymagane: orgId, email" },
        { status: 400 }
      );
    }

    if (!body?.name) {
      return NextResponse.json(
        { error: "Wymagane: name (imiÄ™ i nazwisko)" },
        { status: 400 }
      );
    }

   const orgId = String(body.orgId);
const email = String(body.email).trim().toLowerCase();
const role = body.role ?? "AGENT";

const org = await prisma.organization.findUnique({ where: { id: orgId } });
if (!org) {
  return NextResponse.json(
    { error: "NieprawidĹ‚owy orgId (biuro nie istnieje)" },
    { status: 400 }
  );
}


    // âś… blokada na duplikaty email w obrÄ™bie org
    const existing = await prisma.orgMember.findFirst({
      where: { orgId, email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Taki email juĹĽ istnieje w tym biurze", existing },
        { status: 409 }
      );
    }

    const member = await prisma.orgMember.create({
      data: {
        orgId,
        email,
        name: String(body.name),
        phone: body.phone ? String(body.phone) : null,
        rank: body.rank ? String(body.rank) : null,
        role,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "POST members failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}


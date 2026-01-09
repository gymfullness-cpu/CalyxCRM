import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { memberId },
    include: { member: true },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.memberId || !body?.displayName) {
    return NextResponse.json(
      { error: "memberId + displayName required" },
      { status: 400 }
    );
  }

  const profile = await prisma.agentProfile.upsert({
    where: { memberId: body.memberId },
    update: {
      displayName: body.displayName,
      title: body.title,
      bio: body.bio,
      phone: body.phone,
      avatarUrl: body.avatarUrl,
      coverUrl: body.coverUrl,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      ctaText: body.ctaText,
    },
    create: {
      memberId: body.memberId,
      displayName: body.displayName,
      title: body.title,
      bio: body.bio,
      phone: body.phone,
      avatarUrl: body.avatarUrl,
      coverUrl: body.coverUrl,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      ctaText: body.ctaText,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await ctx.params;
  const body = await req.json();

  if (!body?.ownerId) {
    return NextResponse.json({ error: "Wymagane: ownerId" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { ownerId: body.ownerId },
  });

  return NextResponse.json({ lead }, { status: 200 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const all = await prisma.candidate.findMany({
      select: { id: true, name: true, email: true },
    });

    const botRegex = /workday|cisco|uber|icims|njoyn|paypal|notification|noreply|donotreply|newsletter|mailer-daemon|support@|billing@|careers@/i;
    const botIds = all
      .filter((c) => botRegex.test(c.email) || botRegex.test(c.name))
      .map((c) => c.id);

    if (botIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No corporate bot or automated notification emails found.",
        count: 0,
      });
    }

    const deleteResult = await prisma.candidate.deleteMany({
      where: {
        id: { in: botIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deleteResult.count} corporate/bot notification email(s).`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error("POST /api/candidates/purge-bots error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

